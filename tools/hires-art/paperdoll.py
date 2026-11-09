"""Paper-doll underdrawings and layer masks for high-resolution player tiles.

Run headless (nothing touches an open Blender session):

  blender --background --factory-startup --python tools/hires-art/paperdoll.py -- \
      --out .hires-tmp/paperdoll --size 1024

Blender owns everything that must line up between layers: the shared body,
its pose, the camera, and the outline of every piece of equipment. An image
model only paints inside those outlines, and each painted layer is cut out
with the mask written here, so any combination of layers fits the body.

Outputs (in --out):
  stage_<n>_<layer>.png  clay underdrawing with layers 0..n worn
  mask_<layer>.png       white where that layer is visible when worn over the
                         bare body (the body occludes it, other gear does not)
  layers.json            layer order, file names and canvas size

Conventions shared with the game:
  - The figure faces the viewer, turned slightly toward the viewer's right.
  - The weapon hand is on the viewer's right and the shield arm on the left,
    matching the existing held-weapon overlay (primary right, off-hand left).
  - Every race and role uses this one body. Races differ by face, skin and
    hair; small races are the same composite drawn smaller in the game.
"""

import argparse
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

# ---------------------------------------------------------------- arguments


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=".hires-tmp/paperdoll")
    parser.add_argument("--size", type=int, default=1024)
    parser.add_argument("--save-blend", default="")
    return parser.parse_args(argv)


# ---------------------------------------------------------------- scene


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    engines = {item.identifier for item in
               bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
    scene.render.engine = "BLENDER_EEVEE" if "BLENDER_EEVEE" in engines else "BLENDER_EEVEE_NEXT"
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.render.filter_size = 1.0
    world = bpy.data.worlds.new("World")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.22, 0.22, 0.25, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    scene.world = world
    return scene


# ---------------------------------------------------------------- materials


def clay(name, color, roughness=0.75, metallic=0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return material


def holdout_material():
    material = bpy.data.materials.new("holdout")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    holdout = nodes.new("ShaderNodeHoldout")
    output = nodes.new("ShaderNodeOutputMaterial")
    material.node_tree.links.new(holdout.outputs[0], output.inputs["Surface"])
    return material


def mask_material():
    material = bpy.data.materials.new("mask")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = (1, 1, 1, 1)
    output = nodes.new("ShaderNodeOutputMaterial")
    material.node_tree.links.new(emission.outputs[0], output.inputs["Surface"])
    return material


def srgb(hex_color):
    value = int(hex_color.lstrip("#"), 16)
    channels = [((value >> shift) & 255) / 255 for shift in (16, 8, 0)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels)


# ---------------------------------------------------------------- layers

# Paint and composite order, back to front. "hides" lists layers a worn layer
# suppresses entirely (a helmet hides the hair it would otherwise poke through).
LAYERS = [
    {"name": "body", "label": "bare body in underwear (human male)"},
    {"name": "hair", "label": "knight hair (short crop)"},
    {"name": "beard", "label": "knight beard (short)"},
    {"name": "armor", "label": "ring mail"},
    {"name": "gloves", "label": "leather gloves (riding gloves)"},
    {"name": "helmet", "label": "helmet (plumed helmet)", "hides": ["hair"]},
    {"name": "shield", "label": "small shield"},
]

OBJECTS = {layer["name"]: [] for layer in LAYERS}


def finish(obj, material, layer, smooth=True):
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(material)
    if smooth and hasattr(obj.data, "polygons"):
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    OBJECTS[layer].append(obj)
    return obj


def primitive(kind, name, material, layer, location, scale=(1, 1, 1), rotation=(0, 0, 0), **kw):
    adders = {
        "sphere": lambda: bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, **kw),
        "cylinder": lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=48, **kw),
        "cone": lambda: bpy.ops.mesh.primitive_cone_add(vertices=48, **kw),
    }
    adders[kind]()
    obj = bpy.context.active_object
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    obj.name = name
    obj.location = location
    obj.scale = scale
    obj.rotation_euler = [math.radians(a) for a in rotation]
    return finish(obj, material, layer)


