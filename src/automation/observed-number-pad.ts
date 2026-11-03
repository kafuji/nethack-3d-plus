export type ObservedNumberPadSnapshot = {
  enabled: boolean | null;
  source: "unknown" | "startup-options" | "runtime-callback" | "answered-option";
};

/** Track only evidence about the current game's actual directional key mode. */
export class ObservedNumberPad {
  private snapshotValue: ObservedNumberPadSnapshot = { enabled: null, source: "unknown" };
  private playerPositionObserved = false;

  reset(mode: string, explicitOption: boolean | null): void {
    // Restoring a save can replace options supplied at process startup.
    this.snapshotValue = mode !== "resume" && explicitOption !== null
      ? { enabled: explicitOption, source: "startup-options" }
      : { enabled: null, source: "unknown" };
    this.playerPositionObserved = false;
  }

  observePosition(): void { this.playerPositionObserved = true; }

  invalidateIfChanged(currentUiMode: boolean): void {
    if (this.snapshotValue.enabled !== null && this.snapshotValue.enabled !== currentUiMode) {
      this.snapshotValue = { enabled: null, source: "unknown" };
    }
  }

  observeRuntimeCallback(enabled: boolean): void {
    // Initial callbacks can precede restoring a save. Do not infer its mode
    // until an actual player position has been observed.
    if (this.playerPositionObserved) this.snapshotValue = { enabled, source: "runtime-callback" };
  }

  observeConsumedOptionAnswer(isNumberPadQuestion: boolean, answer: string): void {
    if (!isNumberPadQuestion) return;
    if (answer === "0") this.snapshotValue = { enabled: false, source: "answered-option" };
    else if (answer === "1" || answer === "2") this.snapshotValue = { enabled: true, source: "answered-option" };
  }

  snapshot(): ObservedNumberPadSnapshot { return { ...this.snapshotValue }; }
}
