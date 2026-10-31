/**
 * Decides which background music mood should be playing from the player's
 * situation. Pure logic (no audio), so it can be unit tested.
 *
 * Escalation (calm -> combat -> danger) is immediate; de-escalation waits for
 * hysteresis thresholds and a minimum dwell time so the music does not flap.
 */
export type MusicMood = "calm" | "combat" | "danger";

export const musicMoodRank: Record<MusicMood, number> = {
  calm: 0,
  combat: 1,
  danger: 2,
};

export type MusicDirectorInput = {
  nowMs: number;
  hp: number;
  maxHp: number;
  /** Game turn counter; 0 / non-finite when unknown (e.g. `time` option off). */
  turn: number;
  /** A "danger" severity status is active (stoning, sliming, Weak, ...). */
  dangerCondition: boolean;
};

export type MusicDirectorTuning = {
  /** Enter danger when hp / maxHp drops below this. */
  dangerEnterHpRatio: number;
  /** Leave danger only once hp / maxHp is back above this. */
  dangerExitHpRatio: number;
  /** Combat stays active this many game turns after the last combat event... */
  combatHoldTurns: number;
  /** ...and at least this long in real time. */
  combatHoldMs: number;
  /** Minimum time a mood plays before the director may de-escalate. */
  minDwellMs: number;
};

export const defaultMusicDirectorTuning: MusicDirectorTuning = {
  dangerEnterHpRatio: 1 / 3,
  dangerExitHpRatio: 0.45,
  combatHoldTurns: 3,
  combatHoldMs: 2500,
  minDwellMs: 1500,
};

export class MusicDirector {
  private readonly tuning: MusicDirectorTuning;
  private mood: MusicMood = "calm";
  private moodSinceMs = Number.NEGATIVE_INFINITY;
  private lowHpLatched = false;
  private lastCombatMs = Number.NEGATIVE_INFINITY;
  private lastCombatTurn = Number.NEGATIVE_INFINITY;
  private previousHp: number | null = null;
  private previousMaxHp: number | null = null;

  constructor(tuning: Partial<MusicDirectorTuning> = {}) {
    this.tuning = { ...defaultMusicDirectorTuning, ...tuning };
  }

  get currentMood(): MusicMood {
    return this.mood;
  }

  reset(): void {
    this.mood = "calm";
    this.moodSinceMs = Number.NEGATIVE_INFINITY;
    this.lowHpLatched = false;
    this.lastCombatMs = Number.NEGATIVE_INFINITY;
    this.lastCombatTurn = Number.NEGATIVE_INFINITY;
    this.previousHp = null;
    this.previousMaxHp = null;
  }

  /** The player hit, missed, killed, or was hurt by something. */
  notifyCombat(nowMs: number, turn: number): void {
    this.lastCombatMs = nowMs;
    this.lastCombatTurn = isKnownTurn(turn) ? turn : Number.NEGATIVE_INFINITY;
  }

  update(input: MusicDirectorInput): MusicMood {
    const { nowMs } = input;
    const hasHp = Number.isFinite(input.hp) && Number.isFinite(input.maxHp) && input.maxHp > 0;

    // Losing HP (same max HP, so not level drain bookkeeping) counts as combat.
    if (
      hasHp &&
      this.previousHp !== null &&
      this.previousMaxHp === input.maxHp &&
      input.hp < this.previousHp
    ) {
      this.notifyCombat(nowMs, input.turn);
    }
    if (hasHp) {
      this.previousHp = input.hp;
      this.previousMaxHp = input.maxHp;
    }

    if (hasHp && input.hp > 0) {
      const ratio = input.hp / input.maxHp;
      if (ratio < this.tuning.dangerEnterHpRatio) {
        this.lowHpLatched = true;
      } else if (ratio >= this.tuning.dangerExitHpRatio) {
        this.lowHpLatched = false;
      }
    } else if (hasHp) {
      this.lowHpLatched = true;
    }

    const target = this.resolveTarget(input);
    const dwellDone = nowMs - this.moodSinceMs >= this.tuning.minDwellMs;
    const escalating = musicMoodRank[target] > musicMoodRank[this.mood];
    if (target !== this.mood && (escalating || dwellDone)) {
      this.mood = target;
      this.moodSinceMs = nowMs;
    }
    return this.mood;
  }

  private resolveTarget(input: MusicDirectorInput): MusicMood {
    if (this.lowHpLatched || input.dangerCondition) {
      return "danger";
    }
    return this.isCombatActive(input) ? "combat" : "calm";
  }

  private isCombatActive(input: MusicDirectorInput): boolean {
    if (!Number.isFinite(this.lastCombatMs)) {
      return false;
    }
    const withinTime = input.nowMs - this.lastCombatMs < this.tuning.combatHoldMs;
    if (withinTime) {
      return true;
    }
    // Turn-based hold: while the player has not acted enough turns since the
    // fight, keep the combat music even if they stop to think.
    if (isKnownTurn(input.turn) && Number.isFinite(this.lastCombatTurn)) {
      return input.turn - this.lastCombatTurn < this.tuning.combatHoldTurns;
    }
    return false;
  }
}

function isKnownTurn(turn: number): boolean {
  return Number.isFinite(turn) && turn > 0;
}
