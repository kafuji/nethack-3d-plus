import { describe, expect, it, vi } from "vitest";
import type { LocalMcpAppDependencies } from "./local-mcp-app";
import { createLocalMcpAppController } from "./local-mcp-app";
import { createDefaultStartupInitOptionValues, serializeStartupInitOptionTokens } from "../../../runtime/startup-init-options";

const fixtures = vi.hoisted(() => ({ saves: [] as unknown[] }));
vi.mock("../startup/saved-games", () => ({ fetchSavedGames: vi.fn(async () => fixtures.saves) }));
const trial = vi.hoisted(() => ({ characters: [] as unknown[], restoreTrialSlot: vi.fn(), restoreAutoSnapshot: vi.fn() }));
vi.mock("../../../plus/trial/trial-slots", () => ({ listTrialCharacters: vi.fn(async () => trial.characters), restoreTrialSlot: trial.restoreTrialSlot, restoreAutoSnapshot: trial.restoreAutoSnapshot, TRIAL_SLOT_COUNT: 3 }));

function setup() {
  const deps = {
    characterCreationConfig: null,
    startupFlowStep: "variant",
    runtimeVersion: "3.6.7",
    startupInitOptionValues: createDefaultStartupInitOptionValues(),
    gameOver: { active: false, promptReady: false },
    newGamePrompt: { visible: false, reason: null },
    globalConfirmationDialog: null,
    handleStartNewGame: vi.fn(async () => {}),
    startNewGameFromPrompt: vi.fn(),
    resolveConfirmation: vi.fn(),
    requestConfirmationChoice: vi.fn(async () => "cancel"),
  } as unknown as LocalMcpAppDependencies;
  return { deps, controller: createLocalMcpAppController(() => deps) };
}

