import type { RuntimeEvent } from "../runtime";

/** Tracks whether the runtime has actually captured inventory, including an empty inventory. */
export class ObservedInventory {
  private sessionId: string | null = null;
  private available = false;
  private revision = 0;

  observe(event: RuntimeEvent, sessionId: string): void {
    if (this.sessionId !== sessionId) {
      this.sessionId = sessionId;
      this.available = false;
      this.revision = 0;
    }
    if (event.type === "inventory_update") {
      this.available = event.snapshotAvailable === true;
      if (this.available) this.revision++;
    }
  }

  snapshot(): { available: boolean; revision: number } {
    return { available: this.available, revision: this.revision };
  }
}
