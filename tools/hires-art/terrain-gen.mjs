// Paints terrain and dungeon-feature tiles with GPT Image and writes them
// into the high-resolution pack.
//
//   node tools/hires-art/terrain-gen.mjs gen   --spec tools/hires-art/terrain/level1.json
//                                              [--only floor,wall] [--n 2] [--force]
//   node tools/hires-art/terrain-gen.mjs build --spec tools/hires-art/terrain/level1.json
//                                              [--only floor,wall]
//
// gen paints one raw 1024 px image per spec item (raw_<name>.png in the spec's
// work folder; with --n 2 also raw_<name>_2.png ...). Existing raw images are
// kept unless --force is given, so prompts can be tuned item by item. An item
// with "ref" is painted with the edit endpoint, the referenced raw image(s)
// going in as images 1, 2, ... so palette and shapes carry over.
//
// build turns raw images into pack tiles:
//   texture   opaque, optionally made to wrap seamlessly ("seamless": band)
//   overlay   transparent, lies flat on the floor; kept where it was painted
//   billboard transparent, stands upright; trimmed and set on the bottom edge
//   item      transparent object icon; with "fit": {"matchRef": "px_x"} it is
//             scaled into the bounding box of that reference image, so it
//             keeps the size and placement of the tile it replaces
// Output keys without a folder go to other/; "obj/dagger" goes to obj/.
// Each output can rotate, darken or tint the result, or repaint its magenta
// key-colour parts ("recolor": "#rrggbb"), so one painting can fill several
// tile keys. "px_<key>" references are copied on demand from the
// `npm run hires:split` output. Run `npm run hires:manifest` afterwards.
// The object guide is tools/hires-art/objects/README.md.
//
// The API key is read from OPENAI_API_KEY or ~/.config/openai/api_key and is
// never printed.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { PNG } from "pngjs";

const API = "https://api.openai.com/v1/images";

function parseArgs(argv) {
  const options = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      options._.push(arg);
      continue;
    }
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
const writePng = (file, png) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, PNG.sync.write(png));
};
const blank = (width, height) => new PNG({ width, height });

// ---------------------------------------------------------------- requests

async function requestImages({ apiKey, model, quality, prompt, refs, size, n, transparent }) {
  const common = {
    model, prompt, quality, n,
    size: `${size}x${size}`,
    background: transparent ? "transparent" : "opaque",
    output_format: "png",
  };
  const body = refs.length
    ? {
        ...common,
        images: refs.map((png) => ({
          image_url: `data:image/png;base64,${PNG.sync.write(png).toString("base64")}`,
        })),
      }
    : common;
  const response = await fetch(`${API}/${refs.length ? "edits" : "generations"}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Image request failed (${response.status}): ${json.error?.message ?? JSON.stringify(json)}`);
  }
  const images = (json.data ?? []).map((item) => PNG.sync.read(Buffer.from(item.b64_json, "base64")));
  if (!images.length) throw new Error("Image request returned no image");
  return { images, usage: json.usage };
}

// ---------------------------------------------------------------- pixels

/** Area-average resample (premultiplied) to width x height. */
function resample(png, width, height = width) {
  if (png.width === width && png.height === height) return png;
  const out = blank(width, height);
  const kx = png.width / width, ky = png.height / height;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
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
      const d = (y * width + x) * 4;
      if (a > 0) { out.data[d] = r / a; out.data[d + 1] = g / a; out.data[d + 2] = b / a; }
      out.data[d + 3] = Math.round(a / w);
    }
  }
  return out;
}

const smooth = (t) => t * t * (3 - 2 * t);

/**
 * Makes a texture wrap. Along each axis in turn, the image is blended with a
 * copy rolled by half its size: the copy shows near the edges (where it is
 * continuous across the wrap) and the original in the middle (where the
 * copy has its seam). Doing the axes separately keeps the copy's seam out of
 * the blend. `band` is the blend width as a fraction of the size.
 */
