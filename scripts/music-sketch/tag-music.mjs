// Usage: node scripts/music-sketch/tag-music.mjs
// Sets the title, artist, album and copyright of every bundled MP3 of the
// Takachiho music pack and its copy in music-sketches/, with titles from
// src/audio/music/packs/takachiho.ts. Run it after adding a track, since Suno
// names the track after the uploaded file.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTextFrames } from "./id3.mjs";
// The pack file itself, not music-pack.ts: Node needs file extensions on imports.
import { takachihoMusicPack as pack } from "../../src/audio/music/packs/takachiho.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const tracks = [...Object.values(pack.library).flat(), pack.titleTrack, pack.ascensionTrack].filter(Boolean);

function sketchCopy(track) {
  // The ascension track is a Cover of the title piece, but has its own folder.
  const folder = track === pack.ascensionTrack ? track.id : basename(track.source, ".mjs");
  return resolve(projectRoot, "music-sketches", folder, `${folder}.mp3`);
}

for (const track of tracks) {
  const tags = {
    TIT2: track.title,
    TPE1: "Kafuji, using Suno",
    TALB: "NetHack 3D Sound Track (Kafuji Set)",
    TCOP: "Kafuji Sato",
  };
  for (const path of [resolve(projectRoot, "public", track.path), sketchCopy(track)]) {
    if (!existsSync(path)) continue;
    writeFileSync(path, setTextFrames(readFileSync(path), tags));
    console.log(`${relative(projectRoot, path)}: ${track.title}`);
  }
}
