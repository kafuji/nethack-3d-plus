import { afterEach, describe, expect, it, vi } from "vitest";
import type Nethack3DEngine from "../game/Nethack3DEngine";
import { startLocalMcpClient } from "./local-mcp-client";

vi.mock("../state/gameStore", () => ({ useGameStore: { getState: () => ({}) } }));

const token = "a".repeat(64);
const fakeEngine = { getAutomationContext: vi.fn() } as unknown as Nethack3DEngine;
const appController = { execute: vi.fn() };

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("opt-in local MCP client", () => {
  it("prevents double polling and reuses the page identity on reconnect", () => {
    vi.stubGlobal("window", { location: new URL("http://127.0.0.1:5173/"), setTimeout });
    const fetchMock = vi.fn((_input: string, _init: { body: string }) => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    const stop = startLocalMcpClient(() => fakeEngine, token, () => {}, appController);
    expect(() => startLocalMcpClient(() => fakeEngine, token, () => {}, appController)).toThrow("already connected");
    const first = JSON.parse(fetchMock.mock.calls[0][1].body);
    stop();
    const stopAgain = startLocalMcpClient(() => fakeEngine, token, () => {}, appController);
    const second = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(second.clientId).toBe(first.clientId);
    stopAgain();
  });

  it("does not execute a request received after disconnection", async () => {
    vi.stubGlobal("window", { location: new URL("http://127.0.0.1:5173/"), setTimeout });
    let resolveFetch!: (value: unknown) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise(resolve => { resolveFetch = resolve; })));
    const stop = startLocalMcpClient(() => fakeEngine, token, () => {}, appController);
    stop();
    resolveFetch({ ok: true, json: async () => ({ request: { id: 1, method: "get_state" } }) });
    await Promise.resolve();
    await Promise.resolve();
    expect(fakeEngine.getAutomationContext).not.toHaveBeenCalled();
  });
});
