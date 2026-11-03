import type Nethack3DEngine from "../game/Nethack3DEngine";
import { useGameStore } from "../state/gameStore";

type Request = { id: string | number; method: string; params?: Record<string, unknown> };
type Reply = { id: string | number; result?: unknown; error?: string };
export type LocalMcpStatus = "connecting" | "connected" | "error";
export type LocalMcpAppController = { execute(method: string, params: Record<string, unknown>): Promise<unknown> };
let pageClientId: string | null = null;
let activeClientStop: (() => void) | null = null;

const directions: Record<string, [string, string]> = {
  n: ["8", "k"], ne: ["9", "u"], e: ["6", "l"], se: ["3", "n"],
  s: ["2", "j"], sw: ["1", "b"], w: ["4", "h"], nw: ["7", "y"],
};

function state(engine: Nethack3DEngine) {
  const ui = useGameStore.getState();
  const context = engine.getAutomationContext();
  return {
    sessionId: context.inputWait?.sessionId ?? null,
    connectionState: ui.connectionState,
    inputWait: context.inputWait && { requestId: context.inputWait.requestId, purpose: context.inputWait.purpose, isPrompt: context.inputWait.isPrompt },
    position: context.position,
    player: context.player,
    messages: context.messages,
    prompt: ui.directionQuestion ? { type: "direction", text: ui.directionQuestion }
      : ui.question ? { type: "question", ...ui.question, menuItems: context.menuItems }
      : ui.textInput ? { type: "text", ...ui.textInput }
      : ui.infoMenu ? { type: "info", ...ui.infoMenu }
      : ui.positionInputActive ? { type: "position", text: ui.positionRequest, cursor: context.positionCursor } : null,
    gameOver: ui.gameOver.active,
    gameOverDetails: ui.gameOver.active ? { deathMessage: ui.gameOver.deathMessage, promptReady: ui.gameOver.promptReady, tombstoneLines: ui.gameOver.tombstoneLines, postmortemReports: ui.gameOver.postmortemReports } : null,
    numberPadMode: context.numberPadMode.enabled,
    numberPadModeSource: context.numberPadMode.source,
    extendedCommands: ui.extendedCommands,
  };
}

