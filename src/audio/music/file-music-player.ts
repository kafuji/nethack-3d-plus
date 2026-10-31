import type { MusicMood } from "./music-director";
import type { MusicLibrary, MusicTrack } from "./music-library";
import type { BackgroundMusicPlayer } from "./procedural-music-player";

const moodFadeInSec: Record<MusicMood, number> = { calm: 1.2, combat: 0.3, danger: 0.25 };
const moodFadeOutSec = 1;
const TRACK_SWITCH_CROSSFADE_SEC = 2;
const MONITOR_INTERVAL_MS = 150;

type Deck = {
  track: MusicTrack;
  element: HTMLAudioElement;
  gain: GainNode;
};

type MoodChannel = {
  mood: MusicMood;
  bus: GainNode;
  /** Deck currently carrying the music for this mood. */
  deck: Deck | null;
  /** Deck fading out during an intra-mood crossfade. */
  outgoing: Deck | null;
  trackIndex: number;
  /** Resume position per track id, so returning to calm continues the piece. */
  resumeOffsets: Map<string, number>;
  pauseTimer: ReturnType<typeof setTimeout> | null;
  crossfadeEndsAt: number;
};

/**
 * Streams bundled music files (fetched into blob URLs, played through
 * <audio> elements routed into WebAudio). Streaming keeps memory low on
 * Quest/Android compared to decoding whole tracks into AudioBuffers.
 *
 * Moods whose files cannot be loaded fall back to `fallback` (procedural).
 */
export class FileMusicPlayer implements BackgroundMusicPlayer {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly channels = new Map<MusicMood, MoodChannel>();
  private readonly decksByTrack = new Map<string, Deck[]>();
  private readonly blobUrls = new Map<string, Promise<string | null>>();
  private readonly failedMoods = new Set<MusicMood>();
  private currentMood: MusicMood | null = null;
  private volume = 0.5;
  private monitorTimer: ReturnType<typeof setInterval> | null = null;
  private preloadStarted = false;
  private disposed = false;

  constructor(
    private readonly library: MusicLibrary,
    private readonly resolveUrl: (path: string) => string,
    private readonly fallback: BackgroundMusicPlayer | null = null,
  ) {}

