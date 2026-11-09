// Paints paper-doll layers with GPT Image and cuts them out with Blender masks.
//
//   node tools/hires-art/paperdoll-gen.mjs paint   [--dir .hires-tmp/paperdoll] [--from armor]
//                                                  [--only armor,helmet] [--quality high]
//                                                  [--model gpt-image-2.6-sunburst] [--dry-run]
//   node tools/hires-art/paperdoll-gen.mjs compose [--dir ...] [--layers body,armor,...]
//                                                  [--size 256] [--out knight.png]
//
// paint works through the layers in order. Each step sends one image to the
// edit endpoint: everything painted so far, with the next layer's clay
// underdrawing pasted on top. The model repaints that layer, and only the
// pixels inside the layer's Blender mask are kept (layer_<name>.png). Outlines
// therefore always come from Blender, so any set of layers fits together.
//
// The API key is read from OPENAI_API_KEY or, failing that, from the file
// ~/.config/openai/api_key. It is never printed. --dry-run writes the request
// images and prompts (request_<name>.png / .txt) without calling the API.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { PNG } from "pngjs";

const ENDPOINT = "https://api.openai.com/v1/images/edits";

const STYLE = [
  "Hand-painted dark-fantasy game sprite for a classic dungeon roguelike.",
  "Realistic anatomy and materials (worn steel, riveted mail, scuffed leather, coarse linen),",
  "but bold, simplified, instantly readable shapes: the figure must still read clearly when shrunk to 48 pixels.",
  "Muted, earthy palette with one or two saturated accents; warm key light from the upper left,",
  "a cool rim light from the right, deep but not black shadows. Do not draw an outline around the figure (one is added later).",
  "Full body, standing, facing the viewer. Transparent background: no ground, no cast shadow, no text, no frame.",
].join(" ");

const RULES = [
  "The input image is a guide: a clay underdrawing of the parts still to be painted, laid over parts already painted.",
  "Trace the input: keep the pose, camera and every outline exactly where they are, pixel for pixel; do not move, resize or crop the figure.",
  "Keep the stylized game proportions of the input exactly: a large head (about one fifth of the height), broad hands and feet, sturdy limbs.",
  "Do not make the head smaller or the shoulders wider than in the input; fill each clay shape completely and do not paint outside it.",
  "Keep already painted parts unchanged.",
].join(" ");

const LAYER_PROMPTS = {
  body: "Paint the bare body: a sturdy, weathered human man, bald, barefoot, wearing only plain off-white linen braies. Neutral, stern face with clear features (brows, eyes, nose, mouth) that read at small size.",
  hair: "Paint only the hair: short, cropped dark-brown hair.",
  beard: "Paint only the beard: a short, neatly trimmed dark-brown beard and moustache.",
  armor: "Paint only the ring mail: a knee-length hauberk of riveted iron rings sewn on padded leather, short sleeves, dull grey steel with darker rust at the seams.",
  gloves: "Paint only the gloves: brown leather riding gloves with flared cuffs and visible stitching.",
  helmet: "Paint only the helmet: an open-faced steel helmet with a nasal guard and a tall swept-back crimson plume.",
  shield: "Paint only the shield: a small round wooden shield with an iron rim and a domed iron boss, the wood worn and dented.",
};

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const next = argv[index + 1];
    if (next === undefined || next.startsWith("--")) {
      options[arg.slice(2)] = true;
    } else {
      options[arg.slice(2)] = next;
      index += 1;
    }
  }
  return options;
}

function readApiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY.trim();
  const file = join(homedir(), ".config", "openai", "api_key");
  if (existsSync(file)) return readFileSync(file, "utf8").trim();
  throw new Error("No API key: set OPENAI_API_KEY or write it to ~/.config/openai/api_key");
}

const readPng = (file) => PNG.sync.read(readFileSync(file));
const writePng = (file, png) => writeFileSync(file, PNG.sync.write(png));

function blank(width, height) {
  return new PNG({ width, height });
}

