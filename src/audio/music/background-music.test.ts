import { describe, expect, it } from "vitest";
import { BackgroundMusic } from "./background-music";
import type { BackgroundMusicPlayer } from "./procedural-music-player";
import type { MusicMood } from "./music-director";

class FakePlayer implements BackgroundMusicPlayer {
  moods: (MusicMood | null)[] = [];
  volume = -1;
  setMood(mood: MusicMood | null): void {
    if (this.moods[this.moods.length - 1] !== mood) this.moods.push(mood);
  }
  setVolume(volume: number): void {
    this.volume = volume;
  }
  async resume(): Promise<void> {}
  async suspend(): Promise<void> {}
  dispose(): void {}
}

const on = { soundEnabled: true, musicEnabled: true, musicVolume: 0.5 };

describe("BackgroundMusic", () => {
  it("stays silent until stats arrive, then plays calm", () => {
    const player = new FakePlayer();
    let now = 0;
    const music = new BackgroundMusic(player, () => now);
    music.setSettings(on);
    expect(player.moods).toEqual([null]);
    music.notifyPlayerStats({ hp: 10, maxHp: 10, time: 1 }, false);
    expect(player.moods).toEqual([null, "calm"]);
    music.dispose();
  });

  it("goes combat on combat activity and silent on game over", () => {
    const player = new FakePlayer();
    const music = new BackgroundMusic(player, () => 1000);
    music.setSettings(on);
    music.notifyPlayerStats({ hp: 10, maxHp: 10, time: 1 }, false);
    music.notifyCombatActivity();
    music.setGameOver(true);
    expect(player.moods).toEqual([null, "calm", "combat", null]);
    music.dispose();
  });

  it("is silent when music or sound is disabled", () => {
    const player = new FakePlayer();
    const music = new BackgroundMusic(player, () => 0);
    music.setSettings({ ...on, musicEnabled: false });
    music.notifyPlayerStats({ hp: 10, maxHp: 10, time: 1 }, true);
    expect(player.moods).toEqual([null]);
    music.setSettings(on);
    expect(player.moods).toEqual([null, "danger"]);
    music.dispose();
  });
});
