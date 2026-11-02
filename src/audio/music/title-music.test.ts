import { describe, expect, it } from "vitest";
import { TitleMusic } from "./title-music";
import type { BackgroundMusicPlayer } from "./procedural-music-player";
import type { MusicMood } from "./music-director";

class FakePlayer implements BackgroundMusicPlayer {
  moods: (MusicMood | null)[] = [];
  volume = -1;
  resumes = 0;
  setMood(mood: MusicMood | null): void {
    if (this.moods[this.moods.length - 1] !== mood) this.moods.push(mood);
  }
  setVolume(volume: number): void {
    this.volume = volume;
  }
  async resume(): Promise<void> {
    this.resumes += 1;
  }
  async suspend(): Promise<void> {}
  dispose(): void {}
}

const on = { soundEnabled: true, musicEnabled: true, musicVolume: 0.5 };

describe("TitleMusic", () => {
  it("plays only while the title screen is active", () => {
    const player = new FakePlayer();
    const music = new TitleMusic(player);
    music.setSettings(on);
    expect(player.moods).toEqual([null]);
    music.setActive(true);
    expect(player.moods).toEqual([null, "calm"]);
    music.setActive(false);
    expect(player.moods).toEqual([null, "calm", null]);
  });

  it("respects the music settings", () => {
    const player = new FakePlayer();
    const music = new TitleMusic(player);
    music.setActive(true);
    music.setSettings({ ...on, musicEnabled: false });
    expect(player.moods[player.moods.length - 1]).toBeNull();
    music.setSettings({ ...on, musicVolume: 0.8 });
    expect(player.moods[player.moods.length - 1]).toBe("calm");
    expect(player.volume).toBe(0.8);
    music.setSettings({ ...on, soundEnabled: false });
    expect(player.moods[player.moods.length - 1]).toBeNull();
  });

  it("resumes on a user gesture only while playing", () => {
    const player = new FakePlayer();
    const music = new TitleMusic(player);
    music.resumeFromUserGesture();
    expect(player.resumes).toBe(0);
    music.setActive(true);
    const before = player.resumes;
    music.resumeFromUserGesture();
    expect(player.resumes).toBe(before + 1);
  });
});
