import { MusicDirector, type MusicMood } from "./music-director";
import { FileMusicPlayer } from "./file-music-player";
import { ascensionMusicTrack, defaultMusicLibrary, type MusicLibrary } from "./music-library";
import { ProceduralMusicPlayer, type BackgroundMusicPlayer } from "./procedural-music-player";
import {
  regionTrackPreferences,
  resolveMusicRegion,
  type MusicRegion,
  type MusicSpecialLevel,
} from "./music-region";
import type { MusicStatusEffect } from "./status-effects";

export type BackgroundMusicSettings = {
  soundEnabled: boolean;
  musicEnabled: boolean;
  musicVolume: number;
};

export type BackgroundMusicStats = {
  hp: number;
  maxHp: number;
  time: number;
  /** Dungeon branch name from the status line (selects regional tracks). */
  dungeon?: string;
  /** Medusa's level or the Castle, which report the Dungeons of Doom as their branch. */
  specialLevel?: MusicSpecialLevel | null;
};

const EVALUATE_INTERVAL_MS = 250;

/**
 * Only an ascension prints the choir line: offering the Amulet at your own
 * altar. It comes before the game-over sequence, so the music starts with the
 * moment itself. The final killer text "ascended" is the fallback.
 */
const ASCENSION_MESSAGE = /invisible choir sings|^\s*ascended\b/i;

function resolvePublicAssetUrl(path: string): string {
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  const rawBase =
    typeof import.meta.env?.BASE_URL === "string" && import.meta.env.BASE_URL.trim()
      ? import.meta.env.BASE_URL.trim()
      : "/";
  const base = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;
  if (typeof window === "undefined" || !window.location?.href) return `${base}${normalizedPath}`;
  return new URL(normalizedPath, new URL(base, window.location.href)).toString();
}

/** Bundled CC0 music files, falling back to the procedural synth if they fail to load. */
export function createDefaultBackgroundMusicPlayer(
  library: MusicLibrary = defaultMusicLibrary,
): BackgroundMusicPlayer {
  return new FileMusicPlayer(library, resolvePublicAssetUrl, new ProceduralMusicPlayer());
}

/**
 * Glue between the game and the music player: feeds the director with
 * player stats / combat events and switches the player's mood.
 */
export class BackgroundMusic {
  private readonly director = new MusicDirector();
  private settings: BackgroundMusicSettings = {
    soundEnabled: true,
    musicEnabled: true,
    musicVolume: 0.5,
  };
  private stats: BackgroundMusicStats | null = null;
  private dangerCondition = false;
  private gameOver = false;
  private ascended = false;
  private previewMood: MusicMood | null | undefined = undefined;
  private region: MusicRegion | null = null;
  private statusEffectsKey = "";
  private evaluateTimer: ReturnType<typeof setInterval> | null = null;
  private disposed = false;

  constructor(
    private readonly player: BackgroundMusicPlayer = createDefaultBackgroundMusicPlayer(),
    private readonly now: () => number = () => Date.now(),
  ) {}

  setSettings(settings: BackgroundMusicSettings): void {
    this.settings = { ...settings };
    this.player.setVolume(settings.musicVolume);
    if (!this.isEnabled()) {
      this.player.setMood(null);
      void this.player.suspend();
    } else {
      void this.player.resume();
    }
    this.evaluate();
  }

  notifyPlayerStats(
    stats: BackgroundMusicStats,
    dangerCondition: boolean,
    statusEffects: readonly MusicStatusEffect[] = [],
  ): void {
    this.stats = { ...stats };
    this.dangerCondition = dangerCondition;
    this.setStatusEffects(statusEffects);
    if (stats.dungeon !== undefined) {
      this.updateRegion(resolveMusicRegion(stats.dungeon, stats.specialLevel ?? null));
    }
    this.evaluate();
  }

  /** Confusion, hallucination, ... color the music (see status-effects.ts). */
  setStatusEffects(effects: readonly MusicStatusEffect[]): void {
    const sorted = [...new Set(effects)].sort();
    const key = sorted.join(",");
    if (key === this.statusEffectsKey) return;
    this.statusEffectsKey = key;
    this.player.setStatusEffects?.(sorted);
  }

  getCurrentRegion(): MusicRegion | null {
    return this.region;
  }

  private updateRegion(region: MusicRegion): void {
    if (region === this.region) return;
    const entering = this.region !== null;
    this.region = region;
    this.player.setTrackPreference?.(regionTrackPreferences[region]);
    // A small fanfare when walking into a new branch or special level (not on
    // game start).
    if (entering && region !== "dungeon" && this.isEnabled() && !this.gameOver) {
      this.player.playStinger?.("region-enter");
    }
  }

  /** A game message or the final death text; an ascension starts its music. */
  notifyGameMessage(text: string): void {
    if (ASCENSION_MESSAGE.test(text)) this.notifyAscension();
  }

  notifyAscension(): void {
    if (this.ascended) return;
    this.ascended = true;
    this.evaluate();
    if (this.isEnabled()) this.player.playOnce?.(ascensionMusicTrack);
  }

  /** The player attacked, missed, or killed something. */
  notifyCombatActivity(): void {
    this.director.notifyCombat(this.now(), this.stats?.time ?? 0);
    this.evaluate();
  }

  setGameOver(active: boolean): void {
    const ended = active && !this.gameOver;
    this.gameOver = active;
    this.evaluate();
    if (ended && !this.ascended && this.isEnabled()) this.player.playStinger?.("game-over");
  }

  resumeFromUserGesture(): void {
    if (this.isEnabled()) void this.player.resume();
  }

  /** New game / reconnect. */
  reset(): void {
    this.director.reset();
    this.stats = null;
    this.dangerCondition = false;
    this.gameOver = false;
    this.ascended = false;
    this.player.stopOnce?.();
    this.region = null;
    this.setStatusEffects([]);
    this.player.setMood(null);
  }

  /** Debug: force a mood (null = silence), or undefined to return to auto. */
  setPreviewMood(mood: MusicMood | null | undefined): void {
    this.previewMood = mood;
    if (mood !== undefined) void this.player.resume();
    this.evaluate();
  }

  getCurrentMood(): MusicMood {
    return this.director.currentMood;
  }

  dispose(): void {
    this.disposed = true;
    this.stopTimer();
    this.player.dispose();
  }

  private isEnabled(): boolean {
    return (
      !this.disposed &&
      this.settings.soundEnabled &&
      this.settings.musicEnabled &&
      this.settings.musicVolume > 0
    );
  }

  private evaluate(): void {
    if (this.disposed) return;
    if (this.previewMood !== undefined) {
      this.player.setMood(this.isEnabled() ? this.previewMood : null);
      this.stopTimer();
      return;
    }
    if (!this.isEnabled() || this.gameOver || this.ascended || !this.stats || this.stats.maxHp <= 0) {
      this.player.setMood(null);
      this.stopTimer();
      return;
    }
    const mood = this.director.update({
      nowMs: this.now(),
      hp: this.stats.hp,
      maxHp: this.stats.maxHp,
      turn: this.stats.time,
      dangerCondition: this.dangerCondition,
    });
    this.player.setMood(mood);
    this.ensureTimer();
  }

  private ensureTimer(): void {
    if (this.evaluateTimer !== null) return;
    // Combat and dwell timers expire in real time, so re-check periodically.
    this.evaluateTimer = setInterval(() => this.evaluate(), EVALUATE_INTERVAL_MS);
  }

  private stopTimer(): void {
    if (this.evaluateTimer === null) return;
    clearInterval(this.evaluateTimer);
    this.evaluateTimer = null;
  }
}
