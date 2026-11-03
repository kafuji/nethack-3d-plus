import type { RuntimeEvent } from "../runtime";

/** Marks status snapshots as available only after this session emits status. */
export class ObservedStatus {
  private sessionId: string | null = null;
  private available = false;

  observe(event: RuntimeEvent, sessionId: string): void {
    if (this.sessionId !== sessionId) {
      this.sessionId = sessionId;
      this.available = false;
    }
    if (event.type === "status_update") this.available = true;
  }

  hasStatus(sessionId: string): boolean {
    return this.sessionId === sessionId && this.available;
  }
}