  setMood(mood: MusicMood | null): void {
    if (this.disposed || mood === this.currentMood) return;
    this.currentMood = mood;
    this.startPreload();
    for (const channel of this.channels.values()) {
      if (channel.mood !== mood) this.fadeOutChannel(channel);
    }
    if (mood === null) {
      this.fallback?.setMood(null);
      return;
    }
    void this.enterMood(mood);
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.fallback?.setVolume(volume);
    if (this.context && this.master) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(this.resolveMasterGain(), now, 0.1);
    }
  }

  async resume(): Promise<void> {
    // Only wake the fallback synth if some mood actually needs it.
    if (this.failedMoods.size > 0) await this.fallback?.resume();
    const context = this.ensureContext();
    if (!context) return;
    if (context.state !== "running") {
      try {
        await context.resume();
      } catch {
        // Needs a user gesture; retried on the next one.
      }
    }
    // Autoplay policy may have blocked play() before the first gesture.
    const channel = this.currentMood ? this.channels.get(this.currentMood) : null;
    if (channel?.deck && channel.deck.element.paused) {
      void channel.deck.element.play().catch(() => undefined);
    }
  }

  async suspend(): Promise<void> {
    await this.fallback?.suspend();
    if (this.context && this.context.state === "running") {
      try {
        await this.context.suspend();
      } catch {
        // ignore
      }
    }
  }

  dispose(): void {
    this.disposed = true;
    this.fallback?.dispose();
    if (this.monitorTimer !== null) clearInterval(this.monitorTimer);
    this.monitorTimer = null;
    for (const channel of this.channels.values()) {
      if (channel.pauseTimer !== null) clearTimeout(channel.pauseTimer);
    }
    for (const decks of this.decksByTrack.values()) {
      for (const deck of decks) {
        deck.element.pause();
        deck.element.removeAttribute("src");
        deck.element.load();
      }
    }
    this.decksByTrack.clear();
    for (const pending of this.blobUrls.values()) {
      void pending.then((url) => url && URL.revokeObjectURL(url));
    }
    this.blobUrls.clear();
    const context = this.context;
    this.context = null;
    this.master = null;
    if (context) void context.close().catch(() => undefined);
  }

  // ---------------------------------------------------------------------------

  private resolveMasterGain(): number {
    return Math.pow(this.volume, 1.5) * 1.2;
  }

  private ensureContext(): AudioContext | null {
    if (this.disposed) return null;
    if (this.context) return this.context;
    const Ctor =
      typeof window !== "undefined"
        ? window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!Ctor) return null;
    try {
      const context = new Ctor();
      const master = context.createGain();
      master.gain.value = this.resolveMasterGain();
      master.connect(context.destination);
      this.context = context;
      this.master = master;
      return context;
    } catch (error) {
      console.warn("[NetHack 3D] Unable to create WebAudio context for background music.", error);
      return null;
    }
  }

  private startPreload(): void {
    if (this.preloadStarted) return;
    this.preloadStarted = true;
    // Load the first track of every mood up front so combat/danger start instantly.
    const order: MusicMood[] = ["calm", "combat", "danger"];
    void (async () => {
      for (const mood of order) {
        const first = this.library[mood][0];
        if (first) await this.loadTrackUrl(first);
      }
      for (const mood of order) {
        for (const track of this.library[mood].slice(1)) await this.loadTrackUrl(track);
      }
    })();
  }

  private loadTrackUrl(track: MusicTrack): Promise<string | null> {
    let pending = this.blobUrls.get(track.id);
    if (!pending) {
      pending = (async () => {
        try {
          const response = await fetch(this.resolveUrl(track.path));
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          return this.disposed ? null : URL.createObjectURL(blob);
        } catch (error) {
          console.warn(`[NetHack 3D] Background music '${track.path}' could not be loaded.`, error);
          return null;
        }
      })();
      this.blobUrls.set(track.id, pending);
    }
    return pending;
  }

  private getChannel(mood: MusicMood): MoodChannel | null {
    const context = this.ensureContext();
    if (!context || !this.master) return null;
    let channel = this.channels.get(mood);
    if (!channel) {
      const bus = context.createGain();
      bus.gain.value = 0;
      bus.connect(this.master);
      channel = {
        mood,
        bus,
        deck: null,
        outgoing: null,
        trackIndex: 0,
        resumeOffsets: new Map(),
        pauseTimer: null,
        crossfadeEndsAt: 0,
      };
      this.channels.set(mood, channel);
    }
    return channel;
  }

  private async enterMood(mood: MusicMood): Promise<void> {
    const channel = this.getChannel(mood);
    if (!channel || !this.context) {
      this.useFallback(mood);
      return;
    }
    if (channel.pauseTimer !== null) {
      // Quick return while still fading out: just bring it back.
      clearTimeout(channel.pauseTimer);
      channel.pauseTimer = null;
    }
    if (!channel.deck) {
      const deck = await this.acquireStartableDeck(channel);
      if (this.currentMood !== mood || this.disposed) return;
      if (!deck) {
        this.useFallback(mood);
        return;
      }
      channel.deck = deck;
      deck.gain.gain.cancelScheduledValues(this.context.currentTime);
      deck.gain.gain.setValueAtTime(1, this.context.currentTime);
      deck.element.currentTime = channel.resumeOffsets.get(deck.track.id) ?? 0;
    }
    this.fallback?.setMood(null);
    const deck = channel.deck;
    deck.element.loop = this.shouldNativeLoop(channel, deck.track);
    if (deck.element.paused) void deck.element.play().catch(() => undefined);
    const now = this.context.currentTime;
    channel.bus.gain.cancelScheduledValues(now);
    channel.bus.gain.setValueAtTime(channel.bus.gain.value, now);
    channel.bus.gain.linearRampToValueAtTime(1, now + moodFadeInSec[mood]);
    this.ensureMonitor();
  }

  private useFallback(mood: MusicMood): void {
    this.failedMoods.add(mood);
    this.fallback?.setMood(mood);
    void this.fallback?.resume();
  }

  /** Tries tracks of the mood starting at trackIndex until one loads. */
  private async acquireStartableDeck(channel: MoodChannel): Promise<Deck | null> {
    const tracks = this.library[channel.mood];
    for (let attempt = 0; attempt < tracks.length; attempt += 1) {
      const index = (channel.trackIndex + attempt) % tracks.length;
      const deck = await this.acquireDeck(tracks[index], channel, null);
      if (deck) {
        channel.trackIndex = index;
        return deck;
      }
    }
    return null;
  }

  private async acquireDeck(
    track: MusicTrack,
    channel: MoodChannel,
    exclude: Deck | null,
  ): Promise<Deck | null> {
    const url = await this.loadTrackUrl(track);
    const context = this.context;
    if (!url || !context) return null;
    const decks = this.decksByTrack.get(track.id) ?? [];
    this.decksByTrack.set(track.id, decks);
    let deck = decks.find((candidate) => candidate !== exclude && candidate.element.paused);
    if (!deck && decks.length < 2) {
      const element = new Audio();
      element.preload = "auto";
      element.src = url;
      const source = context.createMediaElementSource(element);
      const gain = context.createGain();
      source.connect(gain);
      deck = { track, element, gain };
      decks.push(deck);
    }
    if (!deck) return null;
    deck.gain.disconnect();
    deck.gain.connect(channel.bus);
    return deck;
  }

  private shouldNativeLoop(channel: MoodChannel, track: MusicTrack): boolean {
    return track.loop === "seamless" && this.library[channel.mood].length <= 1;
  }

  private fadeOutChannel(channel: MoodChannel): void {
    const context = this.context;
    if (!context || channel.pauseTimer !== null || !channel.deck) return;
    const now = context.currentTime;
    channel.bus.gain.cancelScheduledValues(now);
    channel.bus.gain.setValueAtTime(channel.bus.gain.value, now);
    channel.bus.gain.linearRampToValueAtTime(0, now + moodFadeOutSec);
    channel.pauseTimer = setTimeout(() => {
      channel.pauseTimer = null;
      const deck = channel.deck;
      if (deck) {
        channel.resumeOffsets.set(deck.track.id, deck.element.currentTime);
        deck.element.pause();
      }
      channel.outgoing?.element.pause();
      channel.outgoing = null;
      channel.deck = null;
    }, moodFadeOutSec * 1000 + 50);
  }

  private ensureMonitor(): void {
    if (this.monitorTimer !== null) return;
    this.monitorTimer = setInterval(() => this.monitor(), MONITOR_INTERVAL_MS);
  }

  /** Handles looping-by-crossfade and playlist rotation for the active mood. */
  private monitor(): void {
    const context = this.context;
    const mood = this.currentMood;
    if (!context || !mood) return;
    const channel = this.channels.get(mood);
    if (!channel?.deck) return;
    const now = context.currentTime;
    if (channel.outgoing && now >= channel.crossfadeEndsAt) {
      channel.outgoing.element.pause();
      channel.outgoing = null;
    }
    if (channel.outgoing) return;
    const deck = channel.deck;
    const duration = deck.element.duration;
    if (!Number.isFinite(duration) || duration <= 0 || deck.element.paused) return;
    if (deck.element.loop) return;
    const tracks = this.library[mood];
    const nextIndex = (channel.trackIndex + 1) % tracks.length;
    const nextTrack = tracks[nextIndex];
    const switching = nextTrack.id !== deck.track.id;
    const crossfade = switching
      ? TRACK_SWITCH_CROSSFADE_SEC
      : deck.track.loop === "seamless"
        ? 0.03
        : deck.track.crossfadeSec ?? 2;
    const remaining = duration - deck.element.currentTime;
    if (remaining > crossfade + MONITOR_INTERVAL_MS / 1000) return;
    channel.trackIndex = nextIndex;
    channel.resumeOffsets.delete(deck.track.id);
    void this.crossfadeTo(channel, nextTrack, Math.max(0.03, Math.min(crossfade, remaining)));
  }

  private async crossfadeTo(channel: MoodChannel, track: MusicTrack, seconds: number): Promise<void> {
    const old = channel.deck;
    const next = await this.acquireDeck(track, channel, old);
    const context = this.context;
    if (!context || !old || channel.deck !== old) return;
    if (!next) {
      old.element.loop = true;
      return;
    }
    next.element.currentTime = 0;
    next.element.loop = this.shouldNativeLoop(channel, track);
    const now = context.currentTime;
    next.gain.gain.cancelScheduledValues(now);
    next.gain.gain.setValueAtTime(0, now);
    next.gain.gain.linearRampToValueAtTime(1, now + seconds);
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setValueAtTime(old.gain.gain.value, now);
    old.gain.gain.linearRampToValueAtTime(0, now + seconds);
    void next.element.play().catch(() => undefined);
    channel.deck = next;
    channel.outgoing = old;
    channel.crossfadeEndsAt = now + seconds + 0.05;
  }
}
