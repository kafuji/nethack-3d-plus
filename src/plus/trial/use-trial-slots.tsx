import { useCallback, useEffect, useRef, useState } from "react";
import type * as React from "react";
import type {
  CharacterCreationConfig,
  Nethack3DEngineController,
  NewGamePromptState,
  PlayerStatsSnapshot,
  QuestionDialogState,
} from "../../game/ui-types";
import type { NethackRuntimeVersion } from "../../runtime/types";
import {
  captureTrialSlot,
  clearTrialSlots,
  captureAutoSnapshot,
  readAutoSnapshots,
  readTrialSlots,
  resolveLatestManualSave,
  restoreAutoSnapshot,
  restoreTrialSlot,
  type TrialAutoSnapshotInfo,
  type TrialSlotInfo,
  type TrialSlotResume,
  type TrialSlotSummary,
} from "./trial-slots";
import { isTrialPlayMode } from "./trial-play-mode";

/** Time for the disposed worker's final IDBFS sync to be cut off by terminate(). */
const WORKER_RETIRE_DELAY_MS = 400;

/**
 * The checkpoint is synced ~150ms after NetHack writes it, but a new game's
 * first one only appears once the runtime has booted, which can take seconds.
 */
const SNAPSHOT_CAPTURE_INTERVAL_MS = 500;
const SNAPSHOT_CAPTURE_ATTEMPTS = 40;
/** How much older than the level change a checkpoint may be and still be its. */
const CHECKPOINT_MAX_AGE_MS = 3000;
/** Covers a resume's runtime boot (about 4-6s). */
const RESUME_SETTLE_MS = 10000;

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export type TrialSlotPhase = "idle" | "saving" | "loading";
export type TrialSlotPicker = "save" | "load";

export interface UseTrialSlotsDependencies {
  readonly controller: Nethack3DEngineController | null;
  readonly question: QuestionDialogState | null;
  readonly newGamePrompt: NewGamePromptState;
  readonly setNewGamePrompt: (state: NewGamePromptState) => void;
  readonly characterCreationConfig: CharacterCreationConfig | null;
  readonly setCharacterCreationConfig: React.Dispatch<React.SetStateAction<CharacterCreationConfig | null>>;
  readonly runtimeVersion: NethackRuntimeVersion;
  readonly isPauseMenuVisible: boolean;
  readonly setIsPauseMenuVisible: React.Dispatch<React.SetStateAction<boolean>>;
  readonly playerStats: PlayerStatsSnapshot;
}

/**
 * Save/load anywhere by driving NetHack's own save-and-exit, copying the save
 * into a slot, then resuming in a fresh runtime worker.
 */