# Joint positions in metres. x: viewer's right, -y: toward the viewer, z: up.
# The figure is about 1.85 m and 5.3 heads tall, heroic and thick-limbed so
# the head, hands and feet stay readable when the tile is 48 px on screen.
J = {
    "pelvis": Vector((0, 0.00, 0.96)),
    "waist": Vector((0, 0.01, 1.11)),
    "chest": Vector((0, 0.00, 1.30)),
    "neck": Vector((0, 0.01, 1.48)),
    "shoulder_r": Vector((0.23, 0.01, 1.42)),
    "elbow_r": Vector((0.33, -0.02, 1.16)),
    "wrist_r": Vector((0.36, -0.14, 0.96)),
    "shoulder_l": Vector((-0.23, 0.01, 1.42)),
    "elbow_l": Vector((-0.32, 0.02, 1.17)),
    "wrist_l": Vector((-0.29, -0.17, 1.07)),
    "hip_r": Vector((0.10, 0.00, 0.91)),
    "knee_r": Vector((0.125, -0.02, 0.50)),
    "ankle_r": Vector((0.135, 0.01, 0.11)),
    "toe_r": Vector((0.16, -0.15, 0.045)),
    "hip_l": Vector((-0.10, 0.00, 0.91)),
    "knee_l": Vector((-0.125, -0.02, 0.50)),
    "ankle_l": Vector((-0.135, 0.01, 0.11)),
    "toe_l": Vector((-0.16, -0.15, 0.045)),
}
RADII = {
    "pelvis": (0.165, 0.12), "waist": (0.15, 0.11), "chest": (0.195, 0.13),
    "neck": 0.07, "shoulder_r": 0.092, "elbow_r": 0.068, "wrist_r": 0.052,
    "shoulder_l": 0.092, "elbow_l": 0.068, "wrist_l": 0.052,
    "hip_r": 0.112, "knee_r": 0.08, "ankle_r": 0.062, "toe_r": 0.056,
    "hip_l": 0.112, "knee_l": 0.08, "ankle_l": 0.062, "toe_l": 0.056,
}
BONES = [
    ("pelvis", "waist"), ("waist", "chest"), ("chest", "neck"),
    ("chest", "shoulder_r"), ("shoulder_r", "elbow_r"), ("elbow_r", "wrist_r"),
    ("chest", "shoulder_l"), ("shoulder_l", "elbow_l"), ("elbow_l", "wrist_l"),
    ("pelvis", "hip_r"), ("hip_r", "knee_r"), ("knee_r", "ankle_r"), ("ankle_r", "toe_r"),
    ("pelvis", "hip_l"), ("hip_l", "knee_l"), ("knee_l", "ankle_l"), ("ankle_l", "toe_l"),
]
HEAD_CENTER = Vector((0, -0.01, 1.665))
HEAD_SCALE = (0.132, 0.145, 0.168)
HAND_R = Vector((0.37, -0.19, 0.90))
HAND_L = Vector((-0.285, -0.22, 1.06))


def nearest_bone(point):
    """(bone, t) of the body bone closest to a point; t runs 0..1 along it."""
    best = None
    for a, b in BONES:
        start, end = J[a], J[b]
        segment = end - start
        t = max(0.0, min(1.0, (point - start).dot(segment) / segment.length_squared))
        distance = (start + segment * t - point).length
        if best is None or distance < best[0]:
            best = (distance, f"{a}-{b}", t)
    return best[1], best[2]


