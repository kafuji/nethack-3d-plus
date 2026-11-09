"""Builds a stylized NetHack knight in Blender and renders sprite tiles.

Run headless (nothing touches an open Blender session):

  blender --background --factory-startup --python tools/hires-art/knight.py -- \
      --out .hires-tmp/knight --sizes 128,256

The figure is assembled from primitives, shaded as cel-shaded toon with an
inverted-hull outline, and rendered with an orthographic camera onto a
transparent background. Parts live in one collection per paper-doll layer so
later passes can render layers separately.
"""

import argparse
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
    parser.add_argument("--out", default=".hires-tmp/knight")
    parser.add_argument("--sizes", default="128,256")
    parser.add_argument("--preview", type=int, default=512)
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
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.5, 0.5, 1)
    scene.world = world
    return scene


LAYERS = ["body", "armor", "helmet", "shield", "weapon"]


def layer_collection(name):
    collection = bpy.data.collections.get(name)
    if collection is None:
        collection = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(collection)
    return collection


# ---------------------------------------------------------------- materials

SUN_DIRECTION = Vector((-0.80, -0.30, 0.55)).normalized()  # light from upper left


def toon_material(name, color, shade=0.55, metal=False, pattern=None):
    """Two-step cel shading driven by the scene sun, emitted unlit so the
    palette stays exact. Metal adds a hard specular band."""
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    emission = nodes.new("ShaderNodeEmission")
    links.new(emission.outputs[0], out.inputs[0])

    diffuse = nodes.new("ShaderNodeBsdfDiffuse")
    to_rgb = nodes.new("ShaderNodeShaderToRGB")
    links.new(diffuse.outputs[0], to_rgb.inputs[0])
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (shade, shade, shade, 1)
    ramp.color_ramp.elements[1].position = 0.42
    ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    links.new(to_rgb.outputs[0], ramp.inputs[0])

    base = nodes.new("ShaderNodeRGB")
    base.outputs[0].default_value = (*color, 1)
    base_socket = base.outputs[0]
    if pattern == "mail":
        # Interlocking rings read as a fine dark speckle.
        coord = nodes.new("ShaderNodeTexCoord")
        voronoi = nodes.new("ShaderNodeTexVoronoi")
        voronoi.feature = "DISTANCE_TO_EDGE"
        voronoi.inputs["Scale"].default_value = 40.0
        links.new(coord.outputs["Object"], voronoi.inputs["Vector"])
        edge = nodes.new("ShaderNodeMath")
        edge.operation = "LESS_THAN"
        edge.inputs[1].default_value = 0.08
        links.new(voronoi.outputs["Distance"], edge.inputs[0])
        dark = nodes.new("ShaderNodeMix")
        dark.data_type = "RGBA"
        dark.inputs["A"].default_value = (*color, 1)
        dark.inputs["B"].default_value = (color[0] * 0.72, color[1] * 0.72, color[2] * 0.76, 1)
        links.new(edge.outputs[0], dark.inputs["Factor"])
        base_socket = dark.outputs["Result"]

    multiply = nodes.new("ShaderNodeMix")
    multiply.data_type = "RGBA"
    multiply.blend_type = "MULTIPLY"
    multiply.inputs["Factor"].default_value = 1.0
    links.new(base_socket, multiply.inputs["A"])
    links.new(ramp.outputs[0], multiply.inputs["B"])
    final = multiply.outputs["Result"]

    if metal:
        glossy = nodes.new("ShaderNodeBsdfGlossy")
        glossy.inputs["Roughness"].default_value = 0.25
        glossy_rgb = nodes.new("ShaderNodeShaderToRGB")
        links.new(glossy.outputs[0], glossy_rgb.inputs[0])
        band = nodes.new("ShaderNodeValToRGB")
        band.color_ramp.interpolation = "CONSTANT"
        band.color_ramp.elements[0].color = (0, 0, 0, 1)
        band.color_ramp.elements[1].position = 0.55
        band.color_ramp.elements[1].color = (0.45, 0.45, 0.42, 1)
        links.new(glossy_rgb.outputs[0], band.inputs[0])
        add = nodes.new("ShaderNodeMix")
        add.data_type = "RGBA"
        add.blend_type = "ADD"
        add.inputs["Factor"].default_value = 1.0
        links.new(final, add.inputs["A"])
        links.new(band.outputs[0], add.inputs["B"])
        final = add.outputs["Result"]

    links.new(final, emission.inputs["Color"])
    return material


