import { describe, expect, it, vi } from "vitest";
import { GLYPH_CATALOG } from "../glyphs/glyph-catalog.5.generated";
import { HiResTilePack } from "./hires-tile-pack";
import { parseHiResTileManifest } from "./manifest";
import { HIRES_TERRAIN_STYLE_TILE_KEYS, resolveHiResTerrainStyle } from "./terrain-styles";
import { NH5_TILE_KEYS } from "./tile-keys.5.generated";

const manifest = (tiles: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  format: 1, label: "Test", layout: "5.0", filter: "linear", tiles, ...extra,
});

describe("NetHack 5 tile keys", () => {
  it("cover every atlas cell with unique keys in runtime tile order", () => {
    expect(NH5_TILE_KEYS).toHaveLength(40 * 58);
    expect(new Set(NH5_TILE_KEYS).size).toBe(NH5_TILE_KEYS.length);
    expect(NH5_TILE_KEYS[0]).toBe("mon/giant_ant_male");
    expect(NH5_TILE_KEYS[788]).toBe("mon/invisible_monster_nogender");
    expect(NH5_TILE_KEYS[1515]).toBe("statue/giant_ant_male");
    expect(NH5_TILE_KEYS[2304]).toBe("extra/2304");
  });

  it("agree with the tile category of every glyph in the bundled runtime", () => {
    const expectedCategory: Record<string, string> = {
      mon: "mon", pet: "mon", detect: "mon", ridden: "mon", invis: "mon",
      body: "obj", obj: "obj", statue: "statue",
      cmap: "other", zap: "other", swallow: "other", explode: "other",
      warning: "other", unexplored: "other", nothing: "other",
    };
    const mismatches = GLYPH_CATALOG.filter((entry) => {
      const category = expectedCategory[entry.kind];
      return category !== undefined && entry.tileIndex >= 0 &&
        !NH5_TILE_KEYS[entry.tileIndex]?.startsWith(`${category}/`);
    });
    expect(mismatches).toEqual([]);
    expect(NH5_TILE_KEYS[789]).toBe("obj/strange_object");
    expect(NH5_TILE_KEYS[1272]).toBe("other/stone");
  });
});

describe("resolveHiResTerrainStyle", () => {
  it("uses the Mines style in the Gnomish Mines only", () => {
    expect(resolveHiResTerrainStyle({ branchTag: "mines", dungeonName: null })).toBe("mines");
    expect(resolveHiResTerrainStyle({ branchTag: null, dungeonName: "The Gnomish Mines" })).toBe("mines");
    expect(resolveHiResTerrainStyle({ branchTag: "dungeons_of_doom", dungeonName: "The Dungeons of Doom" })).toBeNull();
    expect(resolveHiResTerrainStyle(null)).toBeNull();
  });

  it("replaces only tiles that exist", () => {
    for (const replacements of Object.values(HIRES_TERRAIN_STYLE_TILE_KEYS)) {
      for (const tileKey of Object.keys(replacements)) {
        expect(NH5_TILE_KEYS).toContain(tileKey);
      }
    }
  });
});

describe("parseHiResTileManifest", () => {
  it("fills defaults and drops entries with unsafe paths", () => {
    const parsed = parseHiResTileManifest(manifest({
      "mon/giant_ant_male": { file: "mon/giant_ant_male.png", width: 128, height: 128 },
      "other/fountain": { file: "other/fountain.webp", width: 96, height: 96, frames: 4, fps: 6, loop: "pingpong", filter: "nearest" },
      "obj/long_sword": { file: "../secret.png" },
      "obj/dagger": { file: "https://example.com/dagger.png" },
    }));
    expect([...parsed.tiles.keys()]).toEqual(["mon/giant_ant_male", "other/fountain"]);
    expect(parsed.tiles.get("mon/giant_ant_male")).toMatchObject({ frames: 1, fps: 0, loop: "loop", filter: "linear" });
    expect(parsed.tiles.get("other/fountain")).toMatchObject({ frames: 4, fps: 6, loop: "pingpong", filter: "nearest" });
  });

  it("rejects unknown formats and layouts", () => {
    expect(() => parseHiResTileManifest(manifest({}, { format: 2 }))).toThrow(/format/);
    expect(() => parseHiResTileManifest(manifest({}, { layout: "3.6.7" }))).toThrow(/layout/);
  });
});