def build_body():
    skin = clay("skin", srgb("#c99a7a"), 0.6)
    names = list(RADII)
    index = {name: i for i, name in enumerate(names)}
    mesh = bpy.data.meshes.new("body")
    mesh.from_pydata([J[n] for n in names], [(index[a], index[b]) for a, b in BONES], [])
    body = bpy.data.objects.new("body", mesh)
    finish(body, skin, "body")
    skin_modifier = body.modifiers.new("skin", "SKIN")
    skin_modifier.use_smooth_shade = True
    for i, name in enumerate(names):
        radius = RADII[name]
        mesh.skin_vertices[0].data[i].radius = radius if isinstance(radius, tuple) else (radius, radius)
    mesh.skin_vertices[0].data[0].use_root = True
    subsurf = body.modifiers.new("subsurf", "SUBSURF")
    subsurf.levels = subsurf.render_levels = 3
    primitive("sphere", "head", skin, "body", HEAD_CENTER, HEAD_SCALE)
    primitive("sphere", "jaw", skin, "body", HEAD_CENTER + Vector((0, -0.03, -0.085)), (0.095, 0.1, 0.08))
    primitive("sphere", "nose", skin, "body", HEAD_CENTER + Vector((0.006, -0.143, -0.01)), (0.021, 0.034, 0.04))
    for side in (1, -1):
        primitive("sphere", f"ear_{side}", skin, "body", HEAD_CENTER + Vector((0.13 * side, 0.0, -0.005)), (0.022, 0.033, 0.045))
    primitive("sphere", "hand_r", skin, "body", HAND_R, (0.06, 0.066, 0.072))
    primitive("sphere", "hand_l", skin, "body", HAND_L, (0.06, 0.072, 0.066))
    bpy.context.view_layer.update()
    # Underwear: short linen braies over the hips.
    garment("braies", clay("linen", srgb("#b8ad94"), 0.9), "body", 0.012, {
        "pelvis-waist": (0.0, 0.35), "pelvis-hip_r": (0, 1), "pelvis-hip_l": (0, 1),
        "hip_r-knee_r": (0, 0.28), "hip_l-knee_l": (0, 0.28),
    })


def garment(name, material, layer, offset, regions, thickness=0.01):
    """A shell over the body: faces whose nearest bone is listed, within its t range."""
    body = bpy.data.objects["body"]
    depsgraph = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(body.evaluated_get(depsgraph))
    bm = bmesh.new()
    bm.from_mesh(mesh)
    drop = []
    for face in bm.faces:
        bone, t = nearest_bone(face.calc_center_median())
        span = regions.get(bone)
        if span is None or not (span[0] <= t <= span[1]):
            drop.append(face)
    bmesh.ops.delete(bm, geom=drop, context="FACES")
    for vert in bm.verts:
        vert.co += vert.normal * offset
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.clear()
    obj = bpy.data.objects.new(name, mesh)
    finish(obj, material, layer)
    solidify = obj.modifiers.new("thickness", "SOLIDIFY")
    solidify.thickness = thickness
    solidify.offset = 1.0
    return obj


def build_hair():
    hair = clay("hair", srgb("#5a3a22"), 0.85)
    # Short cropped hair: a cap behind the hairline, slightly fuller at the back.
    primitive("sphere", "hair_cap", hair, "hair", HEAD_CENTER + Vector((0, 0.026, 0.034)),
              (HEAD_SCALE[0] + 0.01, HEAD_SCALE[1] - 0.005, HEAD_SCALE[2] - 0.006))
    primitive("sphere", "beard", hair, "beard", HEAD_CENTER + Vector((0, -0.045, -0.105)), (0.092, 0.08, 0.058))


def build_armor():
    mail = clay("mail", srgb("#7d828a"), 0.45, 0.8)
    garment("hauberk", mail, "armor", 0.03, {
        "pelvis-waist": (0, 1), "waist-chest": (0, 1), "chest-neck": (0, 0.45),
        "chest-shoulder_r": (0, 1), "chest-shoulder_l": (0, 1),
        "shoulder_r-elbow_r": (0, 1), "shoulder_l-elbow_l": (0, 1),
        "elbow_r-wrist_r": (0, 0.3), "elbow_l-wrist_l": (0, 0.3),
        "pelvis-hip_r": (0, 1), "pelvis-hip_l": (0, 1),
        "hip_r-knee_r": (0, 0.42), "hip_l-knee_l": (0, 0.42),
    }, thickness=0.018)


