import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WorkerRuntimeBridge from "./WorkerRuntimeBridge";
import type { RuntimeWorkerEnvelope } from "./types";
import type { RuntimeEventBatch, RuntimeProtocolHandshake } from "./protocol/types";

class FakeWorker {
  static current: FakeWorker;
  messages: any[] = [];
  onmessage: ((event: MessageEvent<RuntimeWorkerEnvelope>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  terminate = vi.fn();
  constructor() { FakeWorker.current = this; }
  postMessage(message: unknown): void { this.messages.push(structuredClone(message)); }
  emit(data: RuntimeWorkerEnvelope): void { this.onmessage?.({ data } as MessageEvent<RuntimeWorkerEnvelope>); }
}

const scope = { presentationGeneration: 0, levelGeneration: 0, level: null };
function handshake(sessionId: string): RuntimeProtocolHandshake {
  return {
    protocolVersion: 1,
    sessionId,
    runtimeVersion: "3.6.7",
    artifactTag: "test",
    pointerAbi: "nh367-pointer-v1",
    pointerAbiValidated: true,
    mapDimensions: { columns: 80, rows: 21 },
    capabilities: {
      orderedBatches: true,
      refreshSets: true,
      inputRequestIdentity: true,
      synchronousGlyphCallbacks: true,
      glyphQuery: true,
      floorQuery: false,
      underPlayerItemQuery: true,
    },
  };
}
function batch(sessionId: string, batchId: number, sequence: number, events: any[]): RuntimeEventBatch {
  return {
    type: "runtime_events",
    protocolVersion: 1,
    sessionId,
    batchId,
    sequenceStart: sequence,
    sequenceEnd: sequence + events.length - 1,
    scope,
    boundary: "control",
    events,
  };
}

beforeEach(() => {
  vi.stubGlobal("Worker", FakeWorker as unknown as typeof Worker);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("versioned worker bridge", () => {
  it("waits for the matching worker shutdown acknowledgement before terminating", async () => {
    const bridge = new WorkerRuntimeBridge(() => {});
    const started = bridge.start();
    const worker = FakeWorker.current;
    worker.emit({ type: "runtime_ready", protocol: handshake(bridge.sessionId) });
    await started;
    const retired = bridge.disposeAndWait();
    expect(bridge.disposeAndWait()).toBe(retired);
    expect(worker.messages[worker.messages.length - 1]).toMatchObject({ type: "shutdown", sessionId: bridge.sessionId });
    expect(worker.terminate).not.toHaveBeenCalled();
    worker.emit({ type: "runtime_shutdown_result", sessionId: "wrong-session" });
    expect(worker.terminate).not.toHaveBeenCalled();
    worker.emit({ type: "runtime_shutdown_result", sessionId: bridge.sessionId });
    await expect(retired).resolves.toBeUndefined();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("reports a drain failure or missing acknowledgement rather than claiming success", async () => {
    const failed = new WorkerRuntimeBridge(() => {});
    const firstWorker = FakeWorker.current;
    const firstStart = failed.start();
    firstWorker.emit({ type: "runtime_ready", protocol: handshake(failed.sessionId) });
    await firstStart;
    const failure = failed.disposeAndWait();
    firstWorker.emit({ type: "runtime_shutdown_result", sessionId: failed.sessionId, error: "storage failed" });
    await expect(failure).rejects.toThrow("storage failed");
    expect(firstWorker.terminate).toHaveBeenCalledOnce();

    const stalled = new WorkerRuntimeBridge(() => {});
    const secondWorker = FakeWorker.current;
    const secondStart = stalled.start();
    secondWorker.emit({ type: "runtime_ready", protocol: handshake(stalled.sessionId) });
    await secondStart;
    const timeout = stalled.disposeAndWait();
    const expectation = expect(timeout).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(10000);
    await expectation;
    expect(secondWorker.terminate).toHaveBeenCalledOnce();
  });

  it("can terminate a worker which was never started without waiting for an acknowledgement", async () => {
    const bridge = new WorkerRuntimeBridge(() => {});
    const worker = FakeWorker.current;
    await expect(bridge.disposeAndWait()).resolves.toBeUndefined();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("tracks a multi-selection sequence until its owning wait is consumed", async () => {
    const bridge = new WorkerRuntimeBridge(() => {});
    const started = bridge.start();
    FakeWorker.current.emit({ type: "runtime_ready", protocol: handshake(bridge.sessionId) });
    await started;
    FakeWorker.current.emit(batch(bridge.sessionId, 1, 1, [{ type: "input_wait", requestId: 10, purpose: "menu", state: "waiting" }]));
    const consumed = vi.fn();
    expect(bridge.claimAutomationInput(bridge.sessionId, 10, consumed)).toBe(true);
    bridge.sendInputSequence(["__MENU_SELECT__:2", "__MENU_SELECT__:3", "Enter"], { requestId: 10 });
    const command = FakeWorker.current.messages[FakeWorker.current.messages.length - 1];
    expect(command).toMatchObject({ type: "send_input_sequence", requestId: 10 });
    expect(consumed).not.toHaveBeenCalled();
    FakeWorker.current.emit(batch(bridge.sessionId, 2, 2, [
      { type: "input_consumed", commandId: command.commandId, requestId: 10 },
      { type: "input_wait", requestId: 10, state: "consumed" },
    ]));
    expect(consumed).toHaveBeenCalledOnce();
    bridge.dispose();
  });

  it("targets automation input to the observed wait and only acknowledges its own consumed command", async () => {
    const bridge = new WorkerRuntimeBridge(() => {});
    const started = bridge.start();
    FakeWorker.current.emit({ type: "runtime_ready", protocol: handshake(bridge.sessionId) });
    await started;
    FakeWorker.current.emit(batch(bridge.sessionId, 1, 1, [{ type: "input_wait", requestId: 10, purpose: "question", state: "waiting" }]));
    const consumed = vi.fn();
    expect(bridge.claimAutomationInput("other-session", 10, consumed)).toBe(false);
    expect(bridge.claimAutomationInput(bridge.sessionId, 9, consumed)).toBe(false);
    expect(bridge.claimAutomationInput(bridge.sessionId, 10, consumed)).toBe(true);
    expect(bridge.getAutomationInputWait()).toBeNull();
    bridge.sendInput("y", { requestId: 10 });
    const command = FakeWorker.current.messages[FakeWorker.current.messages.length - 1];
    expect(command.requestId).toBe(10);
    FakeWorker.current.emit(batch(bridge.sessionId, 2, 2, [
      { type: "input_consumed", commandId: command.commandId, requestId: 10 },
      { type: "input_wait", requestId: 10, purpose: "question", state: "consumed" },
      { type: "input_wait", requestId: 11, purpose: "question", state: "waiting" },
      { type: "question", inputRequestId: 11, text: "Continue?" },
    ]));
    expect(consumed).toHaveBeenCalledOnce();
    expect(bridge.getAutomationInputWait()).toEqual({ sessionId: bridge.sessionId, requestId: 11, purpose: "question", isPrompt: true });
    bridge.dispose();
  });

  it("does not acknowledge an automation answer when a human consumes its wait first", async () => {
    const bridge = new WorkerRuntimeBridge(() => {});
    const started = bridge.start();
    FakeWorker.current.emit({ type: "runtime_ready", protocol: handshake(bridge.sessionId) });
    await started;
    FakeWorker.current.emit(batch(bridge.sessionId, 1, 1, [{ type: "input_wait", requestId: 10, purpose: "question", state: "waiting" }]));
    bridge.sendInput("n"); // Human input was sent before the automation claim.
    const human = FakeWorker.current.messages[FakeWorker.current.messages.length - 1];
    const consumed = vi.fn();
    expect(bridge.claimAutomationInput(bridge.sessionId, 10, consumed)).toBe(true);
    bridge.sendInput("y", { requestId: 10 });
    const automation = FakeWorker.current.messages[FakeWorker.current.messages.length - 1];
    FakeWorker.current.emit(batch(bridge.sessionId, 2, 2, [
      { type: "input_consumed", commandId: human.commandId, requestId: 10 },
      { type: "input_wait", requestId: 10, purpose: "question", state: "consumed" },
      { type: "command_result", commandId: automation.commandId, requestId: 10, status: "rejected" },
      { type: "input_wait", requestId: 11, purpose: "command-or-position", state: "waiting" },
    ]));
    expect(consumed).not.toHaveBeenCalled();
    expect(bridge.getAutomationInputWait()?.requestId).toBe(11);
    bridge.dispose();
  });
  it("signals completed map observations without forwarding protocol bookkeeping", async () => {
    const events: any[] = [], bridge = new WorkerRuntimeBridge(event => events.push(event));
    const started = bridge.start();
    FakeWorker.current.emit({ type: "runtime_ready", protocol: handshake(bridge.sessionId) });
    await started;
    FakeWorker.current.emit(batch(bridge.sessionId, 1, 1, [
      { type: "map_glyph", x: 2, y: 3, glyph: 4 },
      { type: "runtime_boundary", reason: "snapshot-complete" },
    ]));
    expect(events).toEqual([{ type: "map_glyph", x: 2, y: 3, glyph: 4 }, {type:"map_update_complete"}]);
    expect(bridge.lastBoundary).toEqual({ reason: "snapshot-complete", sequence: 2 });
    FakeWorker.current.emit(batch(bridge.sessionId, 2, 3, [
      { type: "runtime_boundary", reason: "status-flush" },
      { type: "map_glyph", x: 3, y: 3, glyph: 4 },
      { type: "runtime_boundary", reason: "map-display" },
    ]));
    expect(events.slice(2)).toEqual([{ type: "map_glyph", x: 3, y: 3, glyph: 4 }, {type:"map_update_complete"}]);
    bridge.dispose();
  });
  it("keeps unknown key waits as typeahead unless an explicit prompt identifies the response", async () => {
    const bridge = new WorkerRuntimeBridge(() => {});
    const started = bridge.start();
    FakeWorker.current.emit({ type: "runtime_ready", protocol: handshake(bridge.sessionId) });
    await started;
    FakeWorker.current.emit(batch(bridge.sessionId, 1, 1, [{
      type: "input_wait", requestId: 44, callback: "shim_nhgetch", purpose: "unknown", state: "waiting",
    }]));
    bridge.sendInput("h"); bridge.sendInput("l");
    expect(FakeWorker.current.messages.slice(-2).every(message => message.requestId === undefined)).toBe(true);
    FakeWorker.current.emit(batch(bridge.sessionId, 2, 2, [
      { type: "input_wait", requestId: 44, callback: "shim_nhgetch", purpose: "unknown", state: "consumed" },
      { type: "input_wait", requestId: 45, callback: "shim_display_nhwindow", purpose: "unknown", state: "waiting" },
      { type: "info_menu", inputRequestId: 45, lines: ["More information"] },
    ]));
    bridge.sendInput("Enter");
    expect(FakeWorker.current.messages[FakeWorker.current.messages.length - 1].requestId).toBe(45);
    bridge.dispose();
  });
  it("queues pre-start refreshes, identifies commands and targets an active prompt wait", async () => {
    const events: any[] = [];
    const bridge = new WorkerRuntimeBridge(event => events.push(event), { runtimeVersion: "3.6.7" });
    const refresh = bridge.requestAreaUpdate(5, 6, 1);
    expect(FakeWorker.current.messages).toEqual([]);
    const started = bridge.start();
    expect(FakeWorker.current.messages).toHaveLength(1);
    expect(FakeWorker.current.messages[0]).toEqual(expect.objectContaining({
      type: "start", commandId: 1, sessionId: bridge.sessionId,
      startupOptions: expect.objectContaining({ protocolVersion: 1 }),
    }));
    FakeWorker.current.emit({ type: "runtime_ready", protocol: handshake(bridge.sessionId) });
    await started;
    expect(FakeWorker.current.messages[1]).toEqual(expect.objectContaining({
      type: "request_cells", commandId: 2, refreshId: 1,
      cells: expect.arrayContaining([{ x: 4, y: 5 }, { x: 6, y: 7 }]),
      scope,
    }));
    expect(FakeWorker.current.messages[1].cells).toHaveLength(9);

    FakeWorker.current.emit(batch(bridge.sessionId, 1, 1, [{
      type: "refresh_result", requestId: 1, complete: false,
      cells: [{ x: 4, y: 5, status: "deferred" }],
    }]));
    FakeWorker.current.emit(batch(bridge.sessionId, 2, 2, [{
      type: "refresh_result", requestId: 1, complete: true,
      cells: [{ x: 4, y: 5, status: "fresh" }],
    }]));
    await expect(refresh).resolves.toEqual(expect.objectContaining({ requestId: 1, complete: true }));

    FakeWorker.current.emit(batch(bridge.sessionId, 3, 3, [{
      type: "input_wait", requestId: 44, callback: "shim_getlin", purpose: "text", state: "waiting",
    }]));
    bridge.sendInput("__TEXT_INPUT__:hello");
    expect(FakeWorker.current.messages[FakeWorker.current.messages.length - 1]).toEqual(expect.objectContaining({
      type: "send_input", commandId: 3, requestId: 44, lastProcessedSequence: 3,
    }));
    expect(events).toEqual([]);
    bridge.dispose();
  });

  it("replays valid observations and fails closed on a sequence gap", async () => {
    const events: any[] = [];
    const bridge = new WorkerRuntimeBridge(event => events.push(event));
    const started = bridge.start();
    FakeWorker.current.emit({ type: "runtime_ready", protocol: handshake(bridge.sessionId) });
    await started;
    const refresh = bridge.requestTileUpdate(7, 8);
    FakeWorker.current.emit(batch(bridge.sessionId, 1, 1, [{ type: "player_position", x: 2, y: 3 }]));
    expect(events).toEqual([{ type: "player_position", x: 2, y: 3 }]);
    FakeWorker.current.emit(batch(bridge.sessionId, 2, 3, [{ type: "text", text: "lost" }]));
    expect(events[events.length - 1]).toEqual(expect.objectContaining({ type: "runtime_error", error: expect.stringContaining("discontinuous") }));
    await expect(refresh).resolves.toEqual(expect.objectContaining({
      complete: true,
      cells: [{ x: 7, y: 8, status: "cancelled" }],
    }));
    const messageCount = FakeWorker.current.messages.length;
    bridge.sendInput("i");
    expect(FakeWorker.current.messages).toHaveLength(messageCount);
    bridge.dispose();
  });

  it("keeps ordinary typeahead untargeted but identifies active position selection", async () => {
    const bridge = new WorkerRuntimeBridge(() => {});
    const started = bridge.start();
    FakeWorker.current.emit({ type: "runtime_ready", protocol: handshake(bridge.sessionId) });
    await started;
    FakeWorker.current.emit(batch(bridge.sessionId, 1, 1, [{
      type: "input_wait", requestId: 5, callback: "shim_nhgetch", purpose: "command-or-position", state: "waiting",
    }]));
    bridge.sendInput("i");
    expect(FakeWorker.current.messages[FakeWorker.current.messages.length - 1]).not.toHaveProperty("requestId");
    FakeWorker.current.emit(batch(bridge.sessionId, 2, 2, [
      { type: "position_input_state", active: true },
      { type: "input_wait", requestId: 6, callback: "shim_nh_poskey", purpose: "command-or-position", state: "waiting" },
    ]));
    bridge.sendInput("Escape");
    expect(FakeWorker.current.messages[FakeWorker.current.messages.length - 1]).toEqual(expect.objectContaining({ requestId: 6 }));
    bridge.dispose();
  });

  it("rejects a mismatched handshake", async () => {
    const events: any[] = [];
    const bridge = new WorkerRuntimeBridge(event => events.push(event));
    const started = bridge.start();
    FakeWorker.current.emit({ type: "runtime_ready", protocol: handshake("wrong") });
    await expect(started).rejects.toThrow("handshake is incompatible");
    bridge.dispose();
  });

  it("rejects the wrong runtime or an unvalidated pointer ABI", async () => {
    for (const protocol of [
      { ...handshake("placeholder"), runtimeVersion: "5.0" as const },
      { ...handshake("placeholder"), pointerAbiValidated: false },
    ]) {
      const bridge = new WorkerRuntimeBridge(() => {}, { runtimeVersion: "3.6.7" });
      const started = bridge.start();
      FakeWorker.current.emit({
        type: "runtime_ready",
        protocol: { ...protocol, sessionId: bridge.sessionId },
      });
      await expect(started).rejects.toThrow("handshake is incompatible");
      bridge.dispose();
    }
  });
});
