import { useSyncExternalStore } from "react";
import { OptionLabelWithInfo } from "../../ui/app/settings/OptionLabelWithInfo";
import { plusStrings } from "../../ui/app/shared/translations";
import {
  isGameTextTranslationAvailable,
  isGameTextTranslationPreferred,
  setGameTextTranslationPreferred,
} from "./index";

const listeners = new Set<() => void>();
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Options row that turns display-time game text translation on or off. */
export function GameTextTranslationToggle(): JSX.Element | null {
  const enabled = useSyncExternalStore(
    subscribe,
    isGameTextTranslationPreferred,
    isGameTextTranslationPreferred,
  );
  if (!isGameTextTranslationAvailable()) {
    return null;
  }
  return (
    <div className="nh3d-option-row nh3d-option-row-inline-toggle">
      <div className="nh3d-option-copy">
        <OptionLabelWithInfo
          label={plusStrings.gameText.label}
          description={plusStrings.gameText.description}
        />
      </div>
      <button
        aria-checked={enabled}
        className={`nh3d-option-switch nh3d-option-inline-switch${enabled ? " is-on" : ""}`}
        onClick={() => {
          setGameTextTranslationPreferred(!enabled);
          for (const listener of listeners) listener();
        }}
        role="switch"
        type="button"
      >
        <span className="nh3d-option-switch-thumb" />
      </button>
    </div>
  );
}