def outline_material():
    material = bpy.data.materials.get("Outline")
    if material:
        return material
    material = bpy.data.materials.new("Outline")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = (0.035, 0.03, 0.04, 1)
    material.node_tree.links.new(emission.outputs[0], out.inputs[0])
    material.use_backface_culling = True
    return material


# ---------------------------------------------------------------- geometry helpers

OUTLINE_WIDTH = 0.022


def finish(obj, material, layer, outline=True, smooth=True):
    obj.data.materials.append(material)
    if smooth:
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        if hasattr(obj.data, "set_sharp_from_angle"):
            obj.data.set_sharp_from_angle(angle=math.radians(40))
    if outline:
        obj.data.materials.append(outline_material())
        solidify = obj.modifiers.new("Outline", "SOLIDIFY")
        solidify.thickness = OUTLINE_WIDTH
        solidify.offset = 1.0
        solidify.use_flip_normals = True
        solidify.use_rim = False
        solidify.material_offset = 1
    for collection in obj.users_collection:
        collection.objects.unlink(obj)
    layer_collection(layer).objects.link(obj)
    return obj


def sphere(name, location, scale, material, layer, segments=32, **kw):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=segments // 2,
                                         location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    return finish(obj, material, layer, **kw)


def cylinder(name, start, end, radius, material, layer, radius_end=None, vertices=24, **kw):
    """Tapered cylinder between two points."""
    start, end = Vector(start), Vector(end)
    axis = end - start
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius,
                                    radius2=radius if radius_end is None else radius_end,
                                    depth=axis.length, location=(start + end) / 2)
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(axis.normalized())
    bpy.ops.object.transform_apply(rotation=True)
    bevel = obj.modifiers.new("Bevel", "BEVEL")
    bevel.width = min(radius, radius_end or radius) * 0.35
    bevel.segments = 3
    return finish(obj, material, layer, **kw)


