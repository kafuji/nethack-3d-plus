import { QuestWebXrButton } from "../../../quest/webxr/QuestWebXrControls";
import AnimatedDialog from "../../modals/AnimatedDialog";
import type * as React from "react";
import {
  commonStrings,
  t
} from "../shared/translations";
import {
  RuntimeVersionBadge
} from "../startup/RuntimeVersionBadge";
import {
  requestGameQuit
} from "../shared/platform";
import type { Nethack3DEngineController } from "../../../game/ui-types";
// nh3d-plus: trial-and-error mode save slots.
import {
  TrialSlotMenuItems,
  TrialSlotPanel,
  isTrialSlotPanelVisible,
  type TrialSlotMenuState,
} from "../../../plus/trial/TrialSlotMenu";


export interface UsePauseMenuDependencies {
  readonly isPauseMenuVisible: boolean;
  readonly isExitConfirmationVisible: boolean;
  readonly controller: Nethack3DEngineController | null;
  readonly setIsPauseMenuVisible: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setIsExitConfirmationVisible: React.Dispatch<React.SetStateAction<boolean>>;
  readonly startNewGameFromPrompt: () => void;
  readonly activeRuntimeVersionLabel: string;
  readonly openClientOptionsDialog: () => void;
  readonly trialSlots: TrialSlotMenuState; // nh3d-plus
}

/** Renders pause actions and coordinates returning to the game. */
export function usePauseMenu(dependencies: UsePauseMenuDependencies) {
  const {
    isPauseMenuVisible,
    isExitConfirmationVisible,
    controller,
    setIsPauseMenuVisible,
    setIsExitConfirmationVisible,
    startNewGameFromPrompt,
    activeRuntimeVersionLabel,
    openClientOptionsDialog,
    trialSlots,
  } = dependencies;

  const renderPauseMenu = () => {
    return (
      <AnimatedDialog
        className="nh3d-dialog nh3d-dialog-question nh3d-dialog-fixed-actions"
        open={isPauseMenuVisible}
        id="pause-menu-dialog"
      >
        {/* nh3d-plus: trial-mode slot selection and save/load progress. */}
        {isTrialSlotPanelVisible(trialSlots) ? (
          <TrialSlotPanel state={trialSlots} />
        ) : isExitConfirmationVisible ? (
          <>
            <div className="nh3d-question-text">
              {t.dialogs.pauseMenu.saveBeforeQuit}
            </div>
            <div className="nh3d-menu-actions">
              <button
                className="nh3d-menu-action-button nh3d-menu-action-confirm"
                onClick={() => {
                  controller?.sendInput("S");
                  setIsPauseMenuVisible(false);
                  setIsExitConfirmationVisible(false);
                }}
                type="button"
              >
                {commonStrings.yes}
              </button>
              <button
                className="nh3d-menu-action-button"
                onClick={() => {
                  startNewGameFromPrompt();
                }}
                type="button"
              >
                {commonStrings.no}
              </button>
              <button
                className="nh3d-menu-action-button nh3d-menu-action-cancel"
                onClick={() => setIsExitConfirmationVisible(false)}
                type="button"
              >
                {commonStrings.cancel}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="nh3d-options-title nh3d-pause-menu-title">
              <RuntimeVersionBadge label={activeRuntimeVersionLabel} />
              <span
                className="nh3d-pause-menu-title-separator"
                aria-hidden="true"
              >
                {"\u2014"}
              </span>
              <span className="nh3d-pause-menu-title-text">
                {t.dialogs.pauseMenu.title}
              </span>
            </div>
            <div className="nh3d-overflow-glow-frame">
              <div
                className="nh3d-choice-list"
                data-nh3d-overflow-glow
                data-nh3d-overflow-glow-host="parent"
              >
                <button
                  className="nh3d-choice-button"
                  onClick={() => setIsPauseMenuVisible(false)}
                  type="button"
                >
                  {t.dialogs.pauseMenu.resume}
                </button>
                <QuestWebXrButton className="nh3d-choice-button" />
                <button
                  className="nh3d-choice-button"
                  onClick={openClientOptionsDialog}
                  type="button"
                >
                  {t.dialogs.pauseMenu.options}
                </button>
                <button
                  className="nh3d-choice-button"
                  onClick={() => {
                    controller?.sendInput("S");
                    setIsPauseMenuVisible(false);
                  }}
                  type="button"
                >
                  {t.dialogs.pauseMenu.saveGame}
                </button>
                <TrialSlotMenuItems state={trialSlots} />{/* nh3d-plus */}
                <button
                  className="nh3d-choice-button"
                  onClick={() => setIsExitConfirmationVisible(true)}
                  type="button"
                >
                  {t.dialogs.pauseMenu.exitToMainMenu}
                </button>
                <button
                  className="nh3d-choice-button"
                  onClick={() => {
                    void requestGameQuit();
                  }}
                  type="button"
                >
                  {t.dialogs.pauseMenu.quitGame}
                </button>
              </div>
            </div>
          </>
        )}
      </AnimatedDialog>
    );
  };
  return {
    renderPauseMenu,
  } as const;
}