function makeSeamless(png, band) {
  let current = png;
  for (const axis of ["x", "y"]) {
    const { width, height } = current;
    const out = blank(width, height);
    const length = axis === "x" ? width : height;
    const reach = Math.max(1, band * length);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const position = axis === "x" ? x : y;
        const edge = Math.min(position + 0.5, length - position - 0.5);
        const keep = smooth(Math.min(1, edge / reach));
        const rx = axis === "x" ? (x + width / 2) % width : x;
        const ry = axis === "y" ? (y + height / 2) % height : y;
        const p = (y * width + x) * 4, q = (ry * width + rx) * 4;
        for (let c = 0; c < 4; c += 1) {
          out.data[p + c] = current.data[p + c] * keep + current.data[q + c] * (1 - keep);
        }
      }
    }
    current = out;
  }
  return current;
}

/** Evens out large-scale brightness so the texture does not pulse when tiled. */
function flattenLighting(png, strength) {
  const { width, height } = png;
  const cells = 8;
  const means = [];
  let total = 0;
  for (let cy = 0; cy < cells; cy += 1) {
    for (let cx = 0; cx < cells; cx += 1) {
      let sum = 0, count = 0;
      for (let y = Math.floor(cy * height / cells); y < Math.floor((cy + 1) * height / cells); y += 1) {
        for (let x = Math.floor(cx * width / cells); x < Math.floor((cx + 1) * width / cells); x += 1) {
          const p = (y * width + x) * 4;
          sum += png.data[p] + png.data[p + 1] + png.data[p + 2];
          count += 1;
        }
      }
      means.push(sum / count);
      total += sum / count;
    }
  }
  const mean = total / means.length;
  const out = blank(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      // Bilinear lookup of the cell means, wrapping so the result still tiles.
      const fx = x / width * cells - 0.5, fy = y / height * cells - 0.5;
      const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const at = (cx, cy) => means[((cy + cells) % cells) * cells + ((cx + cells) % cells)];
      const local = (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty)
        + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty;
      const gain = 1 + (mean / Math.max(1, local) - 1) * strength;
      const p = (y * width + x) * 4;
      for (let c = 0; c < 3; c += 1) out.data[p + c] = Math.min(255, png.data[p + c] * gain);
      out.data[p + 3] = png.data[p + 3];
    }
  }
  return out;
}

function luminance(png) {
  const out = new Float32Array(png.width * png.height);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = (0.299 * png.data[i * 4] + 0.587 * png.data[i * 4 + 1] + 0.114 * png.data[i * 4 + 2]) / 255;
  }
  return out;
}

/** Separable box blur on a float map, wrapping at the edges; three passes approximate a Gaussian. */
function blurMap(map, width, height, radius, passes = 3) {
  let src = map;
  const r = Math.max(1, Math.round(radius));
  for (let pass = 0; pass < passes; pass += 1) {
    const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
    for (let y = 0; y < height; y += 1) {
      let sum = 0;
      for (let k = -r; k <= r; k += 1) sum += src[y * width + ((k + width) % width)];
      for (let x = 0; x < width; x += 1) {
        tmp[y * width + x] = sum / (2 * r + 1);
        sum += src[y * width + ((x + r + 1) % width)] - src[y * width + ((x - r + width) % width)];
      }
    }
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let k = -r; k <= r; k += 1) sum += tmp[((k + height) % height) * width + x];
      for (let y = 0; y < height; y += 1) {
        out[y * width + x] = sum / (2 * r + 1);
        sum += tmp[((y + r + 1) % height) * width + x] - tmp[((y - r + height) % height) * width + x];
      }
    }
    src = out;
  }
  return src;
}

/**
 * Bakes relief into a flat-lit texture. Brightness stands in for height
 * (joints and cracks are dark, so they read as recesses):
 *   bevel    light from the upper left on the slopes of that height field
 *   cavity   darkens recesses relative to their surroundings
 *   contrast boosts mid-scale contrast (stone against joint)
 * Sizes are fractions of the image width, so they mean the same at any size.
 */
