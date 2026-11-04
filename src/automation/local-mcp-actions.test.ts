import { describe, expect, it, vi } from "vitest";
import type Nethack3DEngine from "../game/Nethack3DEngine";
import { executeLocalMcpRequest } from "./local-mcp-client";

const ui = vi.hoisted(() => ({
  numberPadModeEnabled: false,
  directionQuestion: null as string | null,
  positionInputActive: false,
  inventory: { visible: false, items: [{ text: "a blessed potion", accelerator: "a", identifier: 42 }] },
  infoMenu: null,
  textInput: null,
  question: null,
  connectionState: "running",
  playerStats: {},
  gameMessages: Array.from({ length: 40 }, (_, i) => `message-${i}`),
  gameOver: { active: false },
  extendedCommands: [],
}));
vi.mock("../state/gameStore", () => ({ useGameStore: { getState: () => ui } }));

describe("MCP game request dispatch", () => {
  it("routes one action with the observed session and wait identity", () => {
    const submitAutomationAction = vi.fn();
    const engine = { submitAutomationAction, getAutomationContext: () => ({ numberPadMode: { enabled: false, source: "startup-options" } }) } as unknown as Nethack3DEngine;
    executeLocalMcpRequest(engine, { id: 1, method: "move", params: { sessionId: "session", requestId: 3, direction: "e" } });
    expect(submitAutomationAction).toHaveBeenCalledWith("session", 3, { type: "command", key: "l" });
    executeLocalMcpRequest(engine, { id: 2, method: "command", params: { sessionId: "session", requestId: 4, key: "Ctrl+a" } });
    expect(submitAutomationAction).toHaveBeenLastCalledWith("session", 4, { type: "command", key: "__CTRL__:a" });
    executeLocalMcpRequest(engine, { id: 3, method: "select_menu", params: { sessionId: "session", requestId: 5, selections: [{ index: 2, count: 3 }] } });
    expect(submitAutomationAction).toHaveBeenLastCalledWith("session", 5, { type: "menu", selections: [{ index: 2, count: 3 }] });
  });

  it("continues a game-over reveal using its own identity without requiring a runtime wait", () => {
    const continueAutomationGameOver = vi.fn();
    const engine = { continueAutomationGameOver } as unknown as Nethack3DEngine;
    const result = executeLocalMcpRequest(engine, { id: 1, method: "continue_game_over", params: { sessionId: "session", revealId: 3 } });
    expect(continueAutomationGameOver).toHaveBeenCalledWith("session", 3);
    expect(result).toMatchObject({ status: "completed" });
    expect(() => executeLocalMcpRequest(engine, { id: 2, method: "continue_game_over", params: { sessionId: "session" } })).toThrow(/revealId/);
  });

  it("exposes the game-over reveal identity even with no runtime input wait", () => {
    const engine = { getAutomationContext: () => ({ inputWait: null, position: null, player: null, messages: [], numberPadMode: { enabled: null, source: "unknown" }, gameOverReveal: { sessionId: "death-session", revealId: 3 } }) } as unknown as Nethack3DEngine;
    const result = executeLocalMcpRequest(engine, { id: 1, method: "get_state" });
    expect(result).toMatchObject({ sessionId: null, inputWait: null, gameOverReveal: { sessionId: "death-session", revealId: 3 } });
  });

  it("exposes displayed inventory text without internal object identifiers", () => {
    const engine = { getAutomationContext: () => ({ inventorySnapshot: { available: true, revision: 1 } }) } as unknown as Nethack3DEngine;
    const result = executeLocalMcpRequest(engine, { id: 1, method: "get_inventory" });
    expect(result).toMatchObject({ items: [{ text: "a blessed potion", accelerator: "a" }] });
    expect(JSON.stringify(result)).not.toContain("identifier");
  });

  it("reports an open inventory in game state so the client can dismiss it", () => {
    const engine = { getAutomationContext: () => ({ inputWait: null, position: null, player: null, messages: [], numberPadMode: { enabled: false, source: "startup-options" } }) } as unknown as Nethack3DEngine;
    ui.inventory.visible = true;
    try {
      expect(executeLocalMcpRequest(engine, { id: 1, method: "get_state" })).toMatchObject({ prompt: { type: "inventory" } });
    } finally { ui.inventory.visible = false; }
  });

  it("returns current-session messages rather than a previous session's UI cache", () => {
    const engine = { getAutomationContext: () => ({ inputWait: null, position: null, messages: ["current session"], numberPadMode: { enabled: null, source: "unknown" } }) } as unknown as Nethack3DEngine;
    const result = executeLocalMcpRequest(engine, { id: 1, method: "get_state" }) as { messages: string[] };
    expect(result.messages).toEqual(["current session"]);
  });

  it("returns current-session player data rather than the UI's cached stats", () => {
    const engine = { getAutomationContext: () => ({ inputWait: null, position: null, player: null, messages: [], numberPadMode: { enabled: null, source: "unknown" } }) } as unknown as Nethack3DEngine;
    const result = executeLocalMcpRequest(engine, { id: 1, method: "get_state" }) as { player: unknown };
    expect(result.player).toBeNull();
  });

  it("refuses direction conversion with an unknown restored mode", () => {
    const submitAutomationAction = vi.fn();
    const engine = { submitAutomationAction, getAutomationContext: () => ({ numberPadMode: { enabled: null, source: "unknown" } }) } as unknown as Nethack3DEngine;
    expect(() => executeLocalMcpRequest(engine, { id: 1, method: "move", params: { sessionId: "s", requestId: 3, direction: "e" } })).toThrow(/unknown/);
    ui.directionQuestion = "In what direction?";
    try {
      expect(() => executeLocalMcpRequest(engine, { id: 2, method: "answer_prompt", params: { sessionId: "s", requestId: 4, answer: "n" } })).toThrow(/unknown/);
      executeLocalMcpRequest(engine, { id: 3, method: "answer_prompt", params: { sessionId: "s", requestId: 4, answer: "Escape" } });
      expect(submitAutomationAction).toHaveBeenCalledWith("s", 4, { type: "answer", key: "Escape" });
    } finally { ui.directionQuestion = null; }
  });
});
