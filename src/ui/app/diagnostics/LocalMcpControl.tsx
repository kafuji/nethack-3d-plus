import { useEffect, useRef, useState } from "react";
import Nethack3DEngine from "../../../game/Nethack3DEngine";
import { startLocalMcpClient, type LocalMcpStatus } from "../../../automation/local-mcp-client";
import { useGameStore } from "../../../state/gameStore";
import { createLocalMcpAppController, type LocalMcpAppDependencies } from "./local-mcp-app";

/** Explicit opt-in for the local development app, including the title screen. */
export function LocalMcpControl(dependencies: LocalMcpAppDependencies): JSX.Element | null {
  const latest = useRef(dependencies);
  latest.current = dependencies;
  const appController = useRef<ReturnType<typeof createLocalMcpAppController> | null>(null);
  if (!appController.current) appController.current = createLocalMcpAppController(() => latest.current);
  const stop = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<LocalMcpStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [token, setToken] = useState("");
  useEffect(() => () => { stop.current?.(); stop.current = null; }, []);

  const local = import.meta.env.DEV && window.location.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (!local) return null;
  const cancel = () => { setFormOpen(false); setToken(""); setError(null); };
  const connect = () => {
    try {
      stop.current = startLocalMcpClient(() => {
        const engine = useGameStore.getState().engineController;
        return engine instanceof Nethack3DEngine ? engine : null;
      }, token, setStatus, appController.current!);
      setError(null);
      setFormOpen(false);
      setToken("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  const disconnect = () => { stop.current?.(); stop.current = null; setStatus(null); setError(null); };
  const label = status === "connected" ? "接続中" : status === "connecting" ? "接続試行中" : "接続待ち・再試行中";
  return (
    <aside aria-label="ローカルMCP接続" data-local-mcp-control style={{ position: "fixed", right: 8, bottom: 8, zIndex: 10000, padding: "6px 8px", background: "rgba(0,0,0,.85)", color: "white", borderRadius: 4, fontSize: 12 }}
      onPointerDown={event => event.stopPropagation()} onKeyDown={event => {
        event.stopPropagation();
        if (formOpen && event.key === "Escape") { event.preventDefault(); cancel(); }
      }} onKeyUp={event => event.stopPropagation()}>
      {formOpen ? (
        <form onSubmit={event => { event.preventDefault(); connect(); }}>
          <label>接続トークン <input type="password" value={token} onChange={event => setToken(event.target.value)} autoComplete="off" autoFocus /></label>
          <button type="submit">接続</button>
          <button type="button" onClick={cancel}>キャンセル</button>
        </form>
      ) : <button type="button" onClick={status ? disconnect : () => setFormOpen(true)}>{status ? "MCP切断" : "MCP接続"}</button>}
      {status && <span role="status" style={{ marginLeft: 6 }}>{label}</span>}
      {error && <span role="alert" style={{ marginLeft: 6 }}>{error}</span>}
    </aside>
  );
}
