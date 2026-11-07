import { createFileMusicPlayer, type BackgroundMusicSettings } from "./background-music";
import { resolveMusicPack } from "./music-pack";
import type { BackgroundMusicPlayer } from "./procedural-music-player";

/**
 * Plays a music pack's title track while the startup menu is shown. The track
 * rides on the calm channel of a dedicated player, so it fades in and out
 * (and loops) the same way as in-game music.
 */
export class TitleMusic {
  /** Null for "none" or a pack without a title track (the title screen stays silent). */
  static createForPack(packId: string): TitleMusic | null {
    const track = resolveMusicPack(packId)?.titleTrack;
    if (!track) return null;
    return new TitleMusic(createFileMusicPlayer({ calm: [track], combat: [], danger: [] }));
  }

  private settings: BackgroundMusicSettings = {
    soundEnabled: true,
    musicPack: "",
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
      resolveMusicPack(this.settings.musicPack) !== null &&
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