/** Apply one operation against the exact input wait observed by the client. */
export function executeLocalMcpRequest(engine: Nethack3DEngine, request: Request): unknown {
  if (request.method === "get_state") return state(engine);
  if (request.method === "get_map") return engine.getAutomationContext().map;
  if (request.method === "get_inventory") {
    const inventory = useGameStore.getState().inventory;
    const snapshot = engine.getAutomationContext().inventorySnapshot;
    return { ...snapshot, visible: inventory.visible, freshness: "last inventory snapshot; it can become stale; open inventory to refresh", items: snapshot.available ? inventory.items.map(item => ({ text: item.text, accelerator: item.accelerator, isCategory: item.isCategory, isSelectable: item.isSelectable })) : [] };
  }
  const params = request.params ?? {};
  if (typeof params.sessionId !== "string" || !Number.isSafeInteger(params.requestId)) throw new Error("sessionId and requestId are required");
  const ui = useGameStore.getState();
  let action: Parameters<Nethack3DEngine["submitAutomationAction"]>[2];
  if (request.method === "move") {
    if (ui.infoMenu || ui.textInput || ui.inventory.visible || ui.positionInputActive) throw new Error("A dialog or position selection is active");
    const pair = typeof params.direction === "string" ? directions[params.direction] : undefined;
    if (!pair) throw new Error("direction must be one of n, ne, e, se, s, sw, w, nw");
    const mode = engine.getAutomationContext().numberPadMode.enabled;
    if (mode === null) throw new Error("Direction mode is unknown after loading. Use command O and set number_pad to 0 or 1 before moving.");
    action = { type: "command", key: pair[mode ? 0 : 1] };
  } else if (request.method === "command") {
    if (typeof params.key !== "string") throw new Error("key is required");
    const modified = /^(Ctrl|Meta)\+([a-z])$/i.exec(params.key);
    const key = modified ? `__${modified[1].toUpperCase()}__:${modified[2].toLowerCase()}` : params.key;
    if (!modified && key.length !== 1 && !["Enter", "Escape", "Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) throw new Error("Use one key, a named key, Ctrl+letter or Meta+letter");
    action = { type: "command", key };
  } else if (request.method === "extended_command") {
    if (typeof params.command !== "string") throw new Error("command is required");
    action = { type: "extended", command: params.command };
  } else if (request.method === "answer_prompt") {
    if (typeof params.answer !== "string") throw new Error("answer is required");
    const pair = (ui.directionQuestion || ui.positionInputActive) ? directions[params.answer] : undefined;
    const directional = Boolean(ui.directionQuestion || ui.positionInputActive);
    const mode = directional ? engine.getAutomationContext().numberPadMode.enabled : null;
    if (directional && mode === null && (pair || /^(?:[1-9hjklyubn]|Arrow(?:Left|Right|Up|Down)|Numpad[1-9])$/.test(params.answer))) {
      throw new Error("Direction mode is unknown after loading. Cancel this prompt and set number_pad with command O.");
    }
    action = { type: "answer", key: pair ? pair[mode ? 0 : 1] : params.answer };
  } else if (request.method === "submit_text") {
    if (typeof params.text !== "string") throw new Error("text is required");
    action = { type: "text", text: params.text };
  } else if (request.method === "select_menu") {
    if (!Array.isArray(params.selections)) throw new Error("selections is required");
    action = { type: "menu", selections: params.selections };
  } else if (request.method === "dismiss") {
    action = { type: "dismiss" };
  } else {
    throw new Error("Unknown method");
  }
  engine.submitAutomationAction(params.sessionId, params.requestId as number, action);
  return { status: "submitted", message: "Input was submitted; call get_state to observe the result." };
}

/** Called only by the opt-in localhost development control. */
export function startLocalMcpClient(getEngine: () => Nethack3DEngine | null, token: string, onStatus: (status: LocalMcpStatus) => void, appController: LocalMcpAppController): () => void {
  const url = new URL(window.location.href);
  if (!import.meta.env.DEV || !["localhost", "127.0.0.1"].includes(url.hostname) || url.protocol !== "http:") throw new Error("MCP is only available in localhost development mode");
  if (!/^[a-fA-F0-9]{64}$/.test(token)) throw new Error("Token must be 64 hexadecimal characters");
  if (activeClientStop) throw new Error("MCP is already connected on this page");
  const clientId = pageClientId ??= crypto.randomUUID();
  const completed = new Map<string | number, Reply>();
  const controller = new AbortController();
  let stopped = false;
  let reply: Reply | undefined;
  let lastStatus: LocalMcpStatus | null = null;
  const reportStatus = (status: LocalMcpStatus) => {
    if (lastStatus !== status) { lastStatus = status; onStatus(status); }
  };
  reportStatus("connecting");
  const poll = async () => {
    while (!stopped) {
      try {
        const response = await fetch("http://127.0.0.1:38383/game/poll", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, clientId, ...(reply ? { result: reply } : {}) }), signal: controller.signal,
        });
        if (stopped) break;
        if (!response.ok) throw new Error(`MCP bridge returned ${response.status}`);
        reply = undefined;
        const payload = await response.json() as { request?: Request | null };
        if (stopped) break;
        reportStatus("connected");
        const request = payload.request;
        if (request && (typeof request.id === "string" || typeof request.id === "number")) {
          reply = completed.get(request.id);
          if (!reply) {
            try {
              const appMethods = ["get_app_state", "list_saves", "list_trial_saves", "start_game", "load_game", "load_trial_save", "return_to_title", "respond_confirmation"];
              const engine = getEngine();
              const result = appMethods.includes(request.method)
                ? await appController.execute(request.method, request.params ?? {})
                : request.method === "get_state" && !engine
                  ? await appController.execute("get_app_state", {})
                  : engine ? executeLocalMcpRequest(engine, request) : (() => { throw new Error("No active game; use get_app_state and start_game or load_game"); })();
              reply = { id: request.id, result };
            }
            catch (error) { reply = { id: request.id, error: error instanceof Error ? error.message : String(error) }; }
            completed.set(request.id, reply);
            if (completed.size > 256) completed.delete(completed.keys().next().value!);
          }
        }
      } catch (error) {
        if (stopped) break;
        if (lastStatus !== "error") console.warn("NetHack MCP connection failed:", error);
        reportStatus("error");
      }
      await new Promise<void>(resolve => window.setTimeout(resolve, 250));
    }
  };
  const stop = () => {
    stopped = true;
    controller.abort();
    if (activeClientStop === stop) activeClientStop = null;
  };
  activeClientStop = stop;
  void poll();
  return stop;
}
