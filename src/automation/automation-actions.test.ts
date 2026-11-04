import { beforeAll, describe, expect, it, vi } from "vitest";
import type Nethack3DEngine from "../game/Nethack3DEngine";
import WorkerRuntimeBridge from "../runtime/WorkerRuntimeBridge";
import { ObservedNumberPad } from "./observed-number-pad";
import { ObservedStatus } from "./observed-status";

let Engine: typeof Nethack3DEngine;
beforeAll(async () => {
  vi.stubGlobal("window", { location: { protocol: "http:" }, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
  Engine = (await import("../game/Nethack3DEngine")).default;
});

function fixture(options: { pickup?: boolean; question?: boolean; text?: boolean; info?: boolean; blocking?: boolean; gameOver?: boolean; purpose?: string; isPrompt?: boolean } = {}) {
  let consumed: (() => void) | undefined;
  const session = Object.assign(Object.create(WorkerRuntimeBridge.prototype), {
    getAutomationInputWait: vi.fn(() => ({ sessionId: "s", requestId: 7, purpose: options.purpose ?? "question", isPrompt: options.isPrompt ?? true })),
    claimAutomationInput: vi.fn((_sessionId: string, _requestId: number, callback?: () => void) => { consumed = callback; return true; }),
  }) as WorkerRuntimeBridge;
  const questions = {
    isInQuestion: options.question ?? false,
    activeQuestionText: "Select number_pad mode",
    isNumberPadModeQuestion: (text: string) => text === "Select number_pad mode",
    activeQuestionChoices: "yn",
    activeQuestionDefaultChoice: "n",
    activeQuestionMenuItems: options.pickup ? [{ menuIndex: 2, text: "potion" }, { menuIndex: 3, text: "scroll" }] : [],
    activeQuestionIsPickupDialog: options.pickup ?? false,
    activePickupSelections: new Set<string>(), activePickupSelectionCounts: new Map<string, number>(),
    getMenuSelectionStateKey: (item: { menuIndex: number }) => `menu-index:${item.menuIndex}`,
    isSelectableQuestionMenuItem: (item: { isCategory?: boolean }) => !item.isCategory,
    getQuestionMenuSelectionInput: (item: { menuIndex: number }) => `__MENU_SELECT__:${item.menuIndex}`,
    encodeMenuSelectionInputWithCount: (input: string, count: number | null) => count === null ? input : `${input}:${count}`,
    hideQuestion: vi.fn(),
  };
  const dialogs = {
    isInfoDialogVisible: options.info ?? false,
    infoMenuBlockingActive: options.blocking ?? false,
    isTextInputActive: options.text ?? false,
    isInventoryDialogVisible: false,
    hideInfoMenuDialog: vi.fn(), hideTextInputRequest: vi.fn(), hideInventoryDialog: vi.fn(),
  };
  const input = { textInputPrefix: "__TEXT_INPUT__:", menuSelectionInputPrefix: "__MENU_SELECT__:", sendInput: vi.fn(), sendInputSequence: vi.fn(), updateNumberPadModeFromChoice: vi.fn() };
  const engine = Object.create(Engine.prototype) as Nethack3DEngine;
  const automationNumberPad = new ObservedNumberPad();
  automationNumberPad.reset("resume", null);
  Object.assign(engine, { automationNumberPad, systems: { engineState: { session }, questionMenus: questions,
    directionPrompts: { isInDirectionQuestion: false, hideDirectionQuestion: vi.fn() },
    promptDialogs: dialogs, positionSelection: { positionInputModeActive: false },
    gameOver: { gameOverState: { active: options.gameOver ?? false }, isGameOverUiRevealBlocked: () => false }, inputCommands: input } });
  return { engine, session, questions, dialogs, input, automationNumberPad, consume: () => consumed?.() };
}

describe("runtime automation actions", () => {
  it("continues a paused game-over screen without a worker input wait and rejects stale observations", () => {
    const f = fixture({ gameOver: true });
    Object.assign(f.session, { sessionId: "death-session", getAutomationInputWait: () => null });
    let blocked = true;
    const gameOver = (f.engine as any).systems.gameOver;
    gameOver.isGameOverUiRevealBlocked = () => blocked;
    gameOver.releaseDeferredGameOverUiReveal = vi.fn(() => { blocked = false; return true; });
    Object.assign(f.engine, { automationGameOverRevealId: 3 });
    expect(() => f.engine.continueAutomationGameOver("old-session", 3)).toThrow(/stale/);
    expect(() => f.engine.continueAutomationGameOver("death-session", 2)).toThrow(/stale/);
    f.engine.continueAutomationGameOver("death-session", 3);
    expect(gameOver.releaseDeferredGameOverUiReveal).toHaveBeenCalledOnce();
    expect(() => f.engine.continueAutomationGameOver("death-session", 3)).toThrow(/stale/);
    expect(f.input.sendInput).not.toHaveBeenCalled();
    expect(f.session.claimAutomationInput).not.toHaveBeenCalled();
  });

  it("returns player stats only for the session that emitted a status update", () => {
    const f = fixture();
    const status = new ObservedStatus();
    const session = f.session as WorkerRuntimeBridge & { sessionId: string; getAutomationObservationScope: () => object };
    Object.assign(session, { sessionId: "session-a", getAutomationObservationScope: () => ({}) });
    const values = { hp: 12, name: "Current" };
    Object.assign(f.engine, {
      automationStatus: status,
      automationObservations: { observe: vi.fn(), snapshot: vi.fn(() => ({})) },
      automationInventory: { observe: vi.fn(), snapshot: vi.fn(() => ({})) },
    });
    const systems = (f.engine as any).systems;
    Object.assign(systems, {
      playerMovement: { hasSeenPlayerPosition: false },
      playerStatus: { playerStats: values },
      engineMessages: { gameMessages: [] },
    });
    expect(f.engine.getAutomationContext().player).toBeNull();
    status.observe({ type: "status_update" }, "session-a");
    const player = f.engine.getAutomationContext().player;
    expect(player).toEqual(values);
    expect(player).not.toBe(values);
    Object.assign(session, { sessionId: "session-b" });
    expect(f.engine.getAutomationContext().player).toBeNull();
  });

  it("submits multiple counted selections against the observed wait and hides only after consumption", () => {
    const f = fixture({ question: true, pickup: true });
    f.engine.submitAutomationAction("s", 7, { type: "menu", selections: [{ index: 0, count: 3 }, { index: 1 }] });
    expect(f.input.sendInputSequence).toHaveBeenCalledWith(["__MENU_SELECT__:2:3", "__MENU_SELECT__:3", "Enter"], { requestId: 7 });
    expect(f.questions.hideQuestion).not.toHaveBeenCalled();
    f.consume();
    expect(f.questions.hideQuestion).toHaveBeenCalledOnce();
  });

  it("rejects stale and invalid selections without sending input", () => {
    const f = fixture({ question: true, pickup: true });
    expect(() => f.engine.submitAutomationAction("s", 8, { type: "menu", selections: [{ index: 0 }] })).toThrow(/stale/);
    expect(() => f.engine.submitAutomationAction("s", 7, { type: "menu", selections: [{ index: 9 }] })).toThrow(/not available/);
    expect(f.input.sendInput).not.toHaveBeenCalled();
    expect(f.input.sendInputSequence).not.toHaveBeenCalled();
  });

  it("rejects counts that would wrap in the native signed 32-bit menu result", () => {
    const f = fixture({ question: true, pickup: true });
    for (const count of [2147483648, 4294967295, Number.MAX_SAFE_INTEGER]) {
      expect(() => f.engine.submitAutomationAction("s", 7, { type: "menu", selections: [{ index: 0, count }] })).toThrow(/Invalid menu count/);
    }
    expect(f.session.claimAutomationInput).not.toHaveBeenCalled();
    expect(f.input.sendInput).not.toHaveBeenCalled();
    expect(f.input.sendInputSequence).not.toHaveBeenCalled();
    f.engine.submitAutomationAction("s", 7, { type: "menu", selections: [{ index: 0, count: 2147483647 }] });
    expect(f.input.sendInputSequence).toHaveBeenCalledWith(["__MENU_SELECT__:2:2147483647", "Enter"], { requestId: 7 });
  });

  it("keeps human-selected items and changes only the requested selection set", () => {
    const f = fixture({ question: true, pickup: true });
    f.questions.activePickupSelections.add("menu-index:2");
    f.engine.submitAutomationAction("s", 7, { type: "menu", selections: [{ index: 0 }, { index: 1 }] });
    expect(f.input.sendInputSequence).toHaveBeenCalledWith(["__MENU_SELECT__:3", "Enter"], { requestId: 7 });
  });

  it("handles text and postmortem prompts without dismissing them before consumption", () => {
    const f = fixture({ text: true, gameOver: true, purpose: "text" });
    f.engine.submitAutomationAction("s", 7, { type: "text", text: "Elbereth" });
    expect(f.input.sendInput).toHaveBeenCalledWith("__TEXT_INPUT__:Elbereth", { requestId: 7 });
    expect(f.dialogs.hideTextInputRequest).not.toHaveBeenCalled();
    f.consume();
    expect(f.dialogs.hideTextInputRequest).toHaveBeenCalledOnce();
  });

  it("cancels a text prompt only against its wait and hides it only after consumption", () => {
    const f = fixture({ text: true, purpose: "text" });
    expect(() => f.engine.submitAutomationAction("s", 8, { type: "dismiss" })).toThrow(/stale/);
    expect(f.input.sendInput).not.toHaveBeenCalled();
    f.engine.submitAutomationAction("s", 7, { type: "dismiss" });
    expect(f.input.sendInput).toHaveBeenCalledWith("__TEXT_INPUT__:\x1b", { requestId: 7 });
    expect(f.dialogs.hideTextInputRequest).not.toHaveBeenCalled();
    f.consume();
    expect(f.dialogs.hideTextInputRequest).toHaveBeenCalledOnce();
  });

  it("does not dismiss a text prompt when its wait was already claimed", () => {
    const f = fixture({ text: true, purpose: "text" });
    vi.mocked(f.session.claimAutomationInput).mockReturnValue(false);
    expect(() => f.engine.submitAutomationAction("s", 7, { type: "dismiss" })).toThrow(/stale/);
    expect(f.input.sendInput).not.toHaveBeenCalled();
    expect(f.dialogs.hideTextInputRequest).not.toHaveBeenCalled();
  });

  it("only closes a blocking information dialog when its matching input was consumed", () => {
    const f = fixture({ info: true, blocking: true });
    f.engine.submitAutomationAction("s", 7, { type: "dismiss" });
    expect(f.input.sendInput).toHaveBeenCalledWith(" ", { requestId: 7 });
    expect(f.dialogs.hideInfoMenuDialog).not.toHaveBeenCalled();
    f.consume();
    expect(f.dialogs.infoMenuBlockingActive).toBe(false);
    expect(f.dialogs.hideInfoMenuDialog).toHaveBeenCalledOnce();
  });

  it("rejects regular commands while a question is open", () => {
    const f = fixture({ question: true, purpose: "command-or-position" });
    expect(() => f.engine.submitAutomationAction("s", 7, { type: "command", key: "o" })).toThrow(/not waiting/);
    expect(f.input.sendInput).not.toHaveBeenCalled();
  });

  it("normalizes default and case-insensitive answers and updates input mode only on consumption", () => {
    const f = fixture({ question: true });
    f.engine.submitAutomationAction("s", 7, { type: "answer", key: "Enter" });
    expect(f.input.sendInput).toHaveBeenCalledWith("n", { requestId: 7 });
    expect(f.input.updateNumberPadModeFromChoice).not.toHaveBeenCalled();
    expect(f.questions.hideQuestion).not.toHaveBeenCalled();
    f.consume();
    expect(f.input.updateNumberPadModeFromChoice).toHaveBeenCalledWith("n");
    expect(f.questions.hideQuestion).toHaveBeenCalledOnce();

    const caseAnswer = fixture({ question: true });
    caseAnswer.engine.submitAutomationAction("s", 7, { type: "answer", key: "Y" });
    expect(caseAnswer.input.sendInput).toHaveBeenCalledWith("y", { requestId: 7 });
  });

  it("updates numeric number-pad choices only after consumption, including the default", () => {
    const f = fixture({ question: true });
    f.questions.activeQuestionChoices = "012";
    f.questions.activeQuestionDefaultChoice = "0";
    f.engine.submitAutomationAction("s", 7, { type: "answer", key: "Enter" });
    expect(f.input.sendInput).toHaveBeenCalledWith("Enter", { requestId: 7 });
    expect(f.input.updateNumberPadModeFromChoice).not.toHaveBeenCalled();
    expect(f.automationNumberPad.snapshot().enabled).toBeNull();
    f.consume();
    expect(f.input.updateNumberPadModeFromChoice).toHaveBeenCalledWith("0");
    expect(f.automationNumberPad.snapshot()).toEqual({ enabled: false, source: "answered-option" });
  });

  it("does not update UI on an invalid answer, stale wait, or failed claim", () => {
    const f = fixture({ question: true });
    expect(() => f.engine.submitAutomationAction("s", 7, { type: "answer", key: "x" })).toThrow(/not valid/);
    expect(() => f.engine.submitAutomationAction("s", 8, { type: "answer", key: "y" })).toThrow(/stale/);
    vi.mocked(f.session.claimAutomationInput).mockReturnValue(false);
    expect(() => f.engine.submitAutomationAction("s", 7, { type: "answer", key: "y" })).toThrow(/stale/);
    expect(f.input.sendInput).not.toHaveBeenCalled();
    expect(f.input.updateNumberPadModeFromChoice).not.toHaveBeenCalled();
    expect(f.automationNumberPad.snapshot().enabled).toBeNull();
    expect(f.questions.hideQuestion).not.toHaveBeenCalled();
  });
});