def build_gloves():
    leather = clay("leather", srgb("#6b4a2e"), 0.7)
    for name, hand, scale in (("r", HAND_R, (0.068, 0.074, 0.08)),
                              ("l", HAND_L, (0.068, 0.08, 0.074))):
        primitive("sphere", f"glove_{name}", leather, "gloves", hand, scale)
    garment("glove_cuffs", leather, "gloves", 0.02, {
        "elbow_r-wrist_r": (0.62, 1), "elbow_l-wrist_l": (0.62, 1),
    }, thickness=0.012)


def build_helmet():
    steel = clay("helmet_steel", srgb("#8f949b"), 0.35, 0.9)
    plume = clay("plume", srgb("#9c2a22"), 0.9)
    dome = primitive("sphere", "helmet_dome", steel, "helmet", HEAD_CENTER + Vector((0, 0.01, 0.035)),
                     (HEAD_SCALE[0] + 0.022, HEAD_SCALE[1] + 0.017, HEAD_SCALE[2] - 0.005))
    # Cut the dome open at the face: a nasal helm with cheek plates.
    cutter = primitive("sphere", "helmet_face_cut", steel, "helmet",
                       HEAD_CENTER + Vector((0, -0.15, -0.06)), (0.11, 0.13, 0.115))
    boolean = dome.modifiers.new("face", "BOOLEAN")
    boolean.operation = "DIFFERENCE"
    boolean.object = cutter
    cutter.hide_render = True
    OBJECTS["helmet"].remove(cutter)
    primitive("cylinder", "helmet_rim", steel, "helmet", HEAD_CENTER + Vector((0, 0.01, 0.0)),
              (HEAD_SCALE[0] + 0.028, HEAD_SCALE[1] + 0.023, 0.016))
    primitive("cylinder", "helmet_nasal", steel, "helmet", HEAD_CENTER + Vector((0, -0.163, -0.02)),
              (0.012, 0.008, 0.06))
    primitive("cylinder", "helmet_crest", steel, "helmet", HEAD_CENTER + Vector((0, 0.01, 0.19)),
              (0.02, 0.02, 0.025))
    # Plume: a swept-back tuft from the crest.
    for index, (offset, size) in enumerate((
        (Vector((0, 0.00, 0.235)), (0.035, 0.05, 0.045)),
        (Vector((0, 0.05, 0.255)), (0.04, 0.07, 0.05)),
        (Vector((0, 0.11, 0.235)), (0.038, 0.07, 0.05)),
        (Vector((0, 0.17, 0.19)), (0.032, 0.055, 0.05)),
    )):
        primitive("sphere", f"plume_{index}", plume, "helmet", HEAD_CENTER + offset, size)


def build_shield():
    wood = clay("shield_face", srgb("#7a5a36"), 0.8)
    rim = clay("shield_rim", srgb("#8a8d92"), 0.4, 0.85)
    center = HAND_L + Vector((-0.03, -0.07, 0.0))
    face = primitive("cylinder", "shield_face", wood, "shield", center, (0.2, 0.2, 0.022), (90, 0, -25))
    primitive("cylinder", "shield_rim", rim, "shield", center + Vector((0, 0.002, 0)),
              (0.215, 0.215, 0.016), (90, 0, -25))
    primitive("sphere", "shield_boss", rim, "shield", center + Vector((0.012, -0.025, 0.0)), (0.05, 0.03, 0.05))


# ---------------------------------------------------------------- camera and render


