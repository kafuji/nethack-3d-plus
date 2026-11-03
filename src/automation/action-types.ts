/** One input operation against the currently observed runtime input wait. */
export type AutomationAction =
  | { type: "command"; key: string }
  | { type: "extended"; command: string }
  | { type: "answer"; key: string }
  | { type: "text"; text: string }
  | { type: "menu"; selections: Array<{ index: number; count?: number }> }
  | { type: "dismiss" };
