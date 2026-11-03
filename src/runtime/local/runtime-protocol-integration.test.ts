import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LocalNetHackRuntime from "../LocalNetHackRuntime";
import type { RuntimeSystems } from "./create-runtime-systems";
import { RuntimeBootstrap } from "./startup/bootstrap";

let runtime: LocalNetHackRuntime;
let systems: RuntimeSystems;
let events: any[];

beforeEach(() => {
  vi.spyOn(RuntimeBootstrap.prototype, "initializeNetHack").mockResolvedValue(undefined);
  vi.spyOn(console, "log").mockImplementation(() => {});
  events = [];
  runtime = new LocalNetHackRuntime(event => events.push(event), { protocolVersion: 1 });
  systems = (runtime as unknown as { systems: RuntimeSystems }).systems;
});
afterEach(() => {
  runtime.shutdown("test complete");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("assembled protocol contracts", () => {
  it("assigns an input wait to an inventory question emitted by end_menu", async () => {
    systems.menuSelection.currentMenuItems = [
      { menuIndex: 0, accelerator: "a", text: "an apple", identifier: 10, isCategory: false },
    ];
    const wait = runtime.handleUICallback("shim_end_menu", [4, "What do you want to eat?"]);
    expect(events).toContainEqual(expect.objectContaining({ type: "input_wait", requestId: 1, purpose: "menu", state: "waiting" }));
    expect(events).toContainEqual(expect.objectContaining({ type: "question", inputRequestId: 1, text: "What do you want to eat?" }));
    runtime.sendInput("__MENU_SELECT__:0", { sessionId: "s", commandId: 7, lastProcessedSequence: 0, requestId: 1 });
    expect(await wait).toBe("a".charCodeAt(0));
    await Promise.resolve();
    expect(events).toContainEqual(expect.objectContaining({ type: "input_consumed", commandId: 7, requestId: 1 }));
    expect(events).toContainEqual(expect.objectContaining({ type: "input_wait", requestId: 1, state: "consumed" }));
    runtime.sendInput("__MENU_SELECT__:0", { sessionId: "s", commandId: 8, lastProcessedSequence: 0, requestId: 1 });
    expect(events).toContainEqual(expect.objectContaining({ type: "command_result", commandId: 8, status: "rejected" }));
  });

  it("tracks the extended-command trigger to its originating wait", async () => {
    const wait = runtime.handleUICallback("shim_nhgetch", []);
    runtime.sendInputSequence(["#", "d", "i", "p", "Enter"], { sessionId: "s", commandId: 8, lastProcessedSequence: 0, requestId: 1 });
    expect(await wait).toBe("#".charCodeAt(0));
    expect(systems.extendedCommands.pendingExtendedCommand).toBe("dip");
    expect(events).toContainEqual(expect.objectContaining({ type: "input_consumed", commandId: 8, requestId: 1 }));
  });

  it("tracks an empty explicit text answer and an Escape answer to their waits", async () => {
    const heap = new Uint8Array(4096);
    heap[64] = 65;
    runtime.nethackModule = { HEAPU8: heap };
    const text = runtime.handleUICallback("shim_getlin", ["Name?", 64]);
    runtime.sendInput("__TEXT_INPUT__:", { sessionId: "s", commandId: 2, lastProcessedSequence: 0, requestId: 1 });
    await text;
    expect(heap[64]).toBe(0);
    expect(events).toContainEqual(expect.objectContaining({ type: "input_consumed", commandId: 2, requestId: 1 }));
    await Promise.resolve();
    const question = runtime.handleUICallback("shim_yn_function", ["Really?", "yn", 110]);
    runtime.sendInput("Escape", { sessionId: "s", commandId: 3, lastProcessedSequence: 0, requestId: 2 });
    await question;
    expect(events).toContainEqual(expect.objectContaining({ type: "input_consumed", commandId: 3, requestId: 2 }));
  });

  it.each(["Escape", "Enter"])('ends a position request after a targeted %s', async key => {
    runtime.nethackModule = { HEAPU8: new Uint8Array(4096), setValue: vi.fn() };
    systems.positionInput.activateTargetPositionInputFromPrompt("Where do you want to hit?");
    const wait = runtime.handleUICallback("shim_nh_poskey", [64, 68, 72]);
    runtime.sendInput(key, { sessionId: "s", commandId: 5, lastProcessedSequence: 0, requestId: 1 });
    expect(await wait).toBe(key === "Escape" ? 27 : 46);
    expect(systems.positionInput.positionInputActive).toBe(false);
    expect(events).toContainEqual(expect.objectContaining({ type: "input_consumed", commandId: 5, requestId: 1 }));
  });

  it("only consumes a multi-select wait after the final confirmation", async () => {
    const menu = systems.menuSelection;
    menu.currentMenuItems = [
      { menuIndex: 2, accelerator: "a", text: "potion", identifier: 10 },
      { menuIndex: 3, accelerator: "b", text: "scroll", identifier: 11 },
    ];
    menu.isInMultiPickup = true;
    vi.spyOn(menu, "writeMenuSelectionResult").mockImplementation(() => {});
    const wait = runtime.protocol.invokeCallback("shim_select_menu", () => new Promise<number>(resolve => {
      menu.pendingMenuSelection = { resolver: resolve, menuListPtrPtr: 0 };
    })) as Promise<number>;
    const counts: number[] = [];
    const original = systems.inputDispatch.handleClientInput.bind(systems.inputDispatch);
    vi.spyOn(systems.inputDispatch, "handleClientInput").mockImplementation((...args) => {
      const result = original(...args);
      counts.push(events.filter(event => event.type === "input_consumed").length);
      return result;
    });
    runtime.sendInputSequence(["__MENU_SELECT__:2", "__MENU_SELECT__:3", "Enter"], { sessionId: "s", commandId: 9, lastProcessedSequence: 0, requestId: 1 });
    expect(await wait).toBe(2);
    expect(counts).toEqual([0, 0, 1]);
    expect(events).toContainEqual(expect.objectContaining({ type: "input_consumed", commandId: 9, requestId: 1 }));
  });

  it("publishes the negotiated artifact, ABI, dimensions and helper capabilities", () => {
    vi.stubGlobal("nethackGlobal", {
      nh3dSynchronousGlyphCallbacks: 1,
      helpers: { glyphAtHelper() {}, topItemGlyphUnderPlayer() {} },
      constants: {},
    });
    systems.pointerContract.runtimePointerContractValidated = true;
    const handshake = runtime.getProtocolHandshake("session-a");
    expect(handshake).toEqual(expect.objectContaining({
      protocolVersion: 1,
      sessionId: "session-a",
      runtimeVersion: "3.6.7",
      pointerAbiValidated: true,
      mapDimensions: { columns: 80, rows: 21 },
      capabilities: expect.objectContaining({
        orderedBatches: true,
        refreshSets: true,
        inputRequestIdentity: true,
        synchronousGlyphCallbacks: true,
        glyphQuery: true,
        floorQuery: false,
        underPlayerItemQuery: true,
      }),
    }));
  });

  it("binds an answer to its concrete question wait without changing the owner Promise", async () => {
    const answer = runtime.handleUICallback("shim_yn_function", ["Really?", "yn", 110]);
    expect(events.slice(0, 2)).toEqual([
      expect.objectContaining({ type: "input_wait", requestId: 1, state: "waiting" }),
      expect.objectContaining({ type: "question", inputRequestId: 1, text: "Really?" }),
    ]);
    runtime.sendInput("y", { sessionId: "s", commandId: 4, lastProcessedSequence: 2, requestId: 1 });
    expect(await answer).toBe(121);
    await Promise.resolve();
    expect(events).toContainEqual(expect.objectContaining({ type: "input_consumed", commandId: 4, requestId: 1 }));
    expect(events).toContainEqual(expect.objectContaining({ type: "input_wait", requestId: 1, state: "consumed" }));
    expect(systems.questionInput.activeYnPrompt).toBeNull();
  });

  it("rejects an answer for a closed request without leaking it into typeahead", async () => {
    const answer = runtime.handleUICallback("shim_yn_function", ["Continue?", "yn", 110]);
    runtime.sendInput("n", { sessionId: "s", commandId: 1, lastProcessedSequence: 0, requestId: 1 });
    expect(await answer).toBe(110);
    await Promise.resolve();
    runtime.sendInput("y", { sessionId: "s", commandId: 2, lastProcessedSequence: 0, requestId: 1 });
    expect(events).toContainEqual(expect.objectContaining({ type: "command_result", commandId: 2, status: "rejected" }));
    expect(systems.inputRequests.inputBroker.drain()).toEqual([]);
  });

  it("returns cached refresh data while suspended, then reports fresh completion once", async () => {
    const glyphAtHelper = vi.fn(() => 110);
    vi.stubGlobal("nethackGlobal", {
      globals: { u: { uz: { dnum: 0, dlevel: 1 } } },
      helpers: { glyphAtHelper, mapglyphHelper: () => ({ ch: 43, color: 7, tileidx: 12 }) },
    });
    runtime.emit({ type: "protocol_probe" });
    const scope = { ...runtime.protocol.scope, level: { ...runtime.protocol.scope.level! } };
    systems.mapCallbacks.gameMap.set("4,5", { x: 4, y: 5, glyph: 101, char: "!", color: 2 });
    const wait = runtime.handleUICallback("shim_nhgetch", []);
    runtime.requestCells(20, [{ x: 4, y: 5 }, { x: 4, y: 5 }], scope);
    expect(glyphAtHelper).not.toHaveBeenCalled();
    expect(events).toContainEqual(expect.objectContaining({
      type: "refresh_result",
      requestId: 20,
      complete: false,
      cells: [{ x: 4, y: 5, status: "deferred", cached: true }],
    }));
    runtime.sendInput("i", { sessionId: "s", commandId: 1, lastProcessedSequence: 0 });
    expect(await wait).toBe(105);
    await Promise.resolve();
    expect(glyphAtHelper).toHaveBeenCalledExactlyOnceWith(4, 5);
    expect(events).toContainEqual(expect.objectContaining({
      type: "refresh_result",
      requestId: 20,
      complete: true,
      cells: [{ x: 4, y: 5, status: "fresh" }],
    }));
  });

  it("cancels a refresh from an obsolete level generation", () => {
    vi.stubGlobal("nethackGlobal", {
      globals: { u: { uz: { dnum: 0, dlevel: 2 } } },
      helpers: { glyphAtHelper: vi.fn(() => 110) },
    });
    runtime.emit({ type: "protocol_probe" });
    runtime.requestCells(9, [{ x: 1, y: 1 }], {
      presentationGeneration: 0,
      levelGeneration: 1,
      level: { dnum: 0, dlevel: 1 },
    });
    expect(events).toContainEqual(expect.objectContaining({
      type: "refresh_result",
      requestId: 9,
      complete: true,
      cells: [{ x: 1, y: 1, status: "cancelled" }],
    }));
    expect((globalThis as any).nethackGlobal.helpers.glyphAtHelper).not.toHaveBeenCalled();
  });

  it("reports decode failure instead of claiming a partially decoded cell is fresh", () => {
    vi.stubGlobal("nethackGlobal", {
      globals: { u: { uz: { dnum: 0, dlevel: 1 } } },
      helpers: {
        glyphAtHelper: () => 110,
        mapglyphHelper: () => { throw new Error("decode failed"); },
      },
    });
    runtime.emit({ type: "protocol_probe" });
    const scope = { ...runtime.protocol.scope, level: { ...runtime.protocol.scope.level! } };
    runtime.requestCells(22, [{ x: 4, y: 5 }], scope);
    expect(events).toContainEqual(expect.objectContaining({
      type: "refresh_result",
      requestId: 22,
      complete: true,
      cells: [{ x: 4, y: 5, status: "failed" }],
    }));
  });

  it("cancels deferred refreshes as soon as the runtime changes levels", () => {
    vi.stubGlobal("nethackGlobal", {
      globals: { u: { uz: { dnum: 0, dlevel: 1 } } },
      helpers: { glyphAtHelper: vi.fn(() => 110) },
    });
    runtime.emit({ type: "protocol_probe" });
    const scope = { ...runtime.protocol.scope, level: { ...runtime.protocol.scope.level! } };
    void runtime.handleUICallback("shim_nhgetch", []);
    runtime.requestCells(30, [{ x: 2, y: 2 }], scope);
    (globalThis as any).nethackGlobal.globals.u.uz.dlevel = 2;
    runtime.emit({ type: "clear_scene" });
    expect(events).toContainEqual(expect.objectContaining({
      type: "refresh_result",
      requestId: 30,
      complete: true,
      cells: [{ x: 2, y: 2, status: "cancelled" }],
    }));
  });
});
