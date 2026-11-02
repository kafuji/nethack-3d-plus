import { useEffect, useState } from "react";
import { plusStrings } from "../../ui/app/shared/translations";
import type { NethackRuntimeVersion } from "../../runtime/types";
import { EntryButton, Section, TrialLoadEntries } from "./TrialSlotMenu";
import { withTrialPlayMode } from "./trial-play-mode";
import {
  listTrialCharacters,
  restoreAutoSnapshot,
  restoreTrialSlot,
  type TrialCharacterSaves,
  type TrialSlotResume,
} from "./trial-slots";

const trialStrings = plusStrings.trialMode;

/**
 * Title-screen access to trial slots and snapshots. A trial character stays
 * loadable from them even when its regular save is gone, after a death, a
 * quit, or an autosave that never reached storage.
 */
export function useTrialTitleLoad(runtimeVersion: NethackRuntimeVersion, visible: boolean) {
  const [characters, setCharacters] = useState<TrialCharacterSaves[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    setSelectedName(null);
    setRestoring(false);
    if (!visible) return;
    let cancelled = false;
    listTrialCharacters(runtimeVersion).then(
      list => { if (!cancelled) setCharacters(list); },
      error => console.warn("Failed to list trial characters:", error),
    );
    return () => { cancelled = true; };
  }, [runtimeVersion, visible]);

  return {
    runtimeVersion,
    characters,
    selected: characters.find(character => character.name === selectedName) ?? null,
    select: setSelectedName,
    clearSelection: () => setSelectedName(null),
    restoring,
    setRestoring,
  } as const;
}

export type TrialTitleLoadState = ReturnType<typeof useTrialTitleLoad>;

/** One entry per trial character, below the regular saves. */
export function TrialTitleCharacters({ state }: { state: TrialTitleLoadState }) {
  if (!state.characters.length) return null;
  return (
    <Section label={trialStrings.titleSection} wide>
      {state.characters.map(character => (
        <EntryButton
          detail={trialStrings.characterSummary(
            character.slots.filter(Boolean).length,
            character.snapshots.length,
          )}
          key={character.name}
          onClick={() => state.select(character.name)}
          title={character.displayName}
        />
      ))}
    </Section>
  );
}

/** The chosen character's slots and snapshots; loading one starts the game. */
export function TrialTitlePicker(props: {
  state: TrialTitleLoadState;
  onResume: (resume: TrialSlotResume) => void;
}) {
  const { state, onResume } = props;
  const character = state.selected;
  if (!character) return null;
  if (state.restoring) {
    return <div className="nh3d-question-text">{trialStrings.loading}</div>;
  }

  // No runtime is running on the title screen, so the copy can replace the
  // character's saves directly.
  const load = (restore: () => Promise<TrialSlotResume>) => {
    state.setRestoring(true);
    restore().then(
      resume => onResume({ ...resume, initOptions: withTrialPlayMode(resume.initOptions) }),
      error => {
        console.error("Failed to restore trial save:", error);
        state.setRestoring(false);
      },
    );
  };

  return (
    <>
      <Section label={character.displayName} wide />
      <TrialLoadEntries
        onLoadSlot={slot => load(() => restoreTrialSlot(state.runtimeVersion, character.name, slot))}
        onLoadSnapshot={id => load(() => restoreAutoSnapshot(state.runtimeVersion, character.name, id))}
        slots={character.slots}
        wide
        snapshots={character.snapshots}
      />
    </>
  );
}