def box(name, location, size, material, layer, bevel=0.02, rotation=(0, 0, 0), **kw):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new("Bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
    return finish(obj, material, layer, **kw)


def extruded_outline(name, points, depth, location, rotation, material, layer, **kw):
    """Flat shape (heater shield) from a 2D outline in the XZ plane."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    verts = [bm.verts.new((x, 0, z)) for x, z in points]
    face = bm.faces.new(verts)
    result = bmesh.ops.extrude_face_region(bm, geom=[face])
    for vert in [g for g in result["geom"] if isinstance(g, bmesh.types.BMVert)]:
        vert.co.y += depth
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = rotation
    modifier = obj.modifiers.new("Bevel", "BEVEL")
    modifier.width = depth * 0.45
    modifier.segments = 2
    return finish(obj, material, layer, **kw)


# ---------------------------------------------------------------- the knight
# Facing -Y (toward the camera). The character's right side is -X.


def build_knight():
    skin = toon_material("Skin", (0.93, 0.70, 0.55), shade=0.68)
    mail = toon_material("RingMail", (0.62, 0.64, 0.68), shade=0.5, metal=True, pattern="mail")
    steel = toon_material("Steel", (0.72, 0.74, 0.78), shade=0.48, metal=True)
    surcoat = toon_material("Surcoat", (0.16, 0.28, 0.66), shade=0.55)
    trim = toon_material("Gold", (0.95, 0.76, 0.25), shade=0.55, metal=True)
    plume = toon_material("Plume", (0.80, 0.12, 0.12), shade=0.55)
    leather = toon_material("Leather", (0.45, 0.28, 0.15), shade=0.55)
    trousers = toon_material("Trousers", (0.28, 0.24, 0.30), shade=0.55)
    eye = toon_material("Eye", (0.06, 0.05, 0.07), shade=1.0)
    shield_face = toon_material("ShieldField", (0.86, 0.84, 0.78), shade=0.6)
    shield_cross = toon_material("ShieldCross", (0.74, 0.12, 0.12), shade=0.6)

    # Legs and boots (body layer).
    for side, x in (("R", -0.1), ("L", 0.1)):
        cylinder(f"Leg.{side}", (x, 0, 0.12), (x, 0, 0.55), 0.085, trousers, "body", radius_end=0.095)
        cylinder(f"Boot.{side}", (x, -0.015, 0.0), (x, -0.005, 0.22), 0.1, leather, "body", radius_end=0.092)
        sphere(f"Toe.{side}", (x, -0.07, 0.05), (0.085, 0.12, 0.06), leather, "body")

    # Torso (body), then ring mail hauberk and surcoat (armor layer).
    cylinder("Torso", (0, 0, 0.55), (0, 0, 1.02), 0.2, trousers, "body", radius_end=0.23)
    cylinder("Hauberk", (0, 0, 0.36), (0, 0, 1.03), 0.235, mail, "armor", radius_end=0.245)
    sphere("Shoulders", (0, 0, 1.0), (0.27, 0.18, 0.1), mail, "armor")
    cylinder("Coif", (0, 0, 1.0), (0, 0, 1.18), 0.12, mail, "armor", radius_end=0.1)
    cylinder("Surcoat", (0, 0, 0.33), (0, 0, 0.98), 0.27, surcoat, "armor", radius_end=0.245)
    box("Emblem.V", (0, -0.258, 0.8), (0.045, 0.02, 0.17), trim, "armor", bevel=0.008)
    box("Emblem.H", (0, -0.258, 0.83), (0.13, 0.02, 0.045), trim, "armor", bevel=0.008)
    cylinder("Belt", (0, 0, 0.6), (0, 0, 0.66), 0.268, leather, "armor")
    box("Buckle", (0, -0.27, 0.63), (0.06, 0.02, 0.05), trim, "armor", bevel=0.008)

    # Arms: right arm lowered holding the sword, left arm forward with shield.
    shoulder_r, elbow_r, hand_r = (-0.3, 0, 0.98), (-0.36, -0.04, 0.76), (-0.36, -0.14, 0.6)
    cylinder("UpperArm.R", shoulder_r, elbow_r, 0.075, mail, "armor")
    cylinder("Forearm.R", elbow_r, hand_r, 0.07, mail, "armor")
    sphere("Glove.R", hand_r, (0.07, 0.07, 0.075), leather, "armor")
    shoulder_l, elbow_l, hand_l = (0.3, 0, 0.98), (0.37, -0.06, 0.78), (0.3, -0.2, 0.72)
    cylinder("UpperArm.L", shoulder_l, elbow_l, 0.075, mail, "armor")
    cylinder("Forearm.L", elbow_l, hand_l, 0.07, mail, "armor")
    sphere("Glove.L", hand_l, (0.07, 0.07, 0.075), leather, "armor")

    # Head with an open-faced plumed helmet.
    sphere("Head", (0, 0, 1.3), (0.2, 0.19, 0.21), skin, "body")
    sphere("Eye.R", (-0.07, -0.178, 1.29), (0.026, 0.012, 0.036), eye, "body", outline=False)
    sphere("Eye.L", (0.07, -0.178, 1.29), (0.026, 0.012, 0.036), eye, "body", outline=False)
    sphere("Helmet", (0, 0.015, 1.39), (0.228, 0.22, 0.19), steel, "helmet")
    cylinder("Helmet.Rim", (0, 0.015, 1.37), (0, 0.015, 1.405), 0.232, steel, "helmet")
    box("Helmet.Nasal", (0, -0.222, 1.33), (0.032, 0.03, 0.11), steel, "helmet", bevel=0.01)
    for side, x in (("R", -0.19), ("L", 0.19)):
        box(f"Helmet.Cheek.{side}", (x, -0.02, 1.27), (0.045, 0.12, 0.14), steel, "helmet", bevel=0.015)
    cylinder("Plume.Base", (0, 0.02, 1.53), (0, 0.03, 1.6), 0.035, trim, "helmet")
    for index, (y, z, scale) in enumerate([(0.03, 1.66, 0.075), (0.09, 1.7, 0.07),
                                           (0.16, 1.68, 0.062), (0.22, 1.62, 0.05)]):
        sphere(f"Plume.{index}", (0, y, z), (scale * 0.75, scale, scale), plume, "helmet")

    # Small heater shield on the left arm, angled toward the camera.
    outline = [(-0.17, 0.2), (0.17, 0.2), (0.17, 0.02), (0.1, -0.14), (0.0, -0.22),
               (-0.1, -0.14), (-0.17, 0.02)]
    shield = extruded_outline("Shield", outline, 0.04, (0.36, -0.27, 0.72),
                              (0, 0, math.radians(-25)), shield_face, "shield")
    cross_v = box("Shield.Cross.V", (0, -0.012, -0.01), (0.06, 0.01, 0.36), shield_cross, "shield",
                  bevel=0.004, outline=False)
    cross_h = box("Shield.Cross.H", (0, -0.012, 0.07), (0.3, 0.01, 0.06), shield_cross, "shield",
                  bevel=0.004, outline=False)
    for part in (cross_v, cross_h):
        part.parent = shield

    # Long sword in the right hand, tip raised and angled outward.
    sword = bpy.data.objects.new("Sword", None)
    bpy.context.scene.collection.objects.link(sword)
    sword.location = hand_r
    sword.rotation_euler = (math.radians(-20), math.radians(-28), 0)
    parts = [
        box("Sword.Grip", (0, 0, 0.0), (0.035, 0.035, 0.16), leather, "weapon", bevel=0.01),
        sphere("Sword.Pommel", (0, 0, -0.1), (0.04, 0.04, 0.04), trim, "weapon"),
        box("Sword.Guard", (0, 0, 0.1), (0.24, 0.045, 0.04), trim, "weapon", bevel=0.012),
        box("Sword.Blade", (0, 0, 0.47), (0.065, 0.016, 0.7), steel, "weapon", bevel=0.007),
    ]
    tip = extruded_outline("Sword.Tip", [(-0.0325, 0), (0.0325, 0), (0, 0.09)], 0.016,
                           (0, 0.008, 0.82), (0, 0, 0), steel, "weapon")
    for part in parts + [tip]:
        part.parent = sword


# ---------------------------------------------------------------- camera and render


def setup_camera(scene):
    camera_data = bpy.data.cameras.new("Camera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 1.86
    camera = bpy.data.objects.new("Camera", camera_data)
    scene.collection.objects.link(camera)
    target = Vector((0, 0, 0.87))
    yaw, pitch = math.radians(-22), math.radians(14)
    direction = Vector((math.sin(yaw) * math.cos(pitch), -math.cos(yaw) * math.cos(pitch),
                        math.sin(pitch)))
    camera.location = target + direction * 6
    camera.rotation_mode = "QUATERNION"
    camera.rotation_quaternion = (-direction).to_track_quat("-Z", "Y")
    scene.camera = camera

    sun_data = bpy.data.lights.new("Sun", "SUN")
    sun_data.energy = 3.0
    sun = bpy.data.objects.new("Sun", sun_data)
    sun.rotation_mode = "QUATERNION"
    sun.rotation_quaternion = (-SUN_DIRECTION).to_track_quat("-Z", "Y")
    scene.collection.objects.link(sun)


def render(scene, size, path):
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print(f"rendered {path}")


def main():
    args = parse_args()
    scene = reset_scene()
    build_knight()
    setup_camera(scene)
    out = os.path.abspath(args.out)
    os.makedirs(out, exist_ok=True)
    for size in [int(s) for s in args.sizes.split(",") if s.strip()]:
        render(scene, size, os.path.join(out, f"knight_{size}.png"))
    if args.preview:
        render(scene, args.preview, os.path.join(out, "knight_preview.png"))
    if args.save_blend:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.save_blend))


main()
