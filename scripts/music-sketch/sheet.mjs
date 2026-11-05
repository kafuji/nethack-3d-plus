// Writes a self-contained piano-roll page for a piece. It plays the preview with
// a moving playhead, and clicking a note or a bar number adds a reference to a
// list that can be pasted into a request, so everyone means the same note.

const PALETTE = ["#e8a33d", "#5aa9e6", "#e4572e", "#76b041", "#c77dff", "#2ec4b6", "#ff7aa2", "#b8b08d", "#8ecae6", "#f4d35e", "#9d8df1", "#ef8354", "#7bd389"];

const NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

export function pitchName(pitch) {
  return `${NOTE_NAMES[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
}

/** Notes per track with the bar, beat and position in the bar that the page shows. */
export function sheetNotes(piece) {
  return piece.tracks.map((track) => {
    const counts = new Map();
    const sorted = [...track.notes].sort((a, b) => a.start - b.start || b.pitch - a.pitch);
    return sorted.map((note) => {
      const bar = Math.floor(note.start / piece.beatsPerBar + 1e-6) + 1;
      const index = (counts.get(bar) ?? 0) + 1;
      counts.set(bar, index);
      const beat = Math.round((note.start - (bar - 1) * piece.beatsPerBar + 1) * 1000) / 1000;
      return { start: note.start, dur: note.dur, pitch: note.pitch, vel: note.vel, bar, beat, index, name: pitchName(note.pitch) };
    });
  });
}

export function renderSheet(piece, audioFile) {
  const data = {
    name: piece.name,
    key: piece.key,
    bpm: piece.bpm,
    beatsPerBar: piece.beatsPerBar,
    bars: piece.bars,
    sections: piece.sections ?? [],
    audioFile,
    tracks: piece.tracks.map((track, i) => ({
      name: track.name,
      drums: track.channel === 9,
      color: PALETTE[i % PALETTE.length],
    })),
    notes: sheetNotes(piece),
  };
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(piece.id)} sheet</title>
<style>
:root { --bg: #15161a; --panel: #1f2127; --line: #34373f; --bar: #565a66; --text: #e6e6e6; --muted: #9a9ea8; --accent: #f2c14e; }
* { box-sizing: border-box; }
body { margin: 0; padding: 16px; background: var(--bg); color: var(--text); font: 14px/1.5 system-ui, "Segoe UI", "Hiragino Sans", "Yu Gothic UI", sans-serif; }
h1 { margin: 0; font-size: 18px; }
.meta { color: var(--muted); margin-bottom: 10px; }
audio { width: 100%; height: 36px; margin-bottom: 8px; }
.legend { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.legend button { font: inherit; padding: 2px 10px; color: var(--text); background: var(--panel); border: 1px solid var(--line); border-radius: 12px; cursor: pointer; }
.legend button.off { opacity: .4; text-decoration: line-through; }
.legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 6px; }
#scroll { overflow-x: auto; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; }
svg { display: block; }
svg text { font: 11px system-ui, sans-serif; fill: var(--muted); user-select: none; }
.bar-label { cursor: pointer; fill: var(--text); }
.bar-label:hover { fill: var(--accent); }
.section-label { fill: var(--accent); font-weight: 600; }
.note { cursor: pointer; }
.note:hover { stroke: #fff; stroke-width: 1.5; }
.note.picked { stroke: #fff; stroke-width: 2; }
#tip { position: fixed; pointer-events: none; display: none; padding: 3px 8px; background: #000; color: #fff; border-radius: 4px; font-size: 12px; z-index: 2; }
.list { margin-top: 12px; }
.list label { display: block; color: var(--muted); margin-bottom: 4px; }
textarea { width: 100%; height: 130px; padding: 8px; font: 13px/1.5 ui-monospace, Consolas, monospace; color: var(--text); background: var(--panel); border: 1px solid var(--line); border-radius: 6px; }
.actions { display: flex; gap: 8px; margin-top: 6px; }
.actions button { font: inherit; padding: 4px 14px; color: var(--text); background: var(--panel); border: 1px solid var(--line); border-radius: 6px; cursor: pointer; }
</style>
</head>
<body>
<h1 id="title"></h1>
<div class="meta" id="meta"></div>
<audio id="audio" controls preload="metadata"></audio>
<div class="legend" id="legend"></div>
<div id="scroll"></div>
<div id="tip"></div>
<div class="list">
  <label for="out">音符や小節番号をクリックすると、ここに追加されます。指示を書き足してチャットに貼ってください。空いている場所をクリックするとそこから再生します。</label>
  <textarea id="out"></textarea>
  <div class="actions"><button id="copy">コピー</button><button id="clear">クリア</button></div>
</div>
<script>
const DATA = ${json};
const BEAT_WIDTH = Math.max(14, 48 / (DATA.beatsPerBar > 4 ? 2 : 1));
const ROW = 7;
const DRUM_ROW = 12;
const TOP = 40;
const LEFT = 42;
const hidden = new Set(DATA.tracks.flatMap((t, i) => (t.drums ? [i] : [])));
const picked = new Set();
const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
const secondsPerBeat = 60 / DATA.bpm;

$("title").textContent = DATA.name;
$("meta").textContent = DATA.key + " / " + DATA.bpm + " BPM / " + DATA.beatsPerBar + "拍子 / " + DATA.bars + "小節";
$("audio").src = DATA.audioFile;

function el(name, attrs, parent, text) {
  const node = document.createElementNS(NS, name);
  for (const key in attrs) node.setAttribute(key, attrs[key]);
  if (text !== undefined) node.textContent = text;
  parent.appendChild(node);
  return node;
}

function append(line) {
  const out = $("out");
  out.value += (out.value && !out.value.endsWith("\\n") ? "\\n" : "") + line + "\\n";
  out.scrollTop = out.scrollHeight;
}

function draw() {
  const melodic = DATA.notes.flatMap((notes, i) => (DATA.tracks[i].drums || hidden.has(i) ? [] : notes));
  const low = melodic.length ? Math.min(...melodic.map((n) => n.pitch)) - 1 : 48;
  const high = melodic.length ? Math.max(...melodic.map((n) => n.pitch)) + 1 : 72;
  const drumTracks = DATA.tracks.flatMap((t, i) => (t.drums && !hidden.has(i) ? [i] : []));
  const drumPitches = [...new Set(drumTracks.flatMap((i) => DATA.notes[i].map((n) => n.pitch)))].sort((a, b) => b - a);
  const rollHeight = (high - low + 1) * ROW;
  const drumTop = TOP + rollHeight + (drumPitches.length ? 8 : 0);
  const height = drumTop + drumPitches.length * DRUM_ROW + 10;
  const beats = DATA.bars * DATA.beatsPerBar;
  const width = LEFT + beats * BEAT_WIDTH + 20;
  const x = (beat) => LEFT + beat * BEAT_WIDTH;
  const y = (pitch) => TOP + (high - pitch) * ROW;

  const scroll = $("scroll");
  const keep = scroll.scrollLeft;
  scroll.innerHTML = "";
  const svg = el("svg", { width, height }, scroll);
  el("rect", { x: 0, y: 0, width, height, fill: "transparent", "data-seek": 1 }, svg);

  DATA.sections.forEach((section, i) => {
    const sx = x((section.bars[0] - 1) * DATA.beatsPerBar);
    const ex = x(section.bars[1] * DATA.beatsPerBar);
    if (i % 2) el("rect", { x: sx, y: 0, width: ex - sx, height, fill: "#ffffff08", "data-seek": 1 }, svg);
    el("text", { x: sx + 4, y: 13, class: "section-label" }, svg, section.name);
  });

  for (let pitch = low; pitch <= high; pitch++) {
    if (pitch % 12 === 0) {
      el("line", { x1: LEFT, x2: width, y1: y(pitch) + ROW, y2: y(pitch) + ROW, stroke: "#34373f" }, svg);
      el("text", { x: 4, y: y(pitch) + ROW }, svg, "C" + (pitch / 12 - 1));
    }
  }

  for (let bar = 1; bar <= DATA.bars; bar++) {
    const bx = x((bar - 1) * DATA.beatsPerBar);
    el("line", { x1: bx, x2: bx, y1: 18, y2: height, stroke: "#565a66" }, svg);
    for (let beat = 1; beat < DATA.beatsPerBar; beat++) {
      el("line", { x1: bx + beat * BEAT_WIDTH, x2: bx + beat * BEAT_WIDTH, y1: TOP, y2: height, stroke: "#ffffff0d" }, svg);
    }
    el("text", { x: bx + 3, y: 30, class: "bar-label", "data-bar": bar }, svg, bar);
  }

  DATA.notes.forEach((notes, trackIndex) => {
    const track = DATA.tracks[trackIndex];
    if (hidden.has(trackIndex)) return;
    notes.forEach((note, noteIndex) => {
      const key = trackIndex + ":" + noteIndex;
      const noteY = track.drums ? drumTop + drumPitches.indexOf(note.pitch) * DRUM_ROW : y(note.pitch);
      el("rect", {
        x: x(note.start),
        y: noteY,
        width: Math.max(2, note.dur * BEAT_WIDTH - 1),
        height: (track.drums ? DRUM_ROW : ROW) - 1,
        rx: 1,
        fill: track.color,
        "fill-opacity": 0.45 + (note.vel / 127) * 0.55,
        class: "note" + (picked.has(key) ? " picked" : ""),
        "data-note": key,
      }, svg);
    });
  });

  el("line", { id: "playhead", x1: LEFT, x2: LEFT, y1: 18, y2: height, stroke: "#f2c14e", "stroke-width": 1.5, "pointer-events": "none" }, svg);
  scroll.scrollLeft = keep;
  const playhead = () => {
    const px = x($("audio").currentTime / secondsPerBeat);
    const line = $("playhead");
    if (line) { line.setAttribute("x1", px); line.setAttribute("x2", px); }
  };
  playhead();

  svg.onclick = (event) => {
    const target = event.target;
    if (target.dataset.note) {
      const [t, n] = target.dataset.note.split(":").map(Number);
      const note = DATA.notes[t][n];
      picked.add(target.dataset.note);
      target.classList.add("picked");
      append(describe(t, note) + ": ");
    } else if (target.dataset.bar) {
      append(target.dataset.bar + "小節目: ");
    } else {
      const rect = svg.getBoundingClientRect();
      const beat = (event.clientX - rect.left - LEFT) / BEAT_WIDTH;
      if (beat >= 0) { $("audio").currentTime = beat * secondsPerBeat; $("audio").play(); }
    }
  };
  svg.onmousemove = (event) => {
    const tip = $("tip");
    const key = event.target.dataset.note;
    if (!key) { tip.style.display = "none"; return; }
    const [t, n] = key.split(":").map(Number);
    tip.textContent = describe(t, DATA.notes[t][n]);
    tip.style.display = "block";
    tip.style.left = Math.min(event.clientX + 12, innerWidth - 300) + "px";
    tip.style.top = event.clientY + 14 + "px";
  };
  svg.onmouseleave = () => { $("tip").style.display = "none"; };
}

function describe(trackIndex, note) {
  return note.bar + "小節目 " + DATA.tracks[trackIndex].name + " " + note.index + "音目 (" + note.beat + "拍目, " + note.name + ")";
}

DATA.tracks.forEach((track, i) => {
  const button = document.createElement("button");
  button.innerHTML = '<i style="background:' + track.color + '"></i>';
  button.append(track.name);
  button.className = hidden.has(i) ? "off" : "";
  button.onclick = () => {
    if (hidden.has(i)) hidden.delete(i); else hidden.add(i);
    button.className = hidden.has(i) ? "off" : "";
    draw();
  };
  $("legend").appendChild(button);
});

$("audio").addEventListener("timeupdate", () => {
  const line = $("playhead");
  if (!line) return;
  const px = LEFT + ($("audio").currentTime / secondsPerBeat) * BEAT_WIDTH;
  line.setAttribute("x1", px);
  line.setAttribute("x2", px);
  const scroll = $("scroll");
  if (!$("audio").paused && (px < scroll.scrollLeft || px > scroll.scrollLeft + scroll.clientWidth - 40)) {
    scroll.scrollLeft = px - 60;
  }
});
$("copy").onclick = () => {
  const out = $("out");
  if (navigator.clipboard) navigator.clipboard.writeText(out.value).catch(() => { out.select(); document.execCommand("copy"); });
  else { out.select(); document.execCommand("copy"); }
};
$("clear").onclick = () => { $("out").value = ""; picked.clear(); draw(); };
draw();
</script>
</body>
</html>
`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
