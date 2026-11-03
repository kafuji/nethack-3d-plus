import http from 'node:http';
import crypto from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';

// MCP uses the official SDK. The browser bridge is a separate authenticated,
// loopback-only polling endpoint.
const port = 38383;
const token = process.env.NETHACK_MCP_TOKEN ?? '';
if (!/^[a-fA-F0-9]{64}$/.test(token)) {
  console.error('NETHACK_MCP_TOKEN must be 64 hexadecimal characters generated from 32 random bytes.');
  process.exit(1);
}
const configuredOrigin = process.env.NETHACK_MCP_ORIGIN;
const allowedOrigins = new Set(['http://localhost:5173', 'http://127.0.0.1:5173']);
if (configuredOrigin) {
  let parsed;
  try { parsed = new URL(configuredOrigin); } catch { /* handled below */ }
  if (!parsed || parsed.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(parsed.hostname) || !parsed.port || parsed.origin !== configuredOrigin) {
    console.error('NETHACK_MCP_ORIGIN must be an exact http://localhost:PORT or http://127.0.0.1:PORT origin.');
    process.exit(1);
  }
  allowedOrigins.clear();
  allowedOrigins.add(parsed.origin);
}
const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

let clientId = null;
let lastPoll = 0;
let pending = null;
let nextId = 0;
// Browser tabs keep a completed-request cache across reconnects. Include an
// instance identifier so a restarted server never reuses an earlier request ID.
const instanceId = crypto.randomUUID();
function validToken(value) {
  if (typeof value !== 'string' || !/^[a-fA-F0-9]{64}$/.test(value)) return false;
  return crypto.timingSafeEqual(Buffer.from(value, 'hex'), Buffer.from(token, 'hex'));
}
function send(res, status, body, origin) {
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  if (req.headers.host !== `127.0.0.1:${port}` || !allowedOrigins.has(origin) || req.url !== '/game/poll') return send(res, 403, { error: 'Forbidden' });
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Max-Age': '600', Vary: 'Origin' });
    return res.end();
  }
  if (req.method !== 'POST' || !/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? '')) return send(res, 400, { error: 'Invalid request' }, origin);
  let body = '';
  req.setEncoding('utf8');
  req.on('data', chunk => { body += chunk; if (body.length > 65536) req.destroy(); });
  req.on('end', () => {
    let data;
    try { data = JSON.parse(body); } catch { return send(res, 400, { error: 'Invalid JSON' }, origin); }
    if (!data || !validToken(data.token) || typeof data.clientId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(data.clientId)) return send(res, 403, { error: 'Forbidden' }, origin);
    if (clientId !== null && clientId !== data.clientId) return send(res, 409, { error: 'Another game is connected; restart the MCP server to connect a different game.' }, origin);
    clientId = data.clientId;
    lastPoll = Date.now();
    if (data.result && pending && pending.sent && data.result.id === pending.id) {
      const current = pending;
      pending = null;
      clearTimeout(current.timer);
      if (Object.hasOwn(data.result, 'error')) current.reject(new Error(String(data.result.error)));
      else if (Object.hasOwn(data.result, 'result')) current.resolve(data.result.result);
      else current.reject(new Error('Invalid game response'));
    }
    let request = null;
    if (pending && !pending.sent) {
      pending.sent = true;
      request = { id: pending.id, method: pending.method, params: pending.params };
    }
    send(res, 200, { request }, origin);
  });
});
server.on('error', error => { console.error(`MCP game bridge failed: ${error.message}`); process.exitCode = 1; process.stdin.destroy(); });
server.listen(port, '127.0.0.1');