function bakeRelief(png, { bevel = 0, bevelRadius = 0.004, depth = 6, cavity = 0, cavityRadius = 0.02, contrast = 0, contrastRadius = 0.05 } = {}) {
  const { width, height } = png;
  const lum = luminance(png);
  const h = blurMap(lum, width, height, bevelRadius * width);
  const around = blurMap(lum, width, height, cavityRadius * width);
  const broad = blurMap(lum, width, height, contrastRadius * width);
  const light = [-0.55, -0.55, 0.63];
  const out = blank(width, height);
  const scale = depth * width / 256;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      const gx = (h[y * width + (x + 1) % width] - h[y * width + (x - 1 + width) % width]) * 0.5 * scale;
      const gy = (h[((y + 1) % height) * width + x] - h[((y - 1 + height) % height) * width + x]) * 0.5 * scale;
      const len = Math.hypot(gx, gy, 1);
      const shade = (-gx * light[0] - gy * light[1] + light[2]) / len / light[2];
      let gain = 1 + (shade - 1) * bevel;
      gain *= 1 + Math.max(-0.6, Math.min(0.25, (h[i] - around[i]) * cavity));
      if (contrast) gain *= Math.pow(Math.max(0.05, lum[i]) / Math.max(0.05, broad[i]), contrast);
      for (let c = 0; c < 3; c += 1) out.data[i * 4 + c] = Math.max(0, Math.min(255, png.data[i * 4 + c] * gain));
      out.data[i * 4 + 3] = png.data[i * 4 + 3];
    }
  }
  return out;
}

/** Drops faint alpha speckle the model leaves in transparent areas. */
function cleanAlpha(png, floor = 12) {
  const out = blank(png.width, png.height);
  png.data.copy(out.data);
  for (let p = 3; p < out.data.length; p += 4) {
    const a = out.data[p];
    out.data[p] = a <= floor ? 0 : Math.round((a - floor) * 255 / (255 - floor));
  }
  return out;
}

function alphaBounds(png, threshold = 24) {
  let x0 = png.width, y0 = png.height, x1 = -1, y1 = -1;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (png.data[(y * png.width + x) * 4 + 3] > threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}

/**
 * Like alphaBounds, but ignores specks: connected pieces smaller than
 * `minShare` of the visible area (PixelHack puts a small mark above some
 * small items, which would otherwise stretch the box upward).
 */
function mainBounds(png, threshold = 24, minShare = 0.04) {
  const { width, height } = png;
  const label = new Int32Array(width * height).fill(-1);
  const pieces = [];
  let total = 0;
  for (let start = 0; start < width * height; start += 1) {
    if (label[start] !== -1 || png.data[start * 4 + 3] <= threshold) continue;
    const piece = { area: 0, x0: width, y0: height, x1: 0, y1: 0 };
    const stack = [start];
    label[start] = pieces.length;
    while (stack.length) {
      const index = stack.pop();
      const x = index % width;
      const y = (index - x) / width;
      piece.area += 1;
      piece.x0 = Math.min(piece.x0, x); piece.x1 = Math.max(piece.x1, x + 1);
      piece.y0 = Math.min(piece.y0, y); piece.y1 = Math.max(piece.y1, y + 1);
      for (const next of [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, index - width, index + width]) {
        if (next < 0 || next >= width * height || label[next] !== -1) continue;
        if (png.data[next * 4 + 3] <= threshold) continue;
        label[next] = pieces.length;
        stack.push(next);
      }
    }
    pieces.push(piece);
    total += piece.area;
  }
  const kept = pieces.filter((piece) => piece.area >= total * minShare);
  if (!kept.length) return null;
  return {
    x0: Math.min(...kept.map((p) => p.x0)), y0: Math.min(...kept.map((p) => p.y0)),
    x1: Math.max(...kept.map((p) => p.x1)), y1: Math.max(...kept.map((p) => p.y1)),
  };
}

function crop(png, { x0, y0, x1, y1 }) {
  const out = blank(x1 - x0, y1 - y0);
  for (let y = y0; y < y1; y += 1) {
    png.data.copy(out.data, (y - y0) * out.width * 4, (y * png.width + x0) * 4, (y * png.width + x1) * 4);
  }
  return out;
}

function paste(target, png, left, top) {
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const tx = x + left, ty = y + top;
      if (tx < 0 || ty < 0 || tx >= target.width || ty >= target.height) continue;
      png.data.copy(target.data, (ty * target.width + tx) * 4, (y * png.width + x) * 4, (y * png.width + x) * 4 + 4);
    }
  }
}