describe("local MCP app controller", () => {
  it.each(["normal", "explore", "debug", "trial"])("supports explicit %s playmode without changing other startup choices", async playmode => {
    const { deps, controller } = setup();
    deps.startupInitOptionValues.playmode = "explore";
    deps.startupInitOptionValues.number_pad = "0";
    await controller.execute("start_game", { mode: "random", runtimeVersion: "3.6.7", name: "Test", playmode });
    expect(deps.handleStartNewGame).toHaveBeenCalledWith(expect.objectContaining({ initOptions: expect.arrayContaining([`playmode:${playmode}`, "number_pad:0"]) }));
    expect(deps.startupInitOptionValues.playmode).toBe("explore");
  });

  it("allows implicit normal but rejects other explicit playmodes for Slash'EM", async () => {
    const { deps, controller } = setup();
    await expect(controller.execute("start_game", { mode: "random", runtimeVersion: "slashem", name: "Test", playmode: "trial" })).rejects.toThrow("does not support");
    await controller.execute("start_game", { mode: "random", runtimeVersion: "slashem", name: "Test", playmode: "normal" });
    const config = vi.mocked(deps.handleStartNewGame).mock.calls[0][0];
    expect(config.initOptions?.some(token => token.startsWith("playmode:"))).toBe(false);
  });

  it.each(["3.6.7", "5.0", "slashem"] as const)("uses the UI startup options for new %s games", async runtimeVersion => {
    const { deps, controller } = setup();
    deps.startupInitOptionValues.number_pad = "0";
    deps.startupInitOptionValues.playmode = "trial";
    await controller.execute("start_game", { mode: "random", runtimeVersion, name: "Test" });
    expect(deps.handleStartNewGame).toHaveBeenCalledWith(expect.objectContaining({
      mode: "random", runtimeVersion,
      initOptions: serializeStartupInitOptionTokens(deps.startupInitOptionValues, runtimeVersion),
    }));
    const actual = vi.mocked(deps.handleStartNewGame).mock.calls[0][0].initOptions;
    expect(actual).toContain("number_pad:0");
    if (runtimeVersion === "slashem") expect(actual).not.toContain("playmode:trial");
    else expect(actual).toContain("playmode:trial");
  });

  it("passes the default number-pad setting rather than assuming the WASM default", async () => {
    const { deps, controller } = setup();
    await controller.execute("start_game", { mode: "random", runtimeVersion: "3.6.7", name: "Test" });
    expect(vi.mocked(deps.handleStartNewGame).mock.calls[0][0].initOptions).toContain("number_pad:1");
  });

  it("starts an allowed character and preserves runtime and selected options", async () => {
    const { deps, controller } = setup();
    expect(await controller.execute("get_app_state", {})).toMatchObject({ phase: "title", confirmation: null });
    const result = await controller.execute("start_game", { mode: "create", runtimeVersion: "3.6.7", name: "Test", role: "Knight", race: "human", gender: "female", align: "lawful" });
    expect(result).toMatchObject({ status: "requested", operationId: 1 });
    expect(deps.handleStartNewGame).toHaveBeenCalledWith(expect.objectContaining({ mode: "create", runtimeVersion: "3.6.7", name: "Test", role: "Knight" }));
    await expect(controller.execute("start_game", { mode: "create", runtimeVersion: "3.6.7", name: "Test", role: "Knight", race: "elf", gender: "female", align: "chaotic" })).rejects.toThrow("Invalid role");
  });

  it("accepts each observed confirmation at most once and rejects stale IDs", async () => {
    const { deps, controller } = setup();
    deps.globalConfirmationDialog = { title: "Overwrite?", message: "Existing save", confirmLabel: "Overwrite", cancelLabel: "Cancel", extraLabel: "Load", confirmClassName: "", extraClassName: "" };
    const state = await controller.execute("get_app_state", {}) as { confirmation: { confirmationId: number } };
    await expect(controller.execute("respond_confirmation", { confirmationId: state.confirmation.confirmationId + 1, choice: "confirm" })).rejects.toThrow("stale");
    await controller.execute("respond_confirmation", { confirmationId: state.confirmation.confirmationId, choice: "cancel" });
    expect(deps.resolveConfirmation).toHaveBeenCalledOnce();
    await expect(controller.execute("respond_confirmation", { confirmationId: state.confirmation.confirmationId, choice: "confirm" })).rejects.toThrow("stale");
  });

  it("loads only currently resumable saves and refuses active game abandonment", async () => {
    const { deps, controller } = setup();
    fixtures.saves = [{ key: "manual:Test", name: "Test", displayName: "Test", category: "manual", isResumable: true, timestamp: new Date("2026-01-01T00:00:00Z"), initOptions: [] }];
    expect(await controller.execute("list_saves", { runtimeVersion: "3.6.7" })).toMatchObject({ saves: [{ key: "manual:Test", isResumable: true }] });
    await expect(controller.execute("load_game", { runtimeVersion: "3.6.7", saveKey: "absent" })).rejects.toThrow("not found");
    await controller.execute("load_game", { runtimeVersion: "3.6.7", saveKey: "manual:Test" });
    expect(deps.handleStartNewGame).toHaveBeenCalledWith(expect.objectContaining({ mode: "resume", name: "Test", resumeCategory: "manual" }));
    deps.characterCreationConfig = { mode: "random", name: "Test" };
    await expect(controller.execute("return_to_title", {})).rejects.toThrow("has not finished");
    deps.newGamePrompt = { visible: true, reason: null };
    await controller.execute("return_to_title", {});
    expect(deps.startNewGameFromPrompt).toHaveBeenCalledOnce();
  });

  it("lists trial saves but refuses unsafe restoration before any side effects", async () => {
    const { deps, controller } = setup();
    const savedAt = new Date("2026-01-01T00:00:00Z");
    trial.characters = [{ name: "Test", displayName: "Test", slots: [{ savedAt, turn: 2, dlevel: 1 }, null, null], snapshots: [] }];
    trial.restoreTrialSlot.mockReset();
    trial.restoreAutoSnapshot.mockReset();
    expect(await controller.execute("list_trial_saves", { runtimeVersion: "3.6.7" })).toMatchObject({ characters: [{ name: "Test", slots: [{ slot: 1 }, null, null] }] });
    await expect(controller.execute("load_trial_save", { runtimeVersion: "3.6.7", name: "Test", kind: "slot", slot: 1 })).rejects.toThrow("unavailable");
    await expect(controller.execute("load_trial_save", { runtimeVersion: "3.6.7", name: "Test", kind: "snapshot", snapshotId: "snap" })).rejects.toThrow("unavailable");
    expect(deps.requestConfirmationChoice).not.toHaveBeenCalled();
    expect(trial.restoreTrialSlot).not.toHaveBeenCalled();
    expect(trial.restoreAutoSnapshot).not.toHaveBeenCalled();
    expect(deps.handleStartNewGame).not.toHaveBeenCalled();
  });
});
