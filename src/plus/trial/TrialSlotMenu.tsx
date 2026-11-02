import { useState } from "react";
import { plusStrings } from "../../ui/app/shared/translations";
import type { TrialSlotPhase } from "./use-trial-slots";
import {
  TRIAL_SLOT_COUNT,
  type TrialAutoSnapshotInfo,
  type TrialSlotInfo,
} from "./trial-slots";

const trialStrings = plusStrings.trialMode;

export interface TrialSlotMenuState {
  readonly trialModeActive: boolean;
  readonly trialSlotPhase: TrialSlotPhase;
  readonly trialSlots: ReadonlyArray<TrialSlotInfo | null>;
  readonly trialSnapshots: ReadonlyArray<TrialAutoSnapshotInfo>;
  readonly saveTrialSlot: (slot: number) => void;
  readonly loadTrialSlot: (slot: number) => void;
  readonly loadTrialSnapshot: (id: string) => void;
}

/** Pause-menu body while a slot save/load is restarting the runtime. */
export function TrialSlotProgress({ state }: { state: TrialSlotMenuState }) {
  return (
    <div className="nh3d-question-text">
      {state.trialSlotPhase === "saving" ? trialStrings.saving : trialStrings.loading}
    </div>
  );
}

function describeSlot(slot: number, info: TrialSlotInfo | null): string {
  if (!info) return trialStrings.emptySlot(slot);
  return trialStrings.filledSlot(slot, describeDetail(info));
}

function describeDetail(info: TrialSlotInfo): string {
  return [
    info.dlevel !== null ? trialStrings.slotDepth(info.dlevel) : null,
    info.turn !== null ? trialStrings.slotTurn(info.turn) : null,
    info.savedAt.toLocaleString(undefined, {
      month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
    }),
  ].filter(Boolean).join(" · ");
}

/**
 * Slot save/load entries for the pause menu; empty outside trial mode. Each
 * entry expands in place into one button per slot.
 */
export function TrialSlotMenuItems({ state }: { state: TrialSlotMenuState }) {
  const [picker, setPicker] = useState<"save" | "load" | null>(null);
  if (!state.trialModeActive) return null;
  const hasAnySlot = state.trialSlots.some(Boolean) || state.trialSnapshots.length > 0;

  const renderSnapshots = () =>
    state.trialSnapshots.map(snapshot => (
      <button
        className="nh3d-choice-button"
        key={snapshot.id}
        onClick={() => {
          setPicker(null);
          state.loadTrialSnapshot(snapshot.id);
        }}
        style={{ fontSize: "0.9em" }}
        type="button"
      >
        {trialStrings.autoSnapshot(describeDetail(snapshot))}
      </button>
    ));

  const renderSlots = (kind: "save" | "load") =>
    Array.from({ length: TRIAL_SLOT_COUNT }, (_, index) => {
      const slot = index + 1;
      const info = state.trialSlots[index] ?? null;
      return (
        <button
          className="nh3d-choice-button"
          disabled={kind === "load" && !info}
          key={`${kind}-${slot}`}
          onClick={() => {
            setPicker(null);
            if (kind === "save") state.saveTrialSlot(slot);
            else state.loadTrialSlot(slot);
          }}
          style={{ fontSize: "0.9em" }}
          type="button"
        >
          {describeSlot(slot, info)}
        </button>
      );
    });

  return (
    <>
      <button
        aria-expanded={picker === "save"}
        className="nh3d-choice-button"
        onClick={() => setPicker(picker === "save" ? null : "save")}
        type="button"
      >
        {trialStrings.saveToSlot}
      </button>
      {picker === "save" ? renderSlots("save") : null}
      <button
        aria-expanded={picker === "load"}
        className="nh3d-choice-button"
        disabled={!hasAnySlot}
        onClick={() => setPicker(picker === "load" ? null : "load")}
        type="button"
      >
        {trialStrings.loadFromSlot}
      </button>
      {picker === "load" ? renderSlots("load") : null}
      {picker === "load" ? renderSnapshots() : null}
    </>
  );
}