/**
 * Trims a transparent painting to its object and fits it into a square of
 * `size`: at most `width` x `height` of the frame, centred horizontally and
 * either standing on the bottom edge (leaving `bottom` free) or centred.
 */
function fitObject(png, size, { width = 0.94, height = 0.94, bottom = 0.03, anchor = "bottom" } = {}) {
  const bounds = alphaBounds(png);
  if (!bounds) return resample(png, size);
  const object = crop(png, bounds);
  const scale = Math.min(width * size / object.width, height * size / object.height);
  const w = Math.max(1, Math.round(object.width * scale));
  const h = Math.max(1, Math.round(object.height * scale));
  const small = resample(object, w, h);
  const out = blank(size, size);
  const left = Math.round((size - w) / 2);
  const top = anchor === "bottom" ? Math.round(size * (1 - bottom)) - h : Math.round((size - h) / 2);
  paste(out, small, left, top);
  return out;
}

/** Source-over composite of `top` onto `base` (same size). */
function over(base, top) {
  const out = blank(base.width, base.height);
  for (let p = 0; p < out.data.length; p += 4) {
    const ta = top.data[p + 3] / 255, ba = base.data[p + 3] / 255;
    const a = ta + ba * (1 - ta);
    for (let c = 0; c < 3; c += 1) {
      out.data[p + c] = a ? (top.data[p + c] * ta + base.data[p + c] * ba * (1 - ta)) / a : 0;
    }
    out.data[p + 3] = Math.round(a * 255);
  }
  return out;
}

/**
 * A dark rim around everything opaque, drawn at the output size so it has the
 * same weight at every resolution. Painted art loses the outlines pixel art
 * relies on, so standing features get one back to stay readable.
 */
function addOutline(png, radius, color = [16, 12, 10], strength = 0.85) {
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
      rim.data[d + 3] = Math.round(strongest * strength);
    }
  }
  return over(rim, png);
}

/**
 * Trims a transparent painting to its object and fits it, keeping its
 * aspect, centred in `box` (bounds measured on a reference of `refSize`
 * pixels), on a canvas of `size`.
 */
function fitIntoBox(png, size, box, refSize) {
  const bounds = alphaBounds(png);
  if (!bounds || !box) return resample(png, size);
  const object = crop(png, bounds);
  const k = size / refSize;
  const bw = (box.x1 - box.x0) * k, bh = (box.y1 - box.y0) * k;
  const scale = Math.min(bw / object.width, bh / object.height);
  const w = Math.max(1, Math.round(object.width * scale));
  const h = Math.max(1, Math.round(object.height * scale));
  const out = blank(size, size);
  paste(out, resample(object, w, h), Math.round((box.x0 + box.x1) / 2 * k - w / 2), Math.round((box.y0 + box.y1) / 2 * k - h / 2));
  return out;
}

function rotate(png, degrees) {
  const turns = ((Math.round(degrees / 90) % 4) + 4) % 4;
  let current = png;
  for (let t = 0; t < turns; t += 1) {
    const out = blank(current.height, current.width);
    for (let y = 0; y < current.height; y += 1) {
      for (let x = 0; x < current.width; x += 1) {
        // Clockwise: (x, y) -> (height - 1 - y, x)
        const d = (x * out.width + (current.height - 1 - y)) * 4;
        current.data.copy(out.data, d, (y * current.width + x) * 4, (y * current.width + x) * 4 + 4);
      }
    }
    current = out;
  }
  return current;
}

function flipX(png) {
  const out = blank(png.width, png.height);
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      png.data.copy(out.data, (y * png.width + (png.width - 1 - x)) * 4, (y * png.width + x) * 4, (y * png.width + x) * 4 + 4);
    }
  }
  return out;
}

/** Multiplies RGB by `tint` (one factor or [r, g, b]). */
function tintPng(png, tint) {
  const factors = Array.isArray(tint) ? tint : [tint, tint, tint];
  const out = blank(png.width, png.height);
  png.data.copy(out.data);
  for (let p = 0; p < out.data.length; p += 4) {
    for (let c = 0; c < 3; c += 1) out.data[p + c] = Math.min(255, out.data[p + c] * factors[c]);
  }
  return out;
}