describe("HiResTilePack", () => {
  it("serves loaded tiles by runtime index and falls back for the rest", async () => {
    const onTilesReady = vi.fn();
    const images = new Map<string, HTMLImageElement>([
      ["assets/pack/mon/giant_ant_male.png", { width: 128, height: 128 } as HTMLImageElement],
      ["assets/pack/other/fountain.png", { width: 384, height: 96 } as HTMLImageElement],
    ]);
    const pack = new HiResTilePack({
      manifestUrl: "assets/pack/manifest.json",
      onTilesReady,
      fetchJson: async () => manifest({
        "mon/giant_ant_male": { file: "mon/giant_ant_male.png" },
        "other/fountain": { file: "other/fountain.png", frames: 4, fps: 6 },
        "obj/long_sword": { file: "obj/long_sword.png" },
        "not/a_tile": { file: "not/a_tile.png" },
      }),
      loadImage: async (url) => {
        const image = images.get(url);
        if (!image) throw new Error(`missing ${url}`);
        return image;
      },
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await pack.load();

    expect(onTilesReady).toHaveBeenCalledOnce();
    expect(pack.loadedTileCount).toBe(2);
    expect(pack.getTile(0)).toMatchObject({ key: "mon/giant_ant_male", width: 128, height: 128, frames: 1 });
    const fountain = NH5_TILE_KEYS.indexOf("other/fountain");
    expect(pack.getTile(fountain)).toMatchObject({ sx: 0, sy: 0, width: 96, height: 96, frames: 4 });
    expect(pack.getTile(NH5_TILE_KEYS.indexOf("obj/long_sword"))).toBeNull();
    expect(pack.getTile(1)).toBeNull();
    expect(pack.getTile(-1)).toBeNull();
  });

  it("draws a terrain style's own tiles where the pack has them", async () => {
    const images = new Map<string, HTMLImageElement>([
      ["p/other/floor_of_a_room.png", { width: 64, height: 64 } as HTMLImageElement],
      ["p/other/dark_part_of_a_room.png", { width: 64, height: 64 } as HTMLImageElement],
      ["p/other/mines_floor_of_a_room.png", { width: 256, height: 256 } as HTMLImageElement],
    ]);
    const pack = new HiResTilePack({
      manifestUrl: "p/manifest.json",
      onTilesReady: () => {},
      fetchJson: async () => manifest({
        "other/floor_of_a_room": { file: "other/floor_of_a_room.png" },
        "other/dark_part_of_a_room": { file: "other/dark_part_of_a_room.png" },
        "other/mines_floor_of_a_room": { file: "other/mines_floor_of_a_room.png" },
      }),
      loadImage: async (url) => images.get(url)!,
    });
    await pack.load();

    const floor = NH5_TILE_KEYS.indexOf("other/floor_of_a_room");
    const darkFloor = NH5_TILE_KEYS.indexOf("other/dark_part_of_a_room");
    expect(pack.getTile(floor)).toMatchObject({ key: "other/floor_of_a_room", width: 64 });
    expect(pack.getTile(floor, "mines")).toMatchObject({ key: "other/mines_floor_of_a_room", width: 256 });
    // No Mines version of the dark floor in this pack: the plain one is used.
    expect(pack.getTile(darkFloor, "mines")).toMatchObject({ key: "other/dark_part_of_a_room" });
    expect(pack.getTile(0, "mines")).toBeNull();
  });

  it("stops notifying once disposed", async () => {
    const onTilesReady = vi.fn();
    let release!: () => void;
    const pack = new HiResTilePack({
      manifestUrl: "m.json",
      onTilesReady,
      fetchJson: () => new Promise((resolve) => { release = () => resolve(manifest({})); }),
    });
    const loading = pack.load();
    pack.dispose();
    release();
    await loading;
    expect(onTilesReady).not.toHaveBeenCalled();
  });
});
