import { createDefaultBackgroundMusicPlayer, type BackgroundMusicSettings } from "./background-music";
import { titleMusicTrack } from "./music-library";
import type { BackgroundMusicPlayer } from "./procedural-music-player";

/**
 * Plays the title screen track while the startup menu is shown. The track
 * rides on the calm channel of a dedicated player, so it fades in and out
 * (and loops) the same way as in-game music.
 */
export class TitleMusic {
  /** Null when no title track is configured (the title screen stays silent). */
  static createDefault(): TitleMusic | null {
    if (!titleMusicTrack) return null;
    return new TitleMusic(
      createDefaultBackgroundMusicPlayer({ calm: [titleMusicTrack], combat: [], danger: [] }),
    );
  }

  private settings: BackgroundMusicSettings = {
    soundEnabled: true,
    musicEnabled: true,
    musicVolume: 0.5,
  };
  private active = false;
  private disposed = false;

  constructor(private readonly player: BackgroundMusicPlayer) {}

  setSettings(settings: BackgroundMusicSettings): void {
    this.settings = { ...settings };
    this.player.setVolume(settings.musicVolume);
    this.evaluate();
  }

  setActive(active: boolean): void {
    this.active = active;
    this.evaluate();
  }

  /** Browsers keep audio suspended until the first click / key press. */
  resumeFromUserGesture(): void {
    if (this.isPlaying()) void this.player.resume();
  }

  dispose(): void {
    this.disposed = true;
    this.player.dispose();
  }

  private isPlaying(): boolean {
    return (
      !this.disposed &&
      this.active &&
      this.settings.soundEnabled &&
      this.settings.musicEnabled &&
      this.settings.musicVolume > 0
    );
  }

  private evaluate(): void {
    if (this.disposed) return;
    if (this.isPlaying()) {
      this.player.setMood("calm");
      void this.player.resume();
    } else {
      this.player.setMood(null);
    }
  }
}