const parseHex = (hex) => {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
};

/** How strongly a pixel reads as the magenta key colour (0..1). */
function keyWeight(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 8) return 0;
  const saturation = (max - min) / max;
  let hue;
  const delta = max - min || 1;
  if (max === r) hue = 60 * (((g - b) / delta) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);
  if (hue < 0) hue += 360;
  // The model paints "#FF00FF" anywhere from violet-magenta to hot pink
  // (hue 300-350), so the window is centred on 325.
  const hueWeight = 1 - smooth(Math.min(1, Math.max(0, (Math.abs(hue - 325) - 28) / 12)));
  return hueWeight * smooth(Math.min(1, Math.max(0, (saturation - 0.18) / 0.3)));
}

/**
 * Repaints the magenta key-colour parts of a tile (a potion's liquid, a
 * book's cover, a gem) in `color`, keeping their shading: the key colour's
 * brightness is measured against its median, so a mid-tone becomes `color`,
 * shadows go darker and highlights go toward white.
 */
function recolorKey(png, color) {
  const target = parseHex(color);
  const values = [];
  for (let p = 0; p < png.data.length; p += 4) {
    const w = keyWeight(png.data[p], png.data[p + 1], png.data[p + 2]);
    if (w > 0.8 && png.data[p + 3] > 128) values.push(Math.max(png.data[p], png.data[p + 2]));
  }
  values.sort((a, b) => a - b);
  const median = values[Math.floor(values.length / 2)] || 200;
  const out = blank(png.width, png.height);
  png.data.copy(out.data);
  for (let p = 0; p < out.data.length; p += 4) {
    const r = png.data[p];
    const g = png.data[p + 1];
    const b = png.data[p + 2];
    const w = keyWeight(r, g, b);
    if (w <= 0) continue;
    const shade = Math.max(r, b) / median;
    // Whatever the key colour lost to white (its green channel) is a highlight.
    const lift = g / 255;
    for (let c = 0; c < 3; c += 1) {
      let value = target[c] * shade;
      value += (255 - Math.min(255, value)) * lift;
      const original = png.data[p + c];
      out.data[p + c] = Math.max(0, Math.min(255, Math.round(original + (value - original) * w)));
    }
  }
  return out;
}

// ---------------------------------------------------------------- spec

function loadSpec(options) {
  const file = resolve(options.spec ?? "tools/hires-art/terrain/level1.json");
  const spec = JSON.parse(readFileSync(file, "utf8"));
  const base = dirname(file);
  spec.work = resolve(base, spec.work ?? "../../../.hires-tmp/terrain");
  spec.pack = resolve(base, spec.pack ?? "../../../public/assets/hires/pixelhack-hd");
  spec.pixelhack = resolve(base, spec.pixelhack ?? "../../../.hires-tmp/pixelhack-split");
  const only = options.only ? new Set(String(options.only).split(",")) : null;
  spec.selected = spec.items.filter((item) => !only || only.has(item.name));
  return spec;
}

const rawFile = (spec, name, index = 1) =>
  join(spec.work, index === 1 ? `raw_${name}.png` : `raw_${name}_${index}.png`);

/**
 * A "px_<key>" reference is the PixelHack sprite of obj/<key>. If it is not in
 * the work folder yet it is copied from the `npm run hires:split` output.
 */
function ensureRef(spec, name) {
  const file = rawFile(spec, name);
  if (existsSync(file) || !name.startsWith("px_")) return;
  const source = join(spec.pixelhack, "obj", `${name.slice(3)}.png`);
  if (!existsSync(source)) throw new Error(`${name}: ${source} is missing; run npm run hires:split`);
  writeFileSync(file, readFileSync(source));
}

function promptFor(spec, item) {
  const rules = spec.rules?.[item.kind] ?? "";
  const refs = (item.ref ? [].concat(item.ref) : []);
  const refNote = refs.length && item.refNote ? item.refNote : "";
  return [spec.style, rules, refNote, item.prompt].filter(Boolean).join("\n\n");
}

