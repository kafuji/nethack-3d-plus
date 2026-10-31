import { describe, expect, it } from "vitest";
import { translatePlayerTitle } from "./player-title";

describe("player title presentation", () => {
  it("translates known titles without changing the player's name", () => {
    expect(translatePlayerTitle("Kafujinho the Hatamoto", "ja")).toBe("Kafujinho（旗本）");
    expect(translatePlayerTitle("Alice the Great the Footpad", "ja")).toBe("Alice the Great（追いはぎ）");
    expect(translatePlayerTitle("Web_user the Evoker", "ja")).toBe("Web_user（召喚術師）");
  });

  it("leaves unknown titles and other locales untouched", () => {
    expect(translatePlayerTitle("Alice the Unknown", "ja")).toBe("Alice the Unknown");
    expect(translatePlayerTitle("Alice the constructor", "ja")).toBe("Alice the constructor");
    expect(translatePlayerTitle("Alice the Hatamoto", "en")).toBe("Alice the Hatamoto");
  });
});
