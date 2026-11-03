import type { CharacterCreationConfig, GameOverState, NewGamePromptState } from "../../../game/ui-types";
import { resolveStartupCreateCharacterOptionSet } from "../../../game/helpers/startup-character-constraints";
import type { NethackRuntimeVersion } from "../../../runtime/types";
import { isStartupInitOptionSupported, serializeStartupInitOptionTokens, type StartupInitOptionValues } from "../../../runtime/startup-init-options";
import type { ConfirmationDialogChoice, ConfirmationDialogRequest, ConfirmationDialogState } from "../../modals/useConfirmationDialog";
import { fetchSavedGames } from "../startup/saved-games";
import type { StartupFlowStep } from "../startup/character-preferences";
import { listTrialCharacters } from "../../../plus/trial/trial-slots";

export interface LocalMcpAppDependencies {
  characterCreationConfig: CharacterCreationConfig | null;
  startupFlowStep: StartupFlowStep;
  startupInitialLoadingVisible: boolean;
  runtimeVersion: NethackRuntimeVersion;
  startupInitOptionValues: StartupInitOptionValues;
  gameOver: GameOverState;
  newGamePrompt: NewGamePromptState;
  globalConfirmationDialog: ConfirmationDialogState | null;
  handleStartNewGame: (config: CharacterCreationConfig) => Promise<void>;
  startNewGameFromPrompt: () => void;
  resolveConfirmation: (choice: ConfirmationDialogChoice) => void;
  requestConfirmationChoice: (request: ConfirmationDialogRequest) => Promise<ConfirmationDialogChoice>;
}

type Operation = { id: number; method: string; status: "pending" | "completed" | "cancelled" | "failed"; error?: string };
const versions = new Set<NethackRuntimeVersion>(["3.6.7", "5.0", "slashem"]);

