# High-resolution tile packs

A high-resolution pack replaces NetHack 5 tiles one file at a time. Each tile
is its own PNG or WebP, named by a stable tile key rather than a tile number.
Tiles a pack does not provide keep coming from the selected atlas, so a pack
can be filled in gradually and at any resolution. Different tiles in one pack
may even use different sizes.

The pack is shown when **Use high-resolution tiles** is on, the display mode
is Tiles, the game is NetHack 5, and the tileset is not Vulture.

## Layout

```
public/assets/hires/pixelhack-hd/
  manifest.json            written by `npm run hires:manifest`
  mon/giant_ant_male.png
  obj/long_sword.png
  other/fountain.png       a strip of 4 frames is 4 × width wide
  statue/giant_ant_male.png
```

Tile keys live in `src/game/hires-tiles/tile-keys.5.generated.ts`, indexed by
runtime tile number. They come from NetHack's `win/share/*.txt` (copied to
`imported/nethack-5.0/win-share/` at the commit the bundled runtime is built
from). Regenerate them with `npm run hires:tile-keys` after a NetHack update.

- Object keys combine appearance and identity, for example
  `obj/wire__invisibility`.
- A repeated name gets a `.2` suffix in source order. Lycanthropes come in
  animal form first, then human form (`mon/wererat_male.2`).
- Tiles after the statues are `extra/<n>` atlas cells that are not tied to a
  NetHack tile.

Images must carry real alpha. No background colour is removed from pack files.

## Workflow

1. `npm run hires:split -- --scale 4 --only mon/giant_ant,other/fountain`
   writes nearest-neighbour upscales of the PixelHack cells to
   `.hires-tmp/pixelhack-split/` (git-ignored). Monsters, objects, statues,
   traps, zaps, explosions and warnings get a transparent background; terrain
   stays opaque. Leave out `--only` to split every tile.
2. Redraw the tiles you want and copy them into the pack, keeping the file
   names.
3. `npm run hires:manifest` scans the pack and rewrites `manifest.json`.
   Per-tile `fps`, `loop` and `filter` values already in the manifest are kept.

## Manifest

```json
{
  "format": 1,
  "label": "PixelHack HD (prototype)",
  "layout": "5.0",
  "filter": "linear",
  "tiles": {
    "other/fountain": {
      "file": "other/fountain.png",
      "width": 128, "height": 128,
      "frames": 4, "fps": 6, "loop": "loop"
    }
  }
}
```

- `filter` can be `linear` (smooth, with mipmaps) or `nearest` (sharp pixels).
  It can be set for the whole pack or per tile.
- `frames`, `fps` and `loop` (`loop`, `pingpong` or `once`) are read now.
  Playback is not implemented yet: only the first frame is shown.

## Current limits

- The pack loads all of its files when it is enabled. That is fine for
  prototypes; a full pack should move to on-demand loading.
- A texture containing a high-resolution tile is built at that tile's size.
  Atlas art drawn into it (for example an atlas item on a high-resolution
  floor) is upscaled.
- Tiles are still drawn into a single canvas texture per map cell, as before.
  Separating floor, item and monster layers comes later.
