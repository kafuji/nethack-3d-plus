import { describe, expect, it } from "vitest";
import {
  isPlayerWeaponSwingMessage,
  resolveScreenSide,
  samplePlayerWeaponSwing,
} from "./player-weapon-swing";

describe("player weapon swing", () => {
  it("rests outside the swing and returns to rest at the end", () => {
    expect(samplePlayerWeaponSwing(0, 1, null)).toEqual({ angle: 0, offsetX: 0, offsetY: 0 });
    expect(samplePlayerWeaponSwing(1, 1, { x: 1, y: 0 })).toEqual({ angle: 0, offsetX: 0, offsetY: 0 });
    const almostDone = samplePlayerWeaponSwing(0.999, 1, { x: 1, y: 0 });
    expect(Math.abs(almostDone.angle)).toBeLessThan(0.01);
  });

  it("winds up back, chops through the target side, then lunges at the target", () => {
    const windUp = samplePlayerWeaponSwing(0.28, 1, { x: 1, y: 0 });
    const strike = samplePlayerWeaponSwing(0.5, 1, { x: 1, y: 0 });
    expect(windUp.angle).toBeGreaterThan(0);
    expect(strike.angle).toBeLessThan(-1.5);
    expect(windUp.offsetX).toBeLessThan(0);
    expect(strike.offsetX).toBeGreaterThan(0.15);
  });

  it("mirrors the arc for a target on the viewer's left", () => {
    const right = samplePlayerWeaponSwing(0.4, 1, { x: 1, y: 0 });
    const left = samplePlayerWeaponSwing(0.4, -1, { x: -1, y: 0 });
    expect(left.angle).toBeCloseTo(-right.angle);
    expect(left.offsetX).toBeCloseTo(-right.offsetX);
  });

  it("resolves the screen side of a target", () => {
    expect(resolveScreenSide(0.5)).toBe(1);
    expect(resolveScreenSide(-0.5)).toBe(-1);
    expect(resolveScreenSide(0)).toBeNull();
  });

  it("only swings for the hero's own weapon blows", () => {
    expect(isPlayerWeaponSwingMessage("You hit the newt.")).toBe(true);
    expect(isPlayerWeaponSwingMessage("You miss the jackal.")).toBe(true);
    expect(isPlayerWeaponSwingMessage("You just miss the jackal.")).toBe(true);
    expect(isPlayerWeaponSwingMessage("You kill the grid bug!")).toBe(true);
    expect(isPlayerWeaponSwingMessage("You smite the zombie!")).toBe(true);
    expect(isPlayerWeaponSwingMessage("You attack thin air.")).toBe(true);
    expect(isPlayerWeaponSwingMessage("You harmlessly attack thin air.")).toBe(true);
    expect(isPlayerWeaponSwingMessage("You kick the newt.")).toBe(false);
    expect(isPlayerWeaponSwingMessage("You bite the newt.")).toBe(false);
    expect(isPlayerWeaponSwingMessage("The jackal bites!")).toBe(false);
    expect(isPlayerWeaponSwingMessage("The ya hits the newt.")).toBe(false);
    expect(isPlayerWeaponSwingMessage("You shoot 2 ya.")).toBe(false);
  });
});