/** Source-over composite of `top` onto `base`, optionally limited by a mask's alpha. */
function over(base, top, mask = null) {
  const out = blank(base.width, base.height);
  base.data.copy(out.data);
  for (let i = 0; i < out.data.length; i += 4) {
    const coverage = mask ? mask.data[i + 3] / 255 : 1;
    const a = (top.data[i + 3] / 255) * coverage;
    if (a <= 0) continue;
    const b = out.data[i + 3] / 255;
    const outA = a + b * (1 - a);
    for (let c = 0; c < 3; c += 1) {
      out.data[i + c] = Math.round((top.data[i + c] * a + out.data[i + c] * b * (1 - a)) / outA);
    }
    out.data[i + 3] = Math.round(outA * 255);
  }
  return out;
}

/** Painted colour inside the mask, mask alpha as the layer's alpha. */
function cutLayer(painted, mask, underdrawing) {
  const out = blank(mask.width, mask.height);
  let inside = 0;
  let unpainted = 0;
  for (let i = 0; i < out.data.length; i += 4) {
    const alpha = mask.data[i + 3];
    if (alpha === 0) continue;
    inside += 1;
    // Where the model left the mask empty, fall back to the underdrawing so the
    // layer has no holes; the count below shows how well the outline was kept.
    const source = painted.data[i + 3] >= 128 ? painted : (unpainted += 1, underdrawing);
    out.data[i] = source.data[i];
    out.data[i + 1] = source.data[i + 1];
    out.data[i + 2] = source.data[i + 2];
    out.data[i + 3] = alpha;
  }
  return { layer: out, unpaintedShare: inside ? unpainted / inside : 0 };
}

/** Share of painted pixels that fall outside the expected silhouette. */
function spillShare(painted, silhouette) {
  let paintedCount = 0;
  let outside = 0;
  for (let i = 0; i < painted.data.length; i += 4) {
    if (painted.data[i + 3] < 128) continue;
    paintedCount += 1;
    if (silhouette.data[i + 3] < 128) outside += 1;
  }
  return paintedCount ? outside / paintedCount : 0;
}

function downscale(png, size) {
  const k = png.width / size;
  const out = blank(size, Math.round(png.height / k));
  for (let y = 0; y < out.height; y += 1) {
    for (let x = 0; x < out.width; x += 1) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = Math.floor(y * k); sy < Math.floor((y + 1) * k); sy += 1) {
        for (let sx = Math.floor(x * k); sx < Math.floor((x + 1) * k); sx += 1) {
          const p = (sy * png.width + sx) * 4;
          const alpha = png.data[p + 3];
          r += png.data[p] * alpha; g += png.data[p + 1] * alpha; b += png.data[p + 2] * alpha;
          a += alpha; n += 1;
        }
      }
      const d = (y * out.width + x) * 4;
      if (a > 0) {
        out.data[d] = Math.round(r / a); out.data[d + 1] = Math.round(g / a); out.data[d + 2] = Math.round(b / a);
      }
      out.data[d + 3] = Math.round(a / n);
    }
  }
  return out;
}

/**
 * A dark rim around the whole figure, drawn at the output size so it stays
 * the same weight at every resolution and keeps the sprite readable at 48 px.
 */
function addOutline(png, radius, color = [14, 11, 10]) {
  const { width, height } = png;
  const reach = Math.ceil(radius);
  const rim = blank(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let strongest = 0;
      for (let dy = -reach; dy <= reach; dy += 1) {
        for (let dx = -reach; dx <= reach; dx += 1) {
          const sx = x + dx, sy = y + dy;
          if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
          const falloff = Math.min(1, Math.max(0, radius + 0.5 - Math.hypot(dx, dy)));
          strongest = Math.max(strongest, png.data[(sy * width + sx) * 4 + 3] * falloff);
        }
      }
      const d = (y * width + x) * 4;
      rim.data[d] = color[0]; rim.data[d + 1] = color[1]; rim.data[d + 2] = color[2];
      rim.data[d + 3] = Math.round(strongest);
    }
  }
  return over(rim, png);
}