function callGame(method, params) {
  if (pending) throw new Error('Another operation is in progress.');
  if (!clientId || Date.now() - lastPoll > 5000) throw new Error('Game is not connected. Enable the MCP bridge in the game.');
  return new Promise((resolve, reject) => {
    const id = `${instanceId}:${++nextId}`;
    const timer = setTimeout(() => {
      if (pending?.id !== id) return;
      const sent = pending.sent;
      pending = null;
      reject(new Error(sent ? 'Game response timed out after delivery; the action may have occurred. Observe state before deciding what to do.' : 'Game did not receive the request.'));
    }, 15000);
    pending = { id, method, params, resolve, reject, timer, sent: false };
  });
}
function createMcpServer() {
  const mcp = new McpServer({ name: 'nethack-3d-prototype', version: '0.1.0' });
  const identity = { sessionId: z.string().min(1).max(128), requestId: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER) };
  const register = (name, description, inputSchema, readOnlyHint) => {
    mcp.registerTool(name, { description, inputSchema, annotations: { readOnlyHint } }, async args => {
      try {
        const result = await callGame(name, args);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }], isError: true };
      }
    });
  };
  const submitted = 'Input is submitted once; it may not yet be consumed. Call get_state to observe the result and obtain fresh sessionId and requestId values.';
  register('get_state', 'Observe the connected game, including its current input request, prompt and session identity. Obtain a new observation after every input.', z.strictObject({}), true);
  register('get_app_state', 'Observe title screen, startup operation, game-over state and any application confirmation. Use this even while no game is running.', z.strictObject({}), true);
  register('list_saves', 'List saves and resumability for a NetHack variant. Use the returned save key to load.', z.strictObject({ runtimeVersion: z.enum(['3.6.7', '5.0', 'slashem']) }), true);
  register('list_trial_saves', 'List trial-mode character slots and automatic snapshots for a variant.', z.strictObject({ runtimeVersion: z.enum(['3.6.7', '5.0', 'slashem']) }), true);
  register('load_trial_save', 'Unavailable: trial save restoration is disabled until worker shutdown and storage access can be safely coordinated. No saves will be modified.', z.strictObject({ runtimeVersion: z.enum(['3.6.7', '5.0', 'slashem']), name: z.string().min(1).max(128), kind: z.enum(['slot', 'snapshot']), slot: z.number().int().min(1).max(3).optional(), snapshotId: z.string().min(1).max(512).optional() }), false);
  register('start_game', 'Request a new game from the title screen. Optional playmode overrides the current startup setting; Slash\'EM supports normal only. Existing saves may require confirmation: inspect get_app_state, then use respond_confirmation. A request result does not mean the game is ready.', z.strictObject({ mode: z.enum(['random', 'create']), runtimeVersion: z.enum(['3.6.7', '5.0', 'slashem']), name: z.string().trim().min(1).max(64), playmode: z.enum(['normal', 'explore', 'debug', 'trial']).optional(), role: z.string().min(1).max(64).optional(), race: z.string().min(1).max(64).optional(), gender: z.string().min(1).max(64).optional(), align: z.string().min(1).max(64).optional() }), false);
  register('load_game', 'Request loading a resumable save from the title screen using its exact key from list_saves. Follow startup progress with get_app_state and get_state.', z.strictObject({ runtimeVersion: z.enum(['3.6.7', '5.0', 'slashem']), saveKey: z.string().min(1).max(512) }), false);
  register('return_to_title', 'Return to the title screen when a finished game offers its new-game prompt. This cannot abandon an active game.', z.strictObject({}), false);
  register('respond_confirmation', 'Answer the currently observed application confirmation using its confirmationId and one available choice. Confirming overwrite can delete an existing save.', z.strictObject({ confirmationId: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER), choice: z.enum(['confirm', 'cancel', 'extra']) }), false);
  register('get_map', 'Read the map observation cache for the current level; it may include remembered cells and is not guaranteed to be a complete currently visible map.', z.strictObject({}), true);
  register('get_inventory', 'Read the last displayed inventory snapshot; open inventory to refresh it.', z.strictObject({}), true);
  register('move', `Submit one movement direction at a normal command input. ${submitted}`, z.strictObject({ direction: z.enum(directions), ...identity }), false);
  register('command', `Submit one NetHack command key at a normal command input. Supply one printable ASCII character, Ctrl+letter / Meta+letter, Enter, Escape, Space, or an Arrow key. ${submitted}`, z.strictObject({ key: z.string().regex(/^(?:[\x20-\x7e]|Ctrl\+[A-Za-z]|Meta\+[A-Za-z]|Enter|Escape|Space|ArrowLeft|ArrowRight|ArrowUp|ArrowDown)$/i), ...identity }), false);
  register('extended_command', `Submit one named NetHack extended command (letters, digits, underscore, question mark or hyphen; maximum 80 characters) at a normal command input. Follow resulting prompts separately. ${submitted}`, z.strictObject({ command: z.string().regex(/^[A-Za-z0-9_?-]{1,80}$/), ...identity }), false);
  register('answer_prompt', `Answer a current question or direction prompt. Use one displayed choice, a direction, Enter, or Escape as appropriate. ${submitted}`, z.strictObject({ answer: z.string().min(1).max(1000), ...identity }), false);
  register('submit_text', `Submit the complete text for the current text-input prompt; up to 255 characters, without NUL. An empty string is allowed. ${submitted}`, z.strictObject({ text: z.string().max(255).regex(/^[^\u0000]*$/), ...identity }), false);
  register('select_menu', `Submit up to 256 selections for the current menu using each zero-based index from get_state.prompt.menuItems; optional count selects a quantity. Pickup menus allow an empty selections array; other menus require exactly one selection. ${submitted}`, z.strictObject({ selections: z.array(z.strictObject({ index: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER), count: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).optional() })).max(256), ...identity }), false);
  register('dismiss', `Dismiss the currently displayed dismissible prompt or information window. ${submitted}`, z.strictObject({ ...identity }), false);
  return mcp;
}

serveStdio(createMcpServer, { onerror: error => console.error(`MCP transport error: ${error.message}`) });
// The bridge owns an HTTP listener in addition to stdio. Stop it when the
// MCP client closes stdin so that the process exits without lingering sockets.
process.stdin.once('end', () => {
  if (pending) clearTimeout(pending.timer);
  server.close();
  server.closeAllConnections();
});