/** Keep one controller for the page lifetime; dependencies are read live on each request. */
export function createLocalMcpAppController(read: () => LocalMcpAppDependencies) {
  let nextOperation = 0;
  let operation: Operation | null = null;
  let lastDialog: ConfirmationDialogState | null = null;
  let confirmationId = 0;
  let consumedConfirmationId = 0;
  const syncConfirmation = () => {
    const dialog = read().globalConfirmationDialog;
    if (dialog !== lastDialog) { lastDialog = dialog; if (dialog) confirmationId++; }
    return dialog;
  };
  const requireTitle = () => {
    if (read().characterCreationConfig) throw new Error("Return to the title screen before starting or loading a game");
    if (read().startupInitialLoadingVisible) throw new Error("Startup data is still loading; get app state again");
    if (operation?.status === "pending") throw new Error("A startup operation is already pending");
    if (syncConfirmation()) throw new Error("A confirmation dialog is already active");
  };
  const versionFrom = (value: unknown): NethackRuntimeVersion => {
    if (typeof value !== "string" || !versions.has(value as NethackRuntimeVersion)) throw new Error("Unsupported runtimeVersion");
    return value as NethackRuntimeVersion;
  };
  const begin = (method: string, config: CharacterCreationConfig) => {
    const current: Operation = { id: ++nextOperation, method, status: "pending" };
    operation = current;
    // The existing startup flow can show a confirmation and wait for a choice.
    // Return immediately so the client can observe and answer that dialog.
    void read().handleStartNewGame(config).then(
      () => { if (operation === current) operation = { ...current, status: "completed" }; },
      error => { if (operation === current) operation = { ...current, status: "failed", error: error instanceof Error ? error.message : String(error) }; },
    );
    return { status: "requested", operationId: current.id };
  };
  return {
    async execute(method: string, params: Record<string, unknown>): Promise<unknown> {
      const deps = read();
      if (method === "get_app_state") {
        const dialog = syncConfirmation();
        return {
          phase: deps.characterCreationConfig ? (deps.gameOver.active ? "game_over" : "game") : "title",
          runtimeVersion: deps.characterCreationConfig?.runtimeVersion ?? deps.runtimeVersion,
          startupFlowStep: deps.startupFlowStep,
          startupLoading: deps.startupInitialLoadingVisible,
          gameOver: deps.gameOver,
          newGamePrompt: deps.newGamePrompt,
          confirmation: dialog ? { confirmationId, title: dialog.title, message: dialog.message, choices: { confirm: dialog.confirmLabel, cancel: dialog.cancelLabel, ...(dialog.extraLabel ? { extra: dialog.extraLabel } : {}) } } : null,
          operation,
        };
      }
      if (method === "list_saves") {
        const runtimeVersion = versionFrom(params.runtimeVersion);
        const saves = await fetchSavedGames(runtimeVersion);
        return { runtimeVersion, saves: saves.map(save => ({ key: save.key, name: save.name, displayName: save.displayName, category: save.category, isResumable: save.isResumable, timestamp: save.timestamp.toISOString() })) };
      }
      if (method === "list_trial_saves") {
        const runtimeVersion = versionFrom(params.runtimeVersion);
        const characters = await listTrialCharacters(runtimeVersion);
        return { runtimeVersion, characters: characters.map(character => ({ name: character.name, displayName: character.displayName, slots: character.slots.map((slot, index) => slot && ({ slot: index + 1, savedAt: slot.savedAt.toISOString(), turn: slot.turn, dlevel: slot.dlevel })), snapshots: character.snapshots.map(snapshot => ({ id: snapshot.id, savedAt: snapshot.savedAt.toISOString(), turn: snapshot.turn, dlevel: snapshot.dlevel })) })) };
      }
      if (method === "respond_confirmation") {
        const dialog = syncConfirmation();
        if (!dialog || params.confirmationId !== confirmationId || consumedConfirmationId === confirmationId) throw new Error("Confirmation is stale or no longer active; get app state again");
        if (params.choice !== "confirm" && params.choice !== "cancel" && !(params.choice === "extra" && dialog.extraLabel)) throw new Error("Choice is not available");
        consumedConfirmationId = confirmationId;
        deps.resolveConfirmation(params.choice);
        return { status: "submitted" };
      }
      if (method === "return_to_title") {
        if (!deps.characterCreationConfig) throw new Error("Already at the title screen");
        if (!deps.newGamePrompt.visible || (deps.gameOver.active && !deps.gameOver.promptReady)) throw new Error("The game has not finished; save or complete game-over prompts first");
        deps.startNewGameFromPrompt();
        return { status: "requested" };
      }
      if (method === "start_game") {
        requireTitle();
        const runtimeVersion = versionFrom(params.runtimeVersion);
        if (params.mode !== "random" && params.mode !== "create") throw new Error("mode must be random or create");
        if (typeof params.name !== "string" || !params.name.trim()) throw new Error("A character name is required");
        if (params.playmode !== undefined && (typeof params.playmode !== "string" || !["normal", "explore", "debug", "trial"].includes(params.playmode))) throw new Error("Unsupported playmode");
        if (params.playmode !== undefined && params.playmode !== "normal" && !isStartupInitOptionSupported("playmode", runtimeVersion)) throw new Error("This runtime does not support the requested playmode");
        const startupValues = { ...deps.startupInitOptionValues, ...(params.playmode !== undefined ? { playmode: params.playmode as string } : {}) };
        const config: CharacterCreationConfig = { mode: params.mode, runtimeVersion, name: params.name,
          initOptions: serializeStartupInitOptionTokens(startupValues, runtimeVersion) };
        if (params.mode === "create") {
          const provided = { role: params.role, race: params.race, gender: params.gender, align: params.align };
          if (Object.values(provided).some(value => typeof value !== "string" || !value.trim())) throw new Error("role, race, gender and align are required for create mode");
          const selected = resolveStartupCreateCharacterOptionSet(provided, runtimeVersion).selection;
          if (Object.entries(provided).some(([key, value]) => String(value).toLowerCase() !== selected[key as keyof typeof selected].toLowerCase())) throw new Error("Invalid role, race, gender or alignment combination");
          Object.assign(config, selected);
        }
        return begin(method, config);
      }
      if (method === "load_game") {
        requireTitle();
        const runtimeVersion = versionFrom(params.runtimeVersion);
        if (typeof params.saveKey !== "string") throw new Error("saveKey is required");
        const saves = await fetchSavedGames(runtimeVersion);
        // Re-check after the async lookup: a human may have started a game meanwhile.
        requireTitle();
        const save = saves.find(item => item.key === params.saveKey && item.isResumable);
        if (!save) throw new Error("Save not found or not resumable; list saves again");
        return begin(method, { mode: "resume", runtimeVersion, name: save.name, initOptions: save.initOptions, resumeCategory: save.category });
      }
      if (method === "load_trial_save") {
        // A previous worker may still be writing IndexedDB after returning to
        // the title. Refuse to overwrite until shutdown is coordinated.
        throw new Error("Trial save restoration through MCP is unavailable until safe worker shutdown and storage coordination are supported");
      }
      throw new Error("Unknown app operation");
    },
  };
}
