/**
 * Light sources the hero carries, read from the inventory text the game sends
 * ("a brass lantern (lit)", "2 wax candles (lit)", "the Candelabrum of
 * Invocation (7 candles, lit)", "Sunsword (weapon in hand, lit)").
 */

export type CarriedLightKind = "candle" | "lamp" | "lantern" | "magic" | "sunlight";

export interface CarriedLight {
  readonly kind: CarriedLightKind;
  /** NetHack's light radius in tiles. */
  readonly radius: number;
}

export interface CarriedLightLook {
  /** Linear RGB, before intensity. */
  readonly color: readonly [number, number, number];
  readonly intensity: number;
  /** 0 = steady; 1 = a candle flame. */
  readonly flicker: number;
}

export const CARRIED_LIGHT_LOOKS: Readonly<Record<CarriedLightKind, CarriedLightLook>> = {
  candle: { color: [1.0, 0.6, 0.26], intensity: 0.9, flicker: 1 },
  lamp: { color: [1.0, 0.68, 0.36], intensity: 0.9, flicker: 0.6 },
  lantern: { color: [1.0, 0.82, 0.58], intensity: 0.95, flicker: 0.2 },
  magic: { color: [0.62, 0.78, 1.0], intensity: 0.95, flicker: 0 },
  sunlight: { color: [1.0, 0.93, 0.66], intensity: 1.0, flicker: 0 },
};

/** Order of preference when several lit sources have the same radius. */
const KIND_PRIORITY: readonly CarriedLightKind[] = ["sunlight", "magic", "lantern", "lamp", "candle"];

function isLit(text: string): boolean {
  for (const match of text.matchAll(/\(([^()]*)\)/g)) {
    if (match[1].split(/[,;]/).some((part) => part.trim() === "lit")) {
      return true;
    }
  }
  return false;
}

/** NetHack's candle_light_range. */
function candleRadius(text: string, isCandelabrum: boolean): number {
  if (isCandelabrum) {
    const attached = /\((\d+) candles?/i.exec(text);
    const count = attached ? Number(attached[1]) : 1;
    return count < 4 ? 2 : count < 7 ? 3 : 4;
  }
  const quantity = /^\s*(?:[a-zA-Z$#] - )?(\d+)\s/.exec(text);
  let n = quantity ? Number(quantity[1]) : 1;
  let radius = 1;
  do {
    radius++;
    n = Math.floor(n / 7);
  } while (n > 0);
  return radius;
}

export function classifyCarriedLight(text: string): CarriedLight | null {
  if (!isLit(text)) return null;
  const name = text.toLowerCase();
  if (name.includes("candelabrum")) return { kind: "candle", radius: candleRadius(text, true) };
  if (name.includes("candle")) return { kind: "candle", radius: candleRadius(text, false) };
  if (name.includes("magic lamp")) return { kind: "magic", radius: 1 };
  if (name.includes("lantern")) return { kind: "lantern", radius: 1 };
  if (name.includes("sunsword")) return { kind: "sunlight", radius: 1 };
  // Oil lamps, unidentified "lamp"s, burning potions of oil and anything else lit.
  return { kind: "lamp", radius: 1 };
}

/** The strongest lit light source in an inventory snapshot, if any. */
export function resolveCarriedLight(
  inventory: readonly unknown[] | null | undefined,
): CarriedLight | null {
  let best: CarriedLight | null = null;
  for (const item of inventory ?? []) {
    if (!item || typeof item !== "object") continue;
    const record = item as { text?: unknown; isCategory?: unknown };
    if (record.isCategory === true) continue;
    const light = classifyCarriedLight(String(record.text ?? ""));
    if (!light) continue;
    if (
      !best ||
      light.radius > best.radius ||
      (light.radius === best.radius && KIND_PRIORITY.indexOf(light.kind) < KIND_PRIORITY.indexOf(best.kind))
    ) {
      best = light;
    }
  }
  return best;
}

/**
 * Brightness multiplier for a flame over time: a few incommensurate waves so
 * the pattern never visibly repeats, scaled by how much the source flickers.
 */
export function sampleFlicker(timeSeconds: number, amount: number): number {
  if (amount <= 0) return 1;
  const t = timeSeconds;
  const fast = Math.sin(t * 17.3) * 0.35 + Math.sin(t * 23.9 + 1.7) * 0.25 + Math.sin(t * 31.1 + 4.2) * 0.15;
  const slow = Math.sin(t * 2.1 + 0.4) * 0.6 + Math.sin(t * 3.7 + 2.9) * 0.4;
  return 1 + amount * (fast * 0.08 + slow * 0.06);
}
