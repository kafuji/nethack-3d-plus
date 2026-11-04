# NetHack 3D MCP prototype

This experimental local bridge lets an MCP client control a game in a development browser tab. It exposes the app and game state, observed map and inventory, command keys and extended commands, questions, text input, menu selections and position selection. It connects to the same session as the visible game and can be enabled from the title screen or during play.

## Manual smoke test on Windows

1. In a terminal, start the development server on loopback: `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`.
2. In another PowerShell session, create a fresh 32-byte token, copy it to the clipboard, and launch the manual MCP client. The client starts the bridge as a child process. The clipboard contains a credential until replaced.

   ```powershell
   $env:NETHACK_MCP_TOKEN = node -p "require('node:crypto').randomBytes(32).toString('hex')"
   $env:NETHACK_MCP_TOKEN | Set-Clipboard
   node scripts/mcp/client-smoke.mjs
   ```

3. Open `http://127.0.0.1:5173/`. Select **MCP接続**, enter the copied token in the form, and select **接続**. **キャンセル** leaves the bridge disabled. Use a separate test game: actions affect the actual session and save data used by the tab.
4. In the manual client's terminal, enter `{"name":"get_state","arguments":{}}` on one line. After dismissing any startup dialogs, use the returned `sessionId` and `inputWait.requestId` in a call such as `{"name":"move","arguments":{"direction":"e","sessionId":"...","requestId":123}}`. Call `get_state` again to observe the result. For a displayed simple question, use `{"name":"answer_prompt","arguments":{"answer":"n","sessionId":"...","requestId":123}}` with the *current* values from `get_state`.
5. Select **MCP切断** to disconnect the game, and stop the client to close the bridge. The same tab can reconnect to the running server; restart the server to connect a different tab. Replace the clipboard content and discard the token after the test.

If the dev server uses a different port, set `NETHACK_MCP_ORIGIN` in the client process to its exact origin, for example `http://127.0.0.1:5190`. Without it, only `http://localhost:5173` and `http://127.0.0.1:5173` are accepted. The configured origin must use HTTP, `localhost` or `127.0.0.1`, and an explicit port. The browser-to-bridge endpoint is fixed at `127.0.0.1:38383`; if it is occupied, the bridge fails to start.

## MCP client configuration

Install the project's development dependencies with `npm install` before starting the MCP server. Node.js 20 or later is required by the MCP SDK. Configure a stdio MCP server with the `node` executable as the command, an absolute path to `scripts/mcp/server.mjs` as its argument, and `NETHACK_MCP_TOKEN` in its environment. Set `NETHACK_MCP_ORIGIN` too if needed. Give the same fresh token to the game's connection form. How environment variables and working directories are configured depends on the client; protect any configuration file that contains the token. The MCP client must actually launch the server before the game can connect. Do not add a token to a page URL, repository file, or public log.

The prototype uses the official [MCP TypeScript server SDK](https://github.com/modelcontextprotocol/typescript-sdk/tree/main/packages/server) for stdio transport, protocol negotiation, and tool definitions. Its browser-to-game bridge remains project-specific. Compatibility with every MCP client has not been established.

## Operation and limits

The bridge binds to IPv4 loopback, checks the browser origin and HTTP host, and requires a 64-hex-character shared token. Only one game tab is accepted per server process, and only one tool call can be in flight. A delivered request is not retried. If a response times out after delivery, the action may have occurred: observe the state before deciding what to do. `submitted` confirms dispatch, not completion.

Actions require the current session and input-wait IDs; stale IDs are rejected. The game and human share control, so the human can change the state between observation and action. Use `get_app_state` to inspect startup, game-over and confirmation states; `start_game` and `load_game` return an operation ID, and confirmation prompts must be answered with their current confirmation ID. `get_state` reports the active game and prompt, while `get_map` returns the last displayed characters, not a guarantee of current visibility or a source of hidden game state. `get_inventory` reports whether an inventory snapshot is available; it can become stale after actions, so refresh it by opening the inventory. Use `command` or `extended_command` to initiate an action, and answer the resulting wait with `answer_prompt`, `submit_text`, `select_menu`, or `dismiss`. Menu selection indices are the `index` values in the observed prompt. Position prompts expose the cursor; use direction answers to move it and Enter or Escape to finish. This is a development prototype, not a hardened public service: keep it local and enable it only when needed.

When `get_state.gameOverReveal` is present, use `continue_game_over` with its `sessionId` and `revealId` to continue the local death-screen pause. This does not send a key to NetHack; observe the state again and answer the postmortem prompts normally. The sequence after `#quit` has been exercised through the SDK in NetHack 3.6.7; an actual in-game death has not yet been verified.

For startup operations, `cancelled` means the overwrite confirmation was declined; `completed` means the startup request was accepted, not that the game has finished loading. Observe `get_state` and wait for an input request before sending game commands.

While the inventory is open, `get_state.prompt.type` is `inventory`. Read the items with `get_inventory` and close the window with `dismiss` before issuing another command.

For resumed saves, `get_state.numberPadMode` may be `null` when the actual direction-key mode cannot be verified. In that case `move` and directional answers are blocked to avoid sending the wrong commands. Use `command` with `O`, select `number_pad` in the options menu and explicitly choose its mode; once that answer is consumed, directional operations are available again.

`list_trial_saves` can list trial slots and snapshots, but `load_trial_save` deliberately fails without modifying storage. The previous game worker may still have IndexedDB writes in flight after returning to the title; restoration must remain disabled until worker shutdown and storage access can be coordinated safely.

To create a trial slot through MCP, issue `S`, answer its save confirmation, return to the title, and call `list_saves`. Call `save_trial_slot` with the exact character name and manual save key plus a slot number from 1 to 3; it replaces that slot. Then `load_game` can resume the ordinary manual save. The copy is read twice and rejected if it changes during those checks, but this does not prove that a previous worker or another tab has stopped writing. This creates a slot without enabling `load_trial_save`.

Each map cell includes the original displayed character and a coarse `kind` derived from the same displayed glyph used by the game (for example `floor`, `wall`, `door_open`, `door_closed`, `stairs_up`, `stairs_down`, `creature`, or `item`). The character may use IBM/DEC graphics; `kind` makes those tiles easier to interpret. The player's position is reported separately by `get_state`. Cell kinds describe the last observed display and can be stale; they do not prove current visibility or expose hidden entity identifiers.

Run the bridge integration test with `node --test scripts/mcp/server.test.mjs`. It needs permission to bind and connect to loopback.