export function useTrialSlots(dependencies: UseTrialSlotsDependencies) {
  const {
    controller,
    question,
    newGamePrompt,
    setNewGamePrompt,
    characterCreationConfig,
    setCharacterCreationConfig,
    runtimeVersion,
    isPauseMenuVisible,
    setIsPauseMenuVisible,
    playerStats,
  } = dependencies;

  const trialModeActive = isTrialPlayMode(characterCreationConfig?.initOptions);
  // New games carry the effective save name; resumes carry the save's name.
  const characterName = characterCreationConfig?.name ?? "";
  const [phase, setPhase] = useState<TrialSlotPhase>("idle");
  const [picker, setPicker] = useState<TrialSlotPicker | null>(null);
  // Reopening the pause menu starts from its main items.
  useEffect(() => { if (!isPauseMenuVisible) setPicker(null); }, [isPauseMenuVisible]);
  const [slots, setSlots] = useState<Array<TrialSlotInfo | null>>([]);
  const [snapshots, setSnapshots] = useState<TrialAutoSnapshotInfo[]>([]);
  const pending = useRef<{
    kind: "save" | "load";
    // A slot number, or an automatic snapshot id (load only).
    target: number | string;
    summary: TrialSlotSummary;
    startedAt: number;
    answered: boolean;
  } | null>(null);
  // Level tracking for automatic snapshots, reset for every game session.
  const sessionId = useRef(0);
  const sessionStartTime = useRef(0);
  const previousLevelKey = useRef<string | null>(null);
  const captureInitialLevel = useRef(false);
  const lastCheckpointTime = useRef(0);

  const refreshSlotInfo = useCallback(() => {
    if (!trialModeActive || !characterName) {
      setSlots([]);
      setSnapshots([]);
      return;
    }
    readTrialSlots(runtimeVersion, characterName).then(setSlots, error => {
      console.warn("Failed to read trial slots:", error);
    });
    readAutoSnapshots(runtimeVersion, characterName).then(setSnapshots, error => {
      console.warn("Failed to read trial snapshots:", error);
    });
  }, [runtimeVersion, characterName, trialModeActive]);

  useEffect(() => {
    sessionId.current += 1;
    sessionStartTime.current = Date.now();
    previousLevelKey.current = null;
    const mode = characterCreationConfig?.mode;
    const isNewGame = mode === "random" || mode === "create";
    // A resumed game is already snapshotted (or is a slot); a new one gets
    // its starting level recorded too.
    captureInitialLevel.current = isNewGame;
    if (trialModeActive && characterName && isNewGame) {
      clearTrialSlots(runtimeVersion, characterName).then(refreshSlotInfo, error => {
        console.warn("Failed to clear trial slots:", error);
      });
      return;
    }
    refreshSlotInfo();
  }, [characterCreationConfig, refreshSlotInfo]);

  const captureLevelSnapshot = (summary: TrialSlotSummary, notBeforeTime: number) => {
    const session = sessionId.current;
    const notBefore = Math.max(lastCheckpointTime.current, notBeforeTime);
    void (async () => {
      for (let attempt = 0; attempt < SNAPSHOT_CAPTURE_ATTEMPTS; attempt += 1) {
        await new Promise(resolve => window.setTimeout(resolve, SNAPSHOT_CAPTURE_INTERVAL_MS));
        if (session !== sessionId.current || pending.current) return;
        try {
          const checkpointTime = await captureAutoSnapshot(runtimeVersion, characterName, summary, notBefore);
          if (checkpointTime === null) continue;
          if (session !== sessionId.current) return;
          lastCheckpointTime.current = checkpointTime;
          refreshSlotInfo();
          return;
        } catch (error) {
          console.warn("Failed to capture trial snapshot:", error);
          return;
        }
      }
      console.warn("Trial snapshot skipped: checkpoint did not reach storage in time");
    })();
  };

  const dlevel = finiteOrNull(playerStats.dlevel);
  const levelKey = dlevel === null ? null : `${playerStats.dungeon}:${dlevel}`;
  useEffect(() => {
    if (!trialModeActive || !characterName || levelKey === null) return;
    const previous = previousLevelKey.current;
    previousLevelKey.current = levelKey;
    if (previous === null) {
      // The status still shows defaults while a new game boots, so wait for
      // the starting checkpoint itself rather than for a level change.
      if (captureInitialLevel.current) {
        captureLevelSnapshot({ turn: 1, dlevel: 1 }, sessionStartTime.current);
      }
      return;
    }
    if (previous === levelKey) return;
    // A resumed game's status starts from the previous game's level; let it
    // settle to the restored one before treating changes as level changes.
    if (!captureInitialLevel.current && Date.now() - sessionStartTime.current < RESUME_SETTLE_MS) return;
    // NetHack writes the checkpoint just before the status shows the new
    // level; older shards (a restored game's, say) must not pass for it.
    captureLevelSnapshot(
      { turn: finiteOrNull(playerStats.time), dlevel },
      Date.now() - CHECKPOINT_MAX_AGE_MS,
    );
  }, [levelKey, trialModeActive, characterName]);

  const begin = (kind: "save" | "load", target: number | string) => {
    if (!trialModeActive || !controller || pending.current) return;
    pending.current = {
      kind,
      target,
      summary: { turn: finiteOrNull(playerStats.time), dlevel: finiteOrNull(playerStats.dlevel) },
      startedAt: performance.now(),
      answered: false,
    };
    setPicker(null);
    setPhase(kind === "save" ? "saving" : "loading");
    // Both paths save first: it is the only way to make the runtime flush a
    // coherent state to IndexedDB and exit cleanly before the worker goes away.
    controller.sendInput("S");
  };

  // Answer NetHack's "Really save?" for the save we asked for.
  useEffect(() => {
    const current = pending.current;
    if (!current || current.answered || !question || !controller) return;
    if (!question.choices.includes("y")) return;
    current.answered = true;
    controller.chooseQuestionChoice("y");
  }, [question, controller]);

  // The save ended the runtime: swap in the slot and resume in a new worker.
  useEffect(() => {
    const current = pending.current;
    if (!current || !newGamePrompt.visible || !characterCreationConfig) return;
    setNewGamePrompt({ visible: false, reason: null });
    const baseConfig = characterCreationConfig;
    const savedAt = performance.now();
    void (async () => {
      let resume: TrialSlotResume;
      try {
        controller?.dispose();
        await new Promise(resolve => window.setTimeout(resolve, WORKER_RETIRE_DELAY_MS));
        const { target } = current;
        resume = current.kind === "save"
          ? await captureTrialSlot(runtimeVersion, Number(target), current.summary)
          : typeof target === "string"
            ? await restoreAutoSnapshot(runtimeVersion, characterName, target)
            : await restoreTrialSlot(runtimeVersion, characterName, target);
      } catch (error) {
        console.error("Trial slot operation failed; resuming the just-saved game:", error);
        resume = await resolveLatestManualSave(runtimeVersion);
      }
      console.log(
        `Trial ${current.kind}: save+exit ${Math.round(savedAt - current.startedAt)}ms, ` +
        `slot copy ${Math.round(performance.now() - savedAt)}ms`,
      );
      pending.current = null;
      setPhase("idle");
      setIsPauseMenuVisible(false);
      // The new config re-reads the slot for the resumed character.
      setCharacterCreationConfig({
        mode: "resume",
        playMode: baseConfig.playMode,
        runtimeVersion,
        name: resume.name,
        // Keep the mode even if a copy lost its presentation metadata.
        initOptions: isTrialPlayMode(resume.initOptions)
          ? resume.initOptions
          : baseConfig.initOptions,
        resumeCategory: resume.category,
      });
    })();
  }, [newGamePrompt.visible]);

  return {
    trialModeActive,
    trialSlotPhase: phase,
    trialSlotPicker: picker,
    openTrialSlotPicker: setPicker,
    closeTrialSlotPicker: () => setPicker(null),
    trialSlots: slots,
    trialSnapshots: snapshots,
    saveTrialSlot: (slot: number) => begin("save", slot),
    loadTrialSlot: (slot: number) => begin("load", slot),
    loadTrialSnapshot: (id: string) => begin("load", id),
  } as const;
}
