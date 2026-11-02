import type { ReactNode } from "react";
import { commonStrings, plusStrings } from "../../ui/app/shared/translations";
import type { TrialSlotPhase, TrialSlotPicker } from "./use-trial-slots";
import {
  TRIAL_SLOT_COUNT,
  type TrialAutoSnapshotInfo,
  type TrialSlotInfo,
} from "./trial-slots";

const trialStrings = plusStrings.trialMode;

export interface TrialSlotMenuState {
  readonly trialModeActive: boolean;
  readonly trialSlotPhase: TrialSlotPhase;
  readonly trialSlotPicker: TrialSlotPicker | null;
  readonly trialSlots: ReadonlyArray<TrialSlotInfo | null>;
  readonly trialSnapshots: ReadonlyArray<TrialAutoSnapshotInfo>;
  readonly openTrialSlotPicker: (picker: TrialSlotPicker) => void;
  readonly closeTrialSlotPicker: () => void;
  readonly saveTrialSlot: (slot: number) => void;
  readonly loadTrialSlot: (slot: number) => void;
  readonly loadTrialSnapshot: (id: string) => void;
}

/** Whether the pause menu should show the trial panel instead of its items. */
export function isTrialSlotPanelVisible(state: TrialSlotMenuState): boolean {
  return state.trialSlotPhase !== "idle" || state.trialSlotPicker !== null;
}

export function describeDetail(info: TrialSlotInfo, depthInTitle = false): string {
  return [
    info.dlevel !== null && !depthInTitle ? trialStrings.slotDepth(info.dlevel) : null,
    info.turn !== null ? trialStrings.slotTurn(info.turn) : null,
    info.savedAt.toLocaleString(undefined, {
      month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
    }),
  ].filter(Boolean).join(" · ");
}

const sectionLabelStyle = {
  color: "var(--nh3d-ui-text-muted)",
  fontWeight: "bold",
  fontSize: "calc(12px * var(--nh3d-ui-font-scale, 1))",
  paddingLeft: "2px",
  textAlign: "left",
} as const;

/** Two-line entry: what it is, then where and when it was saved. */
export function EntryButton(props: {
  title: string;
  detail: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="nh3d-choice-button"
      disabled={props.disabled}
      onClick={props.onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        width: "100%",
        padding: "8px 12px",
        textAlign: "left",
        opacity: props.disabled ? 0.45 : 1,
      }}
      type="button"
    >
      <span style={{ fontWeight: "bold" }}>{props.title}</span>
      <span
        style={{
          color: "var(--nh3d-ui-text-muted)",
          fontSize: "calc(12px * var(--nh3d-ui-font-scale, 1))",
          fontWeight: "normal",
          marginTop: "2px",
        }}
      >
        {props.detail}
      </span>
    </button>
  );
}

export function Section(props: { label?: string; wide?: boolean; children?: ReactNode }) {
  return (
    // The pause menu sizes plain choice buttons for one-line labels; slot
    // entries need room for their details. The title screen's list is
    // already wide, so there they take its full width.
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        width: props.wide ? "100%" : "min(340px, 100%)",
        alignSelf: "center",
      }}
    >
      {props.label ? <div style={sectionLabelStyle}>{props.label}</div> : null}
      {props.children}
    </div>
  );
}

function renderSlotEntries(
  slots: ReadonlyArray<TrialSlotInfo | null>,
  onPick: (slot: number) => void,
  emptyDisabled: boolean,
) {
  return Array.from({ length: TRIAL_SLOT_COUNT }, (_, index) => {
    const slot = index + 1;
    const info = slots[index] ?? null;
    return (
      <EntryButton
        detail={info ? describeDetail(info) : trialStrings.emptySlotDetail}
        disabled={emptyDisabled && !info}
        key={slot}
        onClick={() => onPick(slot)}
        title={trialStrings.slotTitle(slot)}
      />
    );
  });
}

/** Manual slots, then automatic snapshots: what can be loaded. */
export function TrialLoadEntries(props: {
  slots: ReadonlyArray<TrialSlotInfo | null>;
  snapshots: ReadonlyArray<TrialAutoSnapshotInfo>;
  onLoadSlot: (slot: number) => void;
  onLoadSnapshot: (id: string) => void;
  wide?: boolean;
}) {
  return (
    <>
      <Section label={trialStrings.manualSection} wide={props.wide}>
        {renderSlotEntries(props.slots, props.onLoadSlot, true)}
      </Section>
      {props.snapshots.length > 0 ? (
        <Section label={trialStrings.autoSection} wide={props.wide}>
          {props.snapshots.map(snapshot => (
            <EntryButton
              detail={describeDetail(snapshot, snapshot.dlevel !== null)}
              key={snapshot.id}
              onClick={() => props.onLoadSnapshot(snapshot.id)}
              title={snapshot.dlevel !== null
                ? trialStrings.slotDepth(snapshot.dlevel)
                : trialStrings.autoSection}
            />
          ))}
        </Section>
      ) : null}
    </>
  );
}

/**
 * Replaces the pause-menu body while choosing a slot, or while a slot
 * save/load restarts the runtime.
 */
export function TrialSlotPanel({ state }: { state: TrialSlotMenuState }) {
  if (state.trialSlotPhase !== "idle") {
    return (
      <div className="nh3d-question-text">
        {state.trialSlotPhase === "saving" ? trialStrings.saving : trialStrings.loading}
      </div>
    );
  }
  const picker = state.trialSlotPicker;
  if (!picker) return null;

  return (
    <>
      <div className="nh3d-options-title">
        {picker === "save" ? trialStrings.saveTitle : trialStrings.loadTitle}
      </div>
      <div className="nh3d-overflow-glow-frame">
        <div
          className="nh3d-choice-list"
          data-nh3d-overflow-glow
          data-nh3d-overflow-glow-host="parent"
          style={{ gap: "14px" }}
        >
          {picker === "save" ? (
            <Section>
              {renderSlotEntries(state.trialSlots, state.saveTrialSlot, false)}
            </Section>
          ) : (
            <TrialLoadEntries
              onLoadSlot={state.loadTrialSlot}
              onLoadSnapshot={state.loadTrialSnapshot}
              slots={state.trialSlots}
              snapshots={state.trialSnapshots}
            />
          )}
        </div>
      </div>
      <div className="nh3d-menu-actions">
        <button
          className="nh3d-menu-action-button nh3d-menu-action-cancel"
          onClick={state.closeTrialSlotPicker}
          type="button"
        >
          {commonStrings.back}
        </button>
      </div>
    </>
  );
}

/** Entries that open the slot panel; nothing outside trial mode. */
export function TrialSlotMenuItems({ state }: { state: TrialSlotMenuState }) {
  if (!state.trialModeActive) return null;
  const hasAnySave = state.trialSlots.some(Boolean) || state.trialSnapshots.length > 0;
  return (
    <>
      <button
        className="nh3d-choice-button"
        onClick={() => state.openTrialSlotPicker("save")}
        type="button"
      >
        {trialStrings.saveToSlot}
      </button>
      <button
        className="nh3d-choice-button"
        disabled={!hasAnySave}
        onClick={() => state.openTrialSlotPicker("load")}
        type="button"
      >
        {trialStrings.loadFromSlot}
      </button>
    </>
  );
}
