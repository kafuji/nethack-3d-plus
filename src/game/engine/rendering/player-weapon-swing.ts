/**
 * Pose math for the weapon sprites drawn over the player in overhead view.
 * Everything here is screen-space and renderer-free so it can be unit tested.
 */

/** Fraction of the player sprite's shorter side covered by one weapon. */
export const PLAYER_WEAPON_SIZE = 0.62;

/** Where the grip sits inside a weapon tile (tiles draw hilts bottom-left). */
export const PLAYER_WEAPON_GRIP_UV = { u: 0.24, v: 0.24 } as const;

/** Resting hand position inside the player sprite, for the viewer-right hand. */
export const PLAYER_WEAPON_HAND_UV = { u: 0.66, v: 0.24 } as const;

export const PLAYER_WEAPON_SWING_DURATION_MS = 340;

/** Second swing of a two-weapon attack starts this soon after the first. */
export const PLAYER_WEAPON_OFF_HAND_SWING_DELAY_MS = 150;

export type ScreenSide = -1 | 1;

export interface PlayerWeaponSwingPose {
  /** Rotation in radians, positive = counter-clockwise on screen. */
  readonly angle: number;
  /** Lunge offset in player-sprite heights, screen space (x right, y up). */
  readonly offsetX: number;
  readonly offsetY: number;
}

const REST_POSE: PlayerWeaponSwingPose = { angle: 0, offsetX: 0, offsetY: 0 };

const WIND_UP_ANGLE = (40 * Math.PI) / 180;
const FOLLOW_THROUGH_ANGLE = (-105 * Math.PI) / 180;
const LUNGE_DISTANCE = 0.16;

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;
const easeInCubic = (t: number): number => t ** 3;
const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

/**
 * Sample a Battle Brothers style swing: a short wind-up back over the
 * shoulder, a fast chop through the target side, then a slower recovery.
 * `side` mirrors the arc (1 = weapon on the viewer's right).
 * `lunge` is the screen-space unit direction towards the target.
 */
export function samplePlayerWeaponSwing(
  progress: number,
  side: ScreenSide,
  lunge: { x: number; y: number } | null,
): PlayerWeaponSwingPose {
  if (!(progress > 0) || progress >= 1) {
    return REST_POSE;
  }
  let angle: number;
  let reach: number;
  if (progress < 0.28) {
    const t = easeOutCubic(progress / 0.28);
    angle = WIND_UP_ANGLE * t;
    reach = -0.25 * t;
  } else if (progress < 0.5) {
    const t = easeInCubic((progress - 0.28) / 0.22);
    angle = WIND_UP_ANGLE + (FOLLOW_THROUGH_ANGLE - WIND_UP_ANGLE) * t;
    reach = -0.25 + 1.25 * t;
  } else {
    const t = easeInOutSine((progress - 0.5) / 0.5);
    angle = FOLLOW_THROUGH_ANGLE * (1 - t);
    reach = 1 - t;
  }
  return {
    angle: angle * side,
    offsetX: lunge ? lunge.x * LUNGE_DISTANCE * reach : 0,
    offsetY: lunge ? lunge.y * LUNGE_DISTANCE * reach : 0,
  };
}

/** Screen side a target lies on, or null when it is straight above/below. */
export function resolveScreenSide(screenDeltaX: number): ScreenSide | null {
  if (Math.abs(screenDeltaX) < 1e-3) {
    return null;
  }
  return screenDeltaX > 0 ? 1 : -1;
}

/**
 * Whether a combat message is one of the hero's own melee weapon blows.
 * Kicks and natural attacks never swing the wielded weapon.
 */
export function isPlayerWeaponSwingMessage(message: string): boolean {
  const text = message.replace(/\s+/g, " ").trim();
  if (
    /\byou\s+(?:just\s+)?miss\b/i.test(text) ||
    /\byou\s+(?:harmlessly\s+)?attack thin air\b/i.test(text)
  ) {
    return true;
  }
  if (/\byou\s+(?:kick|bite|butt|sting|touch|engulf|claw|lick)\b/i.test(text)) {
    return false;
  }
  return /\byou\s+(?:hit|slash|strike|stab|smite|thrust|bash|smash|whack|kill|destroy)\b/i.test(text);
}
