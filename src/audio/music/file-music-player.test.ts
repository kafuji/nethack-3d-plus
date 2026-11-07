import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileMusicPlayer } from "./file-music-player";
import type { MusicTrack } from "./music-library";

class FakeParam {
  readonly targets: number[] = [];
  constructor(public value: number) {}
  cancelScheduledValues(): void {}
  setValueAtTime(): void {}
  linearRampToValueAtTime(): void {}
  setTargetAtTime(value: number): void {
    this.targets.push(value);
  }
}

class FakeNode {
  readonly outputs: FakeNode[] = [];
  readonly gain = new FakeParam(1);
  readonly frequency = new FakeParam(0);
  readonly delayTime = new FakeParam(0);
  readonly pan = new FakeParam(0);
  constructor(readonly kind: string) {}
  connect(target: FakeNode): FakeNode {
    this.outputs.push(target);
    return target;
  }
  disconnect(): void {}
  start(): void {}
  stop(): void {}
}

let contexts: FakeContext[] = [];

class FakeContext {
  readonly currentTime = 0;
  readonly destination = new FakeNode("destination");
  readonly sources: FakeNode[] = [];
  constructor() {
    contexts.push(this);
  }
  createGain = () => new FakeNode("gain");
  createDelay = () => new FakeNode("delay");
  createOscillator = () => new FakeNode("oscillator");
  createWaveShaper = () => new FakeNode("shaper");
  createBiquadFilter = () => new FakeNode("filter");
  createStereoPanner = () => new FakeNode("panner");
  createMediaElementSource = () => {
    const source = new FakeNode("source");
    this.sources.push(source);
    return source;
  };
  close = async () => undefined;
}

class FakeAudio {
  src = "";
  playbackRate = 1;
  play = async () => undefined;
  pause = () => undefined;
  load = () => undefined;
  removeAttribute = () => undefined;
}

const track: MusicTrack = {
  id: "once",
  path: "once.mp3",
  loop: "crossfade",
  gainDb: 6,
  title: "Once",
  author: "",
  license: "",
  source: "",
};

/** Every node after `node`, in order, for a chain with no branches. */
function pathFrom(node: FakeNode): FakeNode[] {
  const next = node.outputs[0];
  expect(node.outputs.length).toBeLessThanOrEqual(1);
  return next ? [next, ...pathFrom(next)] : [];
}

async function startOnce(): Promise<{ player: FileMusicPlayer; path: FakeNode[] }> {
  const player = new FileMusicPlayer({ calm: [], combat: [], danger: [] }, (path) => path);
  player.setVolume(0.5);
  player.playOnce(track);
  await vi.waitFor(() => expect(contexts[0]?.sources.length).toBe(1));
  return { player, path: pathFrom(contexts[0].sources[0]) };
}

describe("FileMusicPlayer.playOnce", () => {
  beforeEach(() => {
    contexts = [];
    vi.stubGlobal("window", { AudioContext: FakeContext });
    vi.stubGlobal("Audio", FakeAudio);
    vi.stubGlobal("fetch", async () => ({ ok: true, blob: async () => new Blob() }));
    vi.stubGlobal("URL", { createObjectURL: () => "blob:once", revokeObjectURL: () => undefined });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("goes straight to the output, past the status effect chain", async () => {
    const { player, path } = await startOnce();
    player.setStatusEffects(["deaf", "hallucinating"]);
    expect(path.map((node) => node.kind)).toEqual(["gain", "gain", "destination"]);
    player.dispose();
  });

  it("applies the track's trim and follows the music volume", async () => {
    const { player, path } = await startOnce();
    const [trim, volume] = path;
    const expected = (level: number) => Math.pow(level, 1.5) * 1.2;
    expect(trim.gain.value).toBeCloseTo(Math.pow(10, 6 / 20));
    expect(volume.gain.value).toBeCloseTo(expected(0.5));
    player.setVolume(0.8);
    expect(volume.gain.targets).toEqual([expected(0.8)]);
    player.dispose();
  });
});