async function gen(options) {
  const spec = loadSpec(options);
  const apiKey = readApiKey();
  const n = Number.parseInt(options.n ?? "1", 10);
  mkdirSync(spec.work, { recursive: true });
  for (const item of spec.selected) {
    if (item.derive) continue;
    if (!options.force && existsSync(rawFile(spec, item.name))) {
      console.log(`${item.name}: raw image exists, skipped (use --force to repaint)`);
      continue;
    }
    mkdirSync(spec.work, { recursive: true });
    const refs = (item.ref ? [].concat(item.ref) : []).map((name) => {
      const [refName, pick] = name.split("#");
      ensureRef(spec, refName);
      return resample(readPng(rawFile(spec, refName, Number(pick ?? 1))), 1024);
    });
    const prompt = promptFor(spec, item);
    writeFileSync(join(spec.work, `prompt_${item.name}.txt`), prompt);
    const started = Date.now();
    const { images, usage } = await requestImages({
      apiKey,
      model: item.model ?? spec.model ?? "gpt-image-2.5-sunburst",
      quality: item.quality ?? spec.quality ?? "medium",
      prompt, refs, size: 1024, n,
      transparent: item.kind !== "texture",
    });
    images.forEach((png, index) => writePng(rawFile(spec, item.name, index + 1), png));
    console.log(`${item.name}: ${images.length} image(s) in ${((Date.now() - started) / 1000).toFixed(0)} s, tokens ${JSON.stringify(usage ?? {})}`);
  }
}

function processItem(spec, item) {
  const size = item.size ?? spec.size ?? 256;
  const source = item.derive
    ? readPng(join(spec.work, `tile_${item.derive}.png`))
    : readPng(rawFile(spec, item.name, Number(item.pick ?? 1)));
  if (item.derive) return source;
  if (item.kind === "texture") {
    let png = source;
    if (item.flatten) png = flattenLighting(png, item.flatten);
    if (item.seamless) png = makeSeamless(png, item.seamless);
    if (item.relief) png = bakeRelief(png, item.relief);
    return resample(png, size);
  }
  const clean = cleanAlpha(source);
  if (item.fit?.matchRef) {
    ensureRef(spec, item.fit.matchRef);
    const ref = cleanAlpha(readPng(rawFile(spec, item.fit.matchRef)));
    let tile = fitIntoBox(clean, size, mainBounds(ref), ref.width);
    if (item.relief) tile = bakeRelief(tile, item.relief);
    if (item.outline) tile = addOutline(tile, item.outline * size / 256);
    return tile;
  }
  if (item.opacity !== undefined) {
    for (let p = 3; p < clean.data.length; p += 4) clean.data[p] = Math.round(clean.data[p] * item.opacity);
  }
  let tile;
  if (item.kind === "billboard") tile = fitObject(clean, size, item.fit);
  else if (item.kind === "overlay" && item.fit) tile = fitObject(clean, size, { anchor: "center", ...item.fit });
  else tile = resample(clean, size);
  if (item.relief) tile = bakeRelief(tile, item.relief);
  if (item.outline) tile = addOutline(tile, item.outline * size / 256);
  return tile;
}

function build(options) {
  const spec = loadSpec(options);
  for (const item of spec.selected) {
    const tile = processItem(spec, item);
    writePng(join(spec.work, `tile_${item.name}.png`), tile);
    for (const output of item.outputs ?? []) {
      let png = tile;
      if (output.rotate) png = rotate(png, output.rotate);
      if (output.flipX) png = flipX(png);
      if (output.under) png = over(readPng(join(spec.work, `tile_${output.under}.png`)), png);
      if (output.recolor) png = recolorKey(png, output.recolor);
      if (output.tint) png = tintPng(png, output.tint);
      for (const key of [].concat(output.key)) {
        const file = join(spec.pack, key.includes("/") ? `${key}.png` : join("other", `${key}.png`));
        writePng(file, png);
      }
      console.log(`${item.name} -> ${[].concat(output.key).join(", ")}`);
    }
  }
}

const options = parseArgs(process.argv.slice(2));
const command = options._[0];
const commands = { gen, build };
if (!commands[command]) {
  console.error("usage: terrain-gen.mjs gen|build --spec <file> [--only a,b] [--n 2] [--force]");
  process.exitCode = 1;
} else {
  Promise.resolve(commands[command](options)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