async function requestEdit({ apiKey, model, quality, prompt, image, images, size, n = 1 }) {
  const inputs = (images ?? [image]).map((png) => ({
    image_url: `data:image/png;base64,${PNG.sync.write(png).toString("base64")}`,
  }));
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model, prompt, quality,
      images: inputs,
      size: `${size}x${size}`,
      background: "transparent",
      output_format: "png",
      n,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Image edit failed (${response.status}): ${body.error?.message ?? JSON.stringify(body)}`);
  }
  const results = (body.data ?? []).map((item) => PNG.sync.read(Buffer.from(item.b64_json, "base64")));
  if (!results.length) throw new Error("Image edit returned no image");
  return { image: results[0], results, usage: body.usage };
}

/** Area-average resample to a square of `size` pixels (inputs here are square). */
function resample(png, size) {
  if (png.width === size && png.height === size) return png;
  const out = blank(size, size);
  const kx = png.width / size, ky = png.height / size;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0, g = 0, b = 0, a = 0, w = 0;
      const x0 = x * kx, x1 = (x + 1) * kx, y0 = y * ky, y1 = (y + 1) * ky;
      for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy += 1) {
        const wy = Math.min(y1, sy + 1) - Math.max(y0, sy);
        for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx += 1) {
          const wx = Math.min(x1, sx + 1) - Math.max(x0, sx);
          const p = (Math.min(sy, png.height - 1) * png.width + Math.min(sx, png.width - 1)) * 4;
          const weight = wx * wy, alpha = png.data[p + 3] * weight;
          r += png.data[p] * alpha; g += png.data[p + 1] * alpha; b += png.data[p + 2] * alpha;
          a += alpha; w += weight;
        }
      }
      const d = (y * size + x) * 4;
      if (a > 0) { out.data[d] = r / a; out.data[d + 1] = g / a; out.data[d + 2] = b / a; }
      out.data[d + 3] = Math.round(a / w);
    }
  }
  return out;
}

/**
 * Free-form edit: send one or more images and a prompt, save each result.
 *   edit --in a.png[,b.png] --prompt-file p.txt --out result.png [--n 2]
 */
async function edit(options) {
  const files = String(options.in).split(",");
  const size = Number.parseInt(options.size ?? "1024", 10);
  const images = files.map((file) => resample(readPng(resolve(file)), size));
  const prompt = readFileSync(resolve(options["prompt-file"]), "utf8").trim();
  const n = Number.parseInt(options.n ?? "1", 10);
  const out = resolve(options.out);
  const { results, usage } = await requestEdit({
    apiKey: readApiKey(),
    model: options.model ?? "gpt-image-2.6-sunburst",
    quality: options.quality ?? "high",
    prompt, images, size, n,
  });
  results.forEach((png, index) => {
    const file = results.length === 1 ? out : out.replace(/\.png$/, `_${index + 1}.png`);
    writePng(file, png);
    console.log(`wrote ${file}`);
  });
  if (usage) console.log(`tokens ${JSON.stringify(usage)}`);
}

function loadPlan(dir) {
  const plan = JSON.parse(readFileSync(join(dir, "layers.json"), "utf8"));
  return plan.layers.map((layer) => ({
    ...layer,
    stageImage: () => readPng(join(dir, layer.stage)),
    maskImage: () => readPng(join(dir, layer.mask)),
  }));
}

/** Layers in order with "hides" applied: a worn layer removes the ones it hides. */
function visibleLayers(layers, names) {
  const worn = new Set(names);
  for (const layer of layers) {
    if (worn.has(layer.name)) for (const hidden of layer.hides ?? []) worn.delete(hidden);
  }
  return layers.filter((layer) => worn.has(layer.name));
}

async function paint(options) {
  const dir = resolve(options.dir ?? ".hires-tmp/paperdoll");
  const layers = loadPlan(dir);
  const model = options.model ?? "gpt-image-2.6-sunburst";
  const quality = options.quality ?? "high";
  const dryRun = Boolean(options["dry-run"]);
  const only = options.only ? new Set(String(options.only).split(",")) : null;
  const fromIndex = options.from ? layers.findIndex((l) => l.name === options.from) : 0;
  if (fromIndex < 0) throw new Error(`Unknown layer: ${options.from}`);
  const apiKey = dryRun ? null : readApiKey();

  for (const [index, layer] of layers.entries()) {
    if (index < fromIndex || (only && !only.has(layer.name))) continue;
    const mask = layer.maskImage();
    const stage = layer.stageImage();
    // Everything already painted (cut layers, hides applied), then this layer's clay on top.
    const below = visibleLayers(layers.slice(0, index + 1), layers.slice(0, index + 1).map((l) => l.name))
      .filter((l) => l.name !== layer.name);
    let base = blank(mask.width, mask.height);
    for (const done of below) {
      const file = join(dir, `layer_${done.name}.png`);
      // In a dry run (or for layers not painted yet) the clay stands in.
      base = over(base, existsSync(file) ? readPng(file) : stage, existsSync(file) ? null : done.maskImage());
    }
    const input = over(base, stage, mask);
    const prompt = `${STYLE}\n\n${RULES}\n\n${LAYER_PROMPTS[layer.name] ?? `Paint only the ${layer.label}.`}`;

    if (dryRun) {
      writePng(join(dir, `request_${layer.name}.png`), input);
      writeFileSync(join(dir, `request_${layer.name}.txt`), `${prompt}\n`);
      console.log(`dry run: wrote request_${layer.name}.png/.txt`);
      continue;
    }
    console.log(`painting ${layer.name} with ${model} (${quality})...`);
    const { image: painted, usage } = await requestEdit({ apiKey, model, quality, prompt, image: input, size: mask.width });
    if (painted.width !== mask.width || painted.height !== mask.height) {
      throw new Error(`Expected ${mask.width}x${mask.height}, got ${painted.width}x${painted.height}`);
    }
    writePng(join(dir, `gen_${layer.name}.png`), painted);
    const { layer: cut, unpaintedShare } = cutLayer(painted, mask, stage);
    writePng(join(dir, `layer_${layer.name}.png`), cut);
    const spill = spillShare(painted, input);
    console.log(
      `  ${layer.name}: ${(unpaintedShare * 100).toFixed(1)}% of the mask left unpainted, ` +
      `${(spill * 100).toFixed(1)}% of the painting outside the figure` +
      (usage ? `, tokens ${JSON.stringify(usage)}` : ""),
    );
  }
}

function compose(options) {
  const dir = resolve(options.dir ?? ".hires-tmp/paperdoll");
  const layers = loadPlan(dir);
  const names = options.layers ? String(options.layers).split(",") : layers.map((l) => l.name);
  let image = null;
  for (const layer of visibleLayers(layers, names)) {
    const file = join(dir, `layer_${layer.name}.png`);
    if (!existsSync(file)) throw new Error(`Not painted yet: ${file}`);
    const png = readPng(file);
    image = image ? over(image, png) : png;
  }
  if (!image) throw new Error("No layers to compose");
  const size = Number.parseInt(options.size ?? "256", 10);
  const out = resolve(options.out ?? join(dir, `composite_${size}.png`));
  const scaled = size === image.width ? image : downscale(image, size);
  const outline = Number.parseFloat(options.outline ?? String(Math.max(1, size / 128)));
  writePng(out, outline > 0 ? addOutline(scaled, outline) : scaled);
  console.log(`wrote ${out}`);
}

/**
 * The cut for one item: colour from the painted stage, alpha from the isolated
 * cut-out, limited to pixels that actually changed from the figure below (plus
 * a small margin), so skin at openings and repainted underwear stay out.
 */
function cutChanged(below, stage, isolated, threshold = 20, margin = 3) {
  const { width, height } = stage;
  const count = width * height;
  const near = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) {
    const p = i * 4;
    let delta = Math.abs(below.data[p + 3] - stage.data[p + 3]);
    for (let c = 0; c < 3; c += 1) {
      delta = Math.max(delta, Math.abs(below.data[p + c] * below.data[p + 3] - stage.data[p + c] * stage.data[p + 3]) / 255);
    }
    if (delta <= threshold) continue;
    const x = i % width, y = (i - x) / width;
    for (let dy = -margin; dy <= margin; dy += 1) {
      for (let dx = -margin; dx <= margin; dx += 1) {
        const X = x + dx, Y = y + dy;
        if (X >= 0 && Y >= 0 && X < width && Y < height) near[Y * width + X] = 1;
      }
    }
  }
  const out = blank(width, height);
  for (let i = 0; i < count; i += 1) {
    const p = i * 4;
    out.data[p] = stage.data[p]; out.data[p + 1] = stage.data[p + 1]; out.data[p + 2] = stage.data[p + 2];
    out.data[p + 3] = near[i] ? Math.min(isolated.data[p + 3], stage.data[p + 3]) : 0;
  }
  return out;
}

/** Separable box blur of a per-pixel float map. */
function boxBlur(src, width, height, radius) {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length), span = 2 * radius + 1;
  for (let y = 0; y < height; y += 1) {
    let sum = 0;
    for (let x = -radius; x < width; x += 1) {
      if (x + radius < width) sum += src[y * width + x + radius];
      if (x - radius - 1 >= 0) sum -= src[y * width + x - radius - 1];
      if (x >= 0) tmp[y * width + x] = sum / span;
    }
  }
  for (let x = 0; x < width; x += 1) {
    let sum = 0;
    for (let y = -radius; y < height; y += 1) {
      if (y + radius < height) sum += tmp[(y + radius) * width + x];
      if (y - radius - 1 >= 0) sum -= tmp[(y - radius - 1) * width + x];
      if (y >= 0) out[y * width + x] = sum / span;
    }
  }
  return out;
}

/** Connected regions (4-neighbour) of a 0/1 map: label per pixel and region sizes. */
function regions(map, width, height) {
  const label = new Int32Array(map.length).fill(-1), sizes = [];
  for (let start = 0; start < map.length; start += 1) {
    if (!map[start] || label[start] >= 0) continue;
    const id = sizes.length, stack = [start];
    let size = 0;
    label[start] = id;
    while (stack.length) {
      const i = stack.pop();
      size += 1;
      const x = i % width, y = (i - x) / width;
      for (const [X, Y] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (X < 0 || Y < 0 || X >= width || Y >= height) continue;
        const j = Y * width + X;
        if (map[j] && label[j] < 0) { label[j] = id; stack.push(j); }
      }
    }
    sizes.push(size);
  }
  return { label, sizes };
}

/**
 * The cut for one item without a cut-out from the model: the pixels that
 * changed from the figure below. The difference is blurred before the
 * threshold, so the sub-pixel outline shimmer of a repaint (thin lines) drops
 * out; specks are removed and small holes (gaps between mail rings, the
 * inside of a buckle) are filled, but not large ones such as an open cloak front.
 */
function cutByDifference(below, stage, { threshold = 28, blur = 3, minRegion = 1500, maxHole = 4000, opening = 4, area = null } = {}) {
  const { width, height } = stage;
  const count = width * height;
  const delta = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const p = i * 4;
    let d = Math.abs(below.data[p + 3] - stage.data[p + 3]);
    for (let c = 0; c < 3; c += 1) {
      d = Math.max(d, Math.abs(below.data[p + c] * below.data[p + 3] - stage.data[p + c] * stage.data[p + 3]) / 255);
    }
    delta[i] = d;
  }
  const smooth = boxBlur(delta, width, height, blur);
  const mask = new Uint8Array(count);
  // area: [x0, y0, x1, y1] as fractions of the frame, where the item may appear at all.
  const [ax0, ay0, ax1, ay1] = (area ?? [0, 0, 1, 1]).map((v, k) => v * (k % 2 ? height : width));
  for (let i = 0; i < count; i += 1) {
    const x = i % width, y = (i - x) / width;
    mask[i] = smooth[i] > threshold && x >= ax0 && x < ax1 && y >= ay0 && y < ay1 ? 1 : 0;
  }
  const parts = regions(mask, width, height);
  for (let i = 0; i < count; i += 1) if (mask[i] && parts.sizes[parts.label[i]] < minRegion) mask[i] = 0;
  // Opening (erode, then dilate) removes the thin slivers left where an edge moved a little.
  const eroded = boxBlur(Float32Array.from(mask), width, height, opening);
  const reopened = boxBlur(Float32Array.from(eroded, (v) => (v > 0.999 ? 1 : 0)), width, height, opening);
  for (let i = 0; i < count; i += 1) mask[i] = reopened[i] > 0.001 ? 1 : 0;
  const kept = regions(mask, width, height);
  for (let i = 0; i < count; i += 1) if (mask[i] && kept.sizes[kept.label[i]] < minRegion) mask[i] = 0;
  const gaps = regions(Uint8Array.from(mask, (v) => 1 - v), width, height);
  const touchesBorder = new Set();
  for (let x = 0; x < width; x += 1) { touchesBorder.add(gaps.label[x]); touchesBorder.add(gaps.label[(height - 1) * width + x]); }
  for (let y = 0; y < height; y += 1) { touchesBorder.add(gaps.label[y * width]); touchesBorder.add(gaps.label[y * width + width - 1]); }
  for (let i = 0; i < count; i += 1) {
    const gap = gaps.label[i];
    if (gap >= 0 && !touchesBorder.has(gap) && gaps.sizes[gap] <= maxHole) mask[i] = 1;
  }
  const soft = boxBlur(Float32Array.from(mask, (v) => v * 255), width, height, 1);
  const out = blank(width, height);
  for (let i = 0; i < count; i += 1) {
    const p = i * 4;
    out.data[p] = stage.data[p]; out.data[p + 1] = stage.data[p + 1]; out.data[p + 2] = stage.data[p + 2];
    out.data[p + 3] = Math.min(Math.round(soft[i]), stage.data[p + 3]);
  }
  return out;
}

/** Bilinear sample of premultiplied RGBA at (x, y); outside the image is transparent. */
function samplePremultiplied(png, x, y, out) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  out[0] = out[1] = out[2] = out[3] = 0;
  for (const [X, Y, w] of [[x0, y0, (1 - fx) * (1 - fy)], [x0 + 1, y0, fx * (1 - fy)], [x0, y0 + 1, (1 - fx) * fy], [x0 + 1, y0 + 1, fx * fy]]) {
    if (w === 0 || X < 0 || Y < 0 || X >= png.width || Y >= png.height) continue;
    const p = (Y * png.width + X) * 4, a = png.data[p + 3] / 255;
    out[0] += png.data[p] * a * w; out[1] += png.data[p + 1] * a * w; out[2] += png.data[p + 2] * a * w; out[3] += png.data[p + 3] * w;
  }
  return out;
}

/**
 * Fit stage ≈ base under a uniform scale about the image centre plus a shift,
 * by a coarse-to-fine search on a truncated colour difference (truncated so
 * the newly painted item does not pull the fit), and resample the stage into
 * the base's frame.
 */
function alignTo(base, stage) {
  const size = base.width, centre = size / 2;
  const levels = [
    { res: 128, scales: [-0.1, 0.1, 0.01], shifts: [-80, 80, 8] },
    { res: 256, scales: [-0.01, 0.01, 0.0025], shifts: [-8, 8, 2] },
    { res: 512, scales: [-0.0025, 0.0025, 0.000625], shifts: [-2, 2, 0.5] },
  ];
  let best = { scale: 1, dx: 0, dy: 0 };
  const px = new Float32Array(4);
  for (const level of levels) {
    const b = resample(base, level.res), s = resample(stage, level.res), k = size / level.res;
    const basePm = new Float32Array(level.res * level.res * 4);
    for (let i = 0; i < level.res * level.res; i += 1) {
      const a = b.data[i * 4 + 3] / 255;
      for (let c = 0; c < 3; c += 1) basePm[i * 4 + c] = b.data[i * 4 + c] * a;
      basePm[i * 4 + 3] = b.data[i * 4 + 3];
    }
    const centreL = centre / k;
    const around = best;
    for (let ds = level.scales[0]; ds <= level.scales[1] + 1e-9; ds += level.scales[2]) {
      for (let oy = level.shifts[0]; oy <= level.shifts[1] + 1e-9; oy += level.shifts[2]) {
        for (let ox = level.shifts[0]; ox <= level.shifts[1] + 1e-9; ox += level.shifts[2]) {
          const scale = around.scale + ds, dx = around.dx + ox, dy = around.dy + oy;
          let cost = 0;
          for (let y = 0; y < level.res; y += 2) {
            for (let x = 0; x < level.res; x += 2) {
              const i = (y * level.res + x) * 4;
              const sx = scale * (x + 0.5 - centreL) + centreL + dx / k - 0.5;
              const sy = scale * (y + 0.5 - centreL) + centreL + dy / k - 0.5;
              samplePremultiplied(s, sx, sy, px);
              if (basePm[i + 3] === 0 && px[3] === 0) continue;
              let d = 0;
              for (let c = 0; c < 4; c += 1) d += Math.abs(basePm[i + c] - px[c]);
              cost += Math.min(d, 160);
            }
          }
          if (best.cost === undefined || cost < best.cost) best = { scale, dx, dy, cost };
        }
      }
      best = { ...best, cost: best.cost };
    }
    best = { scale: best.scale, dx: best.dx, dy: best.dy };
  }
  const out = blank(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      samplePremultiplied(stage, best.scale * (x + 0.5 - centre) + centre + best.dx - 0.5,
        best.scale * (y + 0.5 - centre) + centre + best.dy - 0.5, px);
      const d = (y * size + x) * 4;
      if (px[3] > 0) { const a = px[3] / 255; out.data[d] = px[0] / a; out.data[d + 1] = px[1] / a; out.data[d + 2] = px[2] / a; }
      out.data[d + 3] = Math.round(px[3]);
    }
  }
  return { image: out, ...best };
}

const DRESS_PAINT =(item, others, hasRef) => [
  "Image 1 is a paper-doll character: a painted figure that is dressed one item at a time.",
  hasRef ? "Image 2 shows the art style and the kind of item to paint; use it only as a reference." : "",
  `Paint onto the figure in image 1 only this item: ${item.prompt}`,
  "Fit it to this body and this pose so it hangs, folds and catches the light naturally.",
  "Add nothing else.",
  "Everything the new item does not cover must stay exactly as it is in image 1, pixel for pixel" +
    (others.length ? ` (the body and the ${others.join(", ")})` : " (the body)") + ".",
  "Do not move, resize, re-light or repaint the figure. Match its painting style, warm light from the upper left and level of finish.",
  "Keep the transparent background: no ground, no shadow, no text.",
].filter(Boolean).join("\n");

const DRESS_ISOLATE = (item, others) => [
  `Cut out the ${item.noun} from this image.`,
  `Keep only the ${item.noun}, exactly as it is painted, pixel for pixel, at the same position and size.`,
  "Make everything else fully transparent: the man's head, skin and body" +
    (others.length ? `, and the ${others.join(", ")}` : "") + ".",
  "Do not paint anything that is hidden, and do not fill openings: where skin or other clothing shows through, leave it transparent.",
  "No background, no shadow, no text.",
].join("\n");

/**
 * Dress a painted body in a kit, one item at a time:
 *   dress --kit tools/hires-art/kits/knight.json --out .hires-tmp/kit-knight [--from item] [--only a,b]
 *         [--model gpt-image-2.5-sunburst] [--quality medium] [--isolate-quality none|medium]
 * For each item: paint it onto the figure as worn so far (the stage), have the
 * model cut it out (the isolation), and keep the changed pixels inside that
 * cut-out (layer_<item>.png). Writes layers.json, so compose works on the result.
 */
async function dress(options) {
  const kitFile = resolve(options.kit);
  const kit = JSON.parse(readFileSync(kitFile, "utf8"));
  const dir = resolve(options.out);
  const size = Number.parseInt(options.size ?? "1024", 10);
  const model = options.model ?? "gpt-image-2.5-sunburst";
  const quality = options.quality ?? "medium";
  const isolateQuality = options["isolate-quality"] ?? "none";
  const only = options.only ? new Set(String(options.only).split(",")) : null;
  const fromIndex = options.from ? kit.items.findIndex((item) => item.name === options.from) : 0;
  if (fromIndex < 0) throw new Error(`Unknown item: ${options.from}`);
  const apiKey = readApiKey();
  const fromKit = (file) => resample(readPng(resolve(kitFile, "..", file)), size);
  const { mkdirSync } = await import("node:fs");
  mkdirSync(dir, { recursive: true });

  const layers = [{ name: "body", label: kit.label ?? "body", noun: "body" }, ...kit.items];
  writePng(join(dir, "layer_body.png"), fromKit(kit.body));
  writeFileSync(join(dir, "layers.json"), `${JSON.stringify({
    size,
    layers: layers.map(({ name, label, noun, hides }) => ({
      name, label: label ?? noun, hides: hides ?? [], stage: `layer_${name}.png`, mask: `layer_${name}.png`,
    })),
  }, null, 2)}\n`);

  for (const [index, item] of kit.items.entries()) {
    if (index < fromIndex || (only && !only.has(item.name))) continue;
    const wornNames = layers.slice(0, index + 2).map((layer) => layer.name);
    const below = visibleLayers(layers.slice(0, index + 2), wornNames).filter((layer) => layer.name !== item.name);
    let base = null;
    for (const layer of below) {
      const png = readPng(join(dir, `layer_${layer.name}.png`));
      base = base ? over(base, png) : png;
    }
    const others = below.filter((layer) => layer.name !== "body").map((layer) => layer.noun);
    const images = [base, ...(item.ref ? [fromKit(item.ref)] : [])];

    const stageFile = join(dir, `stage_${item.name}.png`);
    let painted;
    if (options.reuse && existsSync(stageFile)) {
      painted = { image: readPng(stageFile), usage: null };
      console.log(`${item.name}: reusing ${stageFile}`);
    } else {
      console.log(`${item.name}: painting (${model}, ${quality})...`);
      painted = await requestEdit({ apiKey, model, quality, size, images, prompt: DRESS_PAINT(item, others, Boolean(item.ref)) });
      writePng(stageFile, painted.image);
    }
    // The model sometimes redraws the whole figure a little larger or shifted;
    // pull the stage back onto the figure before comparing.
    const fit = alignTo(base, painted.image);
    console.log(`${item.name}: aligned (scale ${fit.scale.toFixed(4)}, shift ${fit.dx.toFixed(1)}, ${fit.dy.toFixed(1)} px)`);
    painted.image = fit.image;
    writePng(join(dir, `aligned_${item.name}.png`), painted.image);
    const tokens = (usage) => usage ? `${usage.input_tokens}/${usage.output_tokens}` : "?";
    if (isolateQuality === "none") {
      writePng(join(dir, `layer_${item.name}.png`), cutByDifference(base, painted.image, { area: item.area, ...item.cut }));
      console.log(`${item.name}: done (tokens in/out ${tokens(painted.usage)})`);
      continue;
    }
    console.log(`${item.name}: isolating (${isolateQuality})...`);
    const isolated = await requestEdit({
      apiKey, model, quality: isolateQuality, size, images: [painted.image], prompt: DRESS_ISOLATE(item, others),
    });
    writePng(join(dir, `iso_${item.name}.png`), isolated.image);
    writePng(join(dir, `layer_${item.name}.png`), cutChanged(base, painted.image, isolated.image));
    console.log(`${item.name}: done (tokens in/out: paint ${tokens(painted.usage)}, isolate ${tokens(isolated.usage)})`);
  }
}

const [command, ...rest] = process.argv.slice(2);
const options = parseArgs(rest);
if (command === "paint") {
  // Set the exit code instead of calling process.exit(): exiting while fetch's
  // sockets are closing trips a libuv assertion on Windows.
  paint(options).catch((error) => { console.error(error.message); process.exitCode = 1; });
} else if (command === "dress") {
  dress(options).catch((error) => { console.error(error.message); process.exitCode = 1; });
} else if (command === "edit") {
  edit(options).catch((error) => { console.error(error.message); process.exitCode = 1; });
} else if (command === "compose") {
  compose(options);
} else {
  console.error("Usage: paperdoll-gen.mjs paint [--dry-run] [--from layer] [--only a,b] | compose [--layers a,b] [--size 256]");
  process.exit(1);
}
