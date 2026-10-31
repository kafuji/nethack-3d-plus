import { describe, expect, it } from "vitest";
import { MusicDirector } from "./music-director";

const base = { hp: 20, maxHp: 20, turn: 100, dangerCondition: false };

describe("MusicDirector", () => {
  it("starts calm", () => {
    const d = new MusicDirector();
    expect(d.update({ ...base, nowMs: 0 })).toBe("calm");
  });

  it("escalates to combat immediately and holds for turns", () => {
    const d = new MusicDirector();
    d.update({ ...base, nowMs: 0 });
    d.notifyCombat(1000, 100);
    expect(d.update({ ...base, nowMs: 1000 })).toBe("combat");
    // Real time passes but the player has not moved many turns: stay.
    expect(d.update({ ...base, nowMs: 60000, turn: 102 })).toBe("combat");
    // Enough turns and time have passed: back to calm.
    expect(d.update({ ...base, nowMs: 61000, turn: 103 })).toBe("calm");
  });

  it("treats HP loss as combat", () => {
    const d = new MusicDirector();
    d.update({ ...base, nowMs: 0 });
    expect(d.update({ ...base, hp: 17, nowMs: 100 })).toBe("combat");
  });

  it("enters danger below 1/3 HP and needs 45% to leave", () => {
    const d = new MusicDirector();
    d.update({ ...base, nowMs: 0 });
    expect(d.update({ ...base, hp: 6, nowMs: 100 })).toBe("danger");
    // Healed a little (40%) - still danger.
    expect(d.update({ ...base, hp: 8, nowMs: 20000, turn: 200 })).toBe("danger");
    // Healed to 50% and combat long over.
    expect(d.update({ ...base, hp: 10, nowMs: 40000, turn: 300 })).toBe("calm");
  });

  it("enters danger from a dangerous status", () => {
    const d = new MusicDirector();
    expect(d.update({ ...base, dangerCondition: true, nowMs: 0 })).toBe("danger");
  });

  it("waits the minimum dwell time before de-escalating", () => {
    const d = new MusicDirector({ minDwellMs: 4000, combatHoldMs: 0, combatHoldTurns: 0 });
    d.update({ ...base, nowMs: 0 });
    expect(d.update({ ...base, dangerCondition: true, nowMs: 1000 })).toBe("danger");
    expect(d.update({ ...base, nowMs: 2000 })).toBe("danger");
    expect(d.update({ ...base, nowMs: 5100 })).toBe("calm");
  });

  it("falls back to real time when the turn counter is unknown", () => {
    const d = new MusicDirector();
    d.update({ ...base, turn: 0, nowMs: 0 });
    d.notifyCombat(0, 0);
    expect(d.update({ ...base, turn: 0, nowMs: 2000 })).toBe("combat");
    // Hold time (2.5s) is over, but the 1.5s minimum dwell counts from 2000ms.
    expect(d.update({ ...base, turn: 0, nowMs: 3000 })).toBe("combat");
    expect(d.update({ ...base, turn: 0, nowMs: 3600 })).toBe("calm");
  });
});
