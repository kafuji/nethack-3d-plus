import { describe, expect, it } from "vitest";
import { BackgroundMusic } from "./background-music";
import type { BackgroundMusicPlayer } from "./procedural-music-player";
import type { MusicMood } from "./music-director";
import type { TrackPreference } from "./music-region";
import type { MusicStinger } from "./stingers";
import type { MusicStatusEffect } from "./status-effects";

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
  preferences: TrackPreference[] = [];
  stingers: MusicStinger[] = [];
  effects: (readonly MusicStatusEffect[])[] = [];
  setStatusEffects(effects: readonly MusicStatusEffect[]): void {
    this.effects.push(effects);
  }
  setTrackPreference(preference: TrackPreference): void {
    this.preferences.push(preference);
  }
  playStinger(kind: MusicStinger): void {
    this.stingers.push(kind);
  }
  played: string[] = [];
  stoppedOnce = 0;
  playOnce(track: { id: string }): void {
    this.played.push(track.id);
  }
  stopOnce(): void {
    this.stoppedOnce += 1;
  }
}

const on = { soundEnabled: true, musicPack: "takachiho", musicVolume: 0.5 };

describe("BackgroundMusic", () => {
  it("stays silent until stats arrive, then plays calm", () => {
    const player = new FakePlayer();
    let now = 0;
    const music = new BackgroundMusic(() => player, () => now);
    music.setSettings(on);
    expect(player.moods).toEqual([null]);
    music.notifyPlayerStats({ hp: 10, maxHp: 10, time: 1 }, false);
    expect(player.moods).toEqual([null, "calm"]);
    music.dispose();
  });

  it("goes combat on combat activity and silent on game over", () => {
    const player = new FakePlayer();
    const music = new BackgroundMusic(() => player, () => 1000);
    music.setSettings(on);
    music.notifyPlayerStats({ hp: 10, maxHp: 10, time: 1 }, false);
    music.notifyCombatActivity();
    music.setGameOver(true);
    expect(player.moods).toEqual([null, "calm", "combat", null]);
    music.dispose();
  });

  it("is silent when sound is disabled", () => {
    const player = new FakePlayer();
    const music = new BackgroundMusic(() => player, () => 0);
    music.setSettings({ ...on, soundEnabled: false });
    music.notifyPlayerStats({ hp: 10, maxHp: 10, time: 1 }, true);
    expect(player.moods).toEqual([null]);
    music.setSettings(on);
    expect(player.moods).toEqual([null, "danger"]);
    music.dispose();
  });

  it("makes no player for the pack \"none\" and replaces it when the pack changes", () => {
    const made: string[] = [];
    const players: FakePlayer[] = [];
    const disposed: FakePlayer[] = [];
    const music = new BackgroundMusic((pack) => {
      made.push(pack.id);
      const player = new FakePlayer();
      player.dispose = () => void disposed.push(player);
      players.push(player);
      return player;
    }, () => 0);
    music.setSettings({ ...on, musicPack: "none" });
    music.notifyPlayerStats({ hp: 10, maxHp: 10, time: 1, dungeon: "The Gnomish Mines" }, false);
    expect(made).toEqual([]);
    expect(music.getMusicPack()).toBeNull();
    music.setSettings(on);
    expect(made).toEqual(["takachiho"]);
    // The new player starts with the current region's tracks and plays at once.
    expect(players[0].preferences[0]?.calm).toEqual(["mines"]);
    expect(players[0].moods[players[0].moods.length - 1]).toBe("calm");
    music.setSettings({ ...on, musicVolume: 0.7 });
    expect(made).toEqual(["takachiho"]);
    music.setSettings({ ...on, musicPack: "none" });
    expect(disposed).toEqual([players[0]]);
    // An ascension with no pack is silent.
    music.notifyAscension();
    expect(players[0].played).toEqual([]);
    music.dispose();
  });

  it("prefers regional tracks and plays a cue when entering a new branch", () => {
    const player = new FakePlayer();
    const music = new BackgroundMusic(() => player, () => 0);
    music.setSettings(on);
    music.notifyPlayerStats({ hp: 10, maxHp: 10, time: 1, dungeon: "The Dungeons of Doom" }, false);
    expect(music.getCurrentRegion()).toBe("dungeon");
    expect(player.stingers).toEqual([]);
    music.notifyPlayerStats({ hp: 10, maxHp: 10, time: 50, dungeon: "The Gnomish Mines" }, false);
    expect(music.getCurrentRegion()).toBe("mines");
    expect(player.preferences[player.preferences.length - 1]?.calm?.[0]).toBe("mines");
    expect(player.stingers).toEqual(["region-enter"]);
    music.dispose();
  });

  it("switches to Medusa's and the Castle's tracks inside the Dungeons of Doom", () => {
    const player = new FakePlayer();
    const music = new BackgroundMusic(() => player, () => 0);
    music.setSettings(on);
    const doom = { hp: 10, maxHp: 10, dungeon: "The Dungeons of Doom" };
    music.notifyPlayerStats({ ...doom, time: 1 }, false);
    music.notifyPlayerStats({ ...doom, time: 2, specialLevel: "medusa" }, false);
    expect(music.getCurrentRegion()).toBe("medusa");
    expect(player.preferences[player.preferences.length - 1]?.calm).toEqual(["medusa"]);
    music.notifyPlayerStats({ ...doom, time: 3, specialLevel: "castle" }, false);
    expect(music.getCurrentRegion()).toBe("castle");
    expect(player.preferences[player.preferences.length - 1]?.combat).toEqual(["combat-boss"]);
    expect(player.stingers).toEqual(["region-enter", "region-enter"]);
    // Climbing back to an ordinary level returns to the dungeon without a cue.
    music.notifyPlayerStats({ ...doom, time: 4, specialLevel: null }, false);
    expect(music.getCurrentRegion()).toBe("dungeon");
    expect(player.stingers).toEqual(["region-enter", "region-enter"]);
    music.dispose();
  });

  it("plays the ascension track once in place of the moods and the game-over cue", () => {
    const player = new FakePlayer();
    const music = new BackgroundMusic(() => player, () => 0);
    music.setSettings(on);
    music.notifyPlayerStats({ hp: 10, maxHp: 10, time: 1 }, false);
    music.notifyGameMessage("You hear a door open.");
    expect(player.played).toEqual([]);
    music.notifyGameMessage("An invisible choir sings, and you are bathed in radiance...");
    music.notifyGameMessage("ascended");
    expect(player.played).toEqual(["ascension"]);
    expect(player.moods[player.moods.length - 1]).toBeNull();
    music.setGameOver(true);
    expect(player.stingers).toEqual([]);
    music.reset();
    expect(player.stoppedOnce).toBe(1);
    music.dispose();
  });

  it("does not start the ascension track while music is off", () => {
    const player = new FakePlayer();
    const music = new BackgroundMusic(() => player, () => 0);
    music.setSettings({ ...on, musicPack: "none" });
    music.notifyAscension();
    expect(player.played).toEqual([]);
    music.dispose();
  });

  it("plays the game-over cue once", () => {
    const player = new FakePlayer();
    const music = new BackgroundMusic(() => player, () => 0);
    music.setSettings(on);
    music.notifyPlayerStats({ hp: 0, maxHp: 10, time: 9 }, false);
    music.setGameOver(true);
    music.setGameOver(true);
    expect(player.stingers).toEqual(["game-over"]);
    music.dispose();
  });

  it("plays the Wizard's track over every mood while he is about, and a while after", () => {
    const player = new FakePlayer();
    let now = 0;
    const music = new BackgroundMusic(() => player, () => now);
    music.setSettings(on);
    music.notifyPlayerStats({ hp: 10, maxHp: 10, time: 1, dungeon: "The Dungeons of Doom" }, false);
    expect(player.moods).toEqual([null, "calm"]);
    music.notifyWizardPresence(true);
    expect(music.isWizardPanic()).toBe(true);
    expect(player.moods[player.moods.length - 1]).toBe("combat");
    expect(player.preferences[player.preferences.length - 1]).toEqual({ calm: ["dungeon"], combat: ["wizard"] });
    // Low health does not take over from him.
    music.notifyPlayerStats({ hp: 1, maxHp: 10, time: 2, dungeon: "The Dungeons of Doom" }, true);
    expect(player.moods[player.moods.length - 1]).toBe("combat");
    // He teleports away: the panic lingers, then the usual music returns.
    music.notifyPlayerStats({ hp: 10, maxHp: 10, time: 3, dungeon: "The Dungeons of Doom" }, false);
    music.notifyWizardPresence(false);
    now += 5000;
    music.notifyPlayerStats({ hp: 10, maxHp: 10, time: 4, dungeon: "The Dungeons of Doom" }, false);
    expect(music.isWizardPanic()).toBe(true);
    now += 4000;
    music.notifyPlayerStats({ hp: 10, maxHp: 10, time: 5, dungeon: "The Dungeons of Doom" }, false);
    expect(music.isWizardPanic()).toBe(false);
    expect(player.preferences[player.preferences.length - 1]).toEqual({ calm: ["dungeon"], combat: ["combat"] });
    music.dispose();
  });

  it("keeps the Wizard's track when the region changes under him", () => {
    const player = new FakePlayer();
    const music = new BackgroundMusic(() => player, () => 0);
    music.setSettings(on);
    music.notifyWizardPresence(true);
    music.notifyPlayerStats({ hp: 10, maxHp: 10, time: 1, dungeon: "Gehennom" }, false);
    expect(player.preferences[player.preferences.length - 1]).toEqual({ calm: ["gehennom"], combat: ["wizard"] });
    music.reset();
    expect(music.isWizardPanic()).toBe(false);
    music.dispose();
  });

  it("forwards status effects only when they change", () => {
    const player = new FakePlayer();
    const music = new BackgroundMusic(() => player, () => 0);
    music.setSettings(on);
    music.notifyPlayerStats({ hp: 10, maxHp: 10, time: 1 }, false, ["hallucinating", "confused"]);
    music.notifyPlayerStats({ hp: 10, maxHp: 10, time: 2 }, false, ["confused", "hallucinating"]);
    music.notifyPlayerStats({ hp: 10, maxHp: 10, time: 3 }, false, []);
    // The first entry is the pack's new player getting the current (no) effects.
    expect(player.effects).toEqual([[], ["confused", "hallucinating"], []]);
    music.dispose();
  });
});
