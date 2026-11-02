import {
  useEffect, useRef
} from "react";
import { TitleMusic } from "../../../audio/music";
import type { Nh3dClientOptions } from "../../../game/ui-types";

export interface UseTitleMusicDependencies {
  readonly startupMenuVisible: boolean;
  readonly clientOptions: Nh3dClientOptions;
}

/** Fade-out (1 s) plus a margin before the idle title player is released. */
const RELEASE_DELAY_MS = 1500;

/** Plays the title screen BGM while the startup menu is visible. */
export function useTitleMusic(dependencies: UseTitleMusicDependencies) {
  const { startupMenuVisible, clientOptions } = dependencies;
  const { soundEnabled, musicEnabled, musicVolume } = clientOptions;
  const musicRef = useRef<TitleMusic | null>(null);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (startupMenuVisible) {
      if (releaseTimerRef.current !== null) {
        clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }
      musicRef.current ??= TitleMusic.createDefault();
    }
    const music = musicRef.current;
    if (!music) return;
    music.setSettings({ soundEnabled, musicEnabled, musicVolume });
    music.setActive(startupMenuVisible);
    if (!startupMenuVisible && releaseTimerRef.current === null) {
      // Let the track fade out, then free its AudioContext for the game.
      releaseTimerRef.current = setTimeout(() => {
        releaseTimerRef.current = null;
        musicRef.current?.dispose();
        musicRef.current = null;
      }, RELEASE_DELAY_MS);
    }
  }, [startupMenuVisible, soundEnabled, musicEnabled, musicVolume]);

  useEffect(() => {
    if (!startupMenuVisible) return;
    const resume = () => musicRef.current?.resumeFromUserGesture();
    const events = ["pointerdown", "keydown", "touchend"] as const;
    for (const event of events) window.addEventListener(event, resume, true);
    return () => {
      for (const event of events) window.removeEventListener(event, resume, true);
    };
  }, [startupMenuVisible]);

  useEffect(() => () => {
    if (releaseTimerRef.current !== null) clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = null;
    musicRef.current?.dispose();
    musicRef.current = null;
  }, []);
}
