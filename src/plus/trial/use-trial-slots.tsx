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
/** Covers a resume's runtime boot (about 4-6s). */
const RESUME_SETTLE_MS = 10000;

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function summarizeLocation(stats: PlayerStatsSnapshot): TrialSlotSummary {
  return {
    turn: finiteOrNull(stats.time),
    dlevel: finiteOrNull(stats.levelDepth) ?? finiteOrNull(stats.dlevel),
    dungeon: stats.dungeon || null,
    branchLevel: finiteOrNull(stats.levelBranchNumber),
  };
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
  const previousLedger = useRef<number | null>(null);
  // What the status showed on arriving at each level, by ledger number.
  const levelArrivals = useRef(new Map<number, TrialSlotSummary>());
  const newestArrivalLedger = useRef<number | null>(null);
  const capturePollSession = useRef<number | null>(null);
  const captureAttemptsLeft = useRef(0);
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
    previousLedger.current = null;
    levelArrivals.current.clear();
    newestArrivalLedger.current = null;
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

  // One polling loop per session: it stays on until the newest arrival has a
  // snapshot, so quick level changes cannot race each other. Checkpoints a
  // later level change overwrote before they were read are simply skipped.
  const pollForLevelSnapshot = () => {
    captureAttemptsLeft.current = SNAPSHOT_CAPTURE_ATTEMPTS;
    const session = sessionId.current;
    if (capturePollSession.current === session) return;
    capturePollSession.current = session;
    void (async () => {
      while (session === sessionId.current && captureAttemptsLeft.current > 0) {
        captureAttemptsLeft.current -= 1;
        await new Promise(resolve => window.setTimeout(resolve, SNAPSHOT_CAPTURE_INTERVAL_MS));
        if (session !== sessionId.current) return;
        if (pending.current) {
          capturePollSession.current = null;
          return;
        }
        try {
          const captured = await captureAutoSnapshot(
            runtimeVersion,
            characterName,
            ledger => levelArrivals.current.get(ledger) ?? null,
            Math.max(lastCheckpointTime.current, sessionStartTime.current),
          );
          if (session !== sessionId.current) return;
          if (!captured) continue;
          lastCheckpointTime.current = captured.checkpointTime;
          refreshSlotInfo();
          if (captured.ledger === newestArrivalLedger.current) {
            capturePollSession.current = null;
            return;
          }
        } catch (error) {
          console.warn("Failed to capture trial snapshot:", error);
          capturePollSession.current = null;
          return;
        }
      }
      if (session === sessionId.current) {
        capturePollSession.current = null;
        console.warn("Trial snapshot skipped: checkpoint did not reach storage in time");
      }
    })();
  };

  // The ledger number names a level exactly, unlike playerStats.dlevel, which
  // alternates between depth and branch level during a status update.
  const ledger = finiteOrNull(playerStats.levelLedgerNo);
  useEffect(() => {
    if (!trialModeActive || !characterName || ledger === null) return;
    const previous = previousLedger.current;
    previousLedger.current = ledger;
    if (previous === ledger) return;
    const settling = Date.now() - sessionStartTime.current < RESUME_SETTLE_MS;
    if (!captureInitialLevel.current && (previous === null || settling)) {
      // A resumed game's status starts from the previous game's level; let it
      // settle to the restored one before treating changes as level changes.
      return;
    }
    const summary = summarizeLocation(playerStats);
    levelArrivals.current.set(ledger, {
      ...summary,
      // Its time may still be the previous game's while a new game boots.
      turn: captureInitialLevel.current && settling ? 1 : summary.turn,
    });
    newestArrivalLedger.current = ledger;
    pollForLevelSnapshot();
  }, [ledger, trialModeActive, characterName]);

  const begin = (kind: "save" | "load", target: number | string) => {
    if (!trialModeActive || !controller || pending.current) return;
    pending.current = {
      kind,
      target,
      summary: summarizeLocation(playerStats),
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
          ? await captureTrialSlot(runtimeVersion, characterName, Number(target), current.summary)
          : typeof target === "string"
            ? await restoreAutoSnapshot(runtimeVersion, characterName, target)
            : await restoreTrialSlot(runtimeVersion, characterName, target);
      } catch (error) {
        console.error("Trial slot operation failed; resuming the just-saved game:", error);
        resume = await resolveLatestManualSave(runtimeVersion, characterName);
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