def setup_camera(scene):
    camera_data = bpy.data.cameras.new("Camera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 2.12
    camera = bpy.data.objects.new("Camera", camera_data)
    scene.collection.objects.link(camera)
    target = Vector((0, 0, 1.0))
    yaw, pitch = math.radians(-14), math.radians(8)
    direction = Vector((math.sin(yaw) * math.cos(pitch), -math.cos(yaw) * math.cos(pitch),
                        math.sin(pitch)))
    camera.location = target + direction * 6
    camera.rotation_mode = "QUATERNION"
    camera.rotation_quaternion = (-direction).to_track_quat("-Z", "Y")
    scene.camera = camera

    key = bpy.data.lights.new("Key", "SUN")
    key.energy = 3.2
    key.angle = math.radians(8)
    key_obj = bpy.data.objects.new("Key", key)
    key_obj.rotation_mode = "QUATERNION"
    key_obj.rotation_quaternion = (-Vector((-0.75, -0.45, 0.6)).normalized()).to_track_quat("-Z", "Y")
    scene.collection.objects.link(key_obj)
    rim = bpy.data.lights.new("Rim", "SUN")
    rim.energy = 1.4
    rim.color = (0.75, 0.82, 1.0)
    rim_obj = bpy.data.objects.new("Rim", rim)
    rim_obj.rotation_mode = "QUATERNION"
    rim_obj.rotation_quaternion = (-Vector((0.8, 0.6, 0.3)).normalized()).to_track_quat("-Z", "Y")
    scene.collection.objects.link(rim_obj)


def render(scene, size, path):
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print(f"rendered {path}")


def set_visible(layers):
    for layer, objects in OBJECTS.items():
        for obj in objects:
            obj.hide_render = layer not in layers


def render_mask(scene, size, layer, path, holdout, white):
    """The layer's own silhouette, cut where the bare body sits in front of it."""
    saved = {}
    for name, objects in OBJECTS.items():
        for obj in objects:
            saved[obj.name] = list(obj.data.materials)
            if name == layer:
                replacement = white
            elif name == "body":
                replacement = holdout
            else:
                obj.hide_render = True
                continue
            obj.hide_render = False
            obj.data.materials.clear()
            obj.data.materials.append(replacement)
    lights = [o for o in scene.objects if o.type == "LIGHT"]
    for light in lights:
        light.hide_render = True
    world_strength = scene.world.node_tree.nodes["Background"].inputs[1].default_value
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.0
    render(scene, size, path)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = world_strength
    for light in lights:
        light.hide_render = False
    for objects in OBJECTS.values():
        for obj in objects:
            obj.data.materials.clear()
            for material in saved[obj.name]:
                obj.data.materials.append(material)


def main():
    args = parse_args()
    scene = reset_scene()
    scene.eevee.taa_render_samples = 32
    build_body()
    build_hair()
    build_armor()
    build_gloves()
    build_helmet()
    build_shield()
    setup_camera(scene)
    out = os.path.abspath(args.out)
    os.makedirs(out, exist_ok=True)

    names = [layer["name"] for layer in LAYERS]
    stages = []
    for index, name in enumerate(names):
        worn = set(names[:index + 1])
        for layer in LAYERS[:index + 1]:
            worn -= set(layer.get("hides", [])) if layer["name"] in worn else set()
        set_visible(worn)
        file = f"stage_{index}_{name}.png"
        render(scene, args.size, os.path.join(out, file))
        stages.append(file)

    holdout, white = holdout_material(), mask_material()
    for name in names:
        render_mask(scene, args.size, name, os.path.join(out, f"mask_{name}.png"), holdout, white)
    set_visible(set(names))

    manifest = {
        "size": args.size,
        "layers": [
            {**layer, "stage": stages[i], "mask": f"mask_{layer['name']}.png"}
            for i, layer in enumerate(LAYERS)
        ],
    }
    with open(os.path.join(out, "layers.json"), "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)
    if args.save_blend:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.save_blend))


main()
