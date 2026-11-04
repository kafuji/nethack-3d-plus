import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const toolNames = ['get_state', 'continue_game_over', 'get_app_state', 'list_saves', 'list_trial_saves', 'save_trial_slot', 'load_trial_save', 'start_game', 'load_game', 'return_to_title', 'respond_confirmation', 'get_map', 'get_inventory', 'move', 'command', 'extended_command', 'answer_prompt', 'submit_text', 'select_menu', 'dismiss'];

test('stdio tools bridge only to the authenticated game, one operation at a time', async t => {
  const token = '42'.repeat(32);
  const child = spawn(process.execPath, ['scripts/mcp/server.mjs'], { env: { ...process.env, NETHACK_MCP_TOKEN: token }, stdio: ['pipe', 'pipe', 'pipe'] });
  t.after(() => child.kill());
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  const responses = new Map();
  createInterface({ input: child.stdout }).on('line', line => {
    const response = JSON.parse(line);
    responses.get(response.id)?.(response);
    responses.delete(response.id);
  });
  function rpc(id, method, params) {
    const response = new Promise(resolve => responses.set(id, resolve));
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    return response;
  }
  const clientId = '11111111-1111-4111-8111-111111111111';
  function poll(data = {}, origin = 'http://localhost:5173') {
    return fetch('http://127.0.0.1:38383/game/poll', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ token, clientId, ...data }) });
  }
  for (let i = 0; ; i++) {
    try { await poll(); break; } catch (error) { if (i >= 50) throw new Error(`Bridge did not start: ${stderr}`, { cause: error }); await delay(20); }
  }
  assert.equal((await poll({}, 'https://attacker.example')).status, 403);
  assert.equal((await poll({ token: '00'.repeat(32) })).status, 403);
  assert.equal((await poll({ clientId: '22222222-2222-4222-8222-222222222222' })).status, 409);
  const init = await rpc(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  assert.equal(init.result.protocolVersion, '2025-06-18');
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
  const listed = await rpc(2, 'tools/list');
  assert.deepEqual(listed.result.tools.map(item => item.name), toolNames);
  const invalid = await rpc(3, 'tools/call', { name: 'move', arguments: { direction: 'n' } });
  assert.equal(invalid.result.isError, true);

  const resultPromise = rpc(4, 'tools/call', { name: 'get_state', arguments: {} });
  let request;
  for (let i = 0; i < 50; i++) {
    ({ request } = await (await poll()).json());
    if (request) break;
    await delay(20);
  }
  assert.equal(request.method, 'get_state');
  assert.equal((await (await poll()).json()).request, null, 'a delivered request must never be sent twice');
  const busy = await rpc(5, 'tools/call', { name: 'get_state', arguments: {} });
  assert.equal(busy.result.isError, true);
  await poll({ result: { id: request.id, result: { sessionId: 'session', inputWait: { requestId: 7, purpose: 'question' } } } });
  const result = await resultPromise;
  assert.equal(JSON.parse(result.result.content[0].text).inputWait.requestId, 7);

  const exited = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('MCP server failed to exit on stdin EOF')), 5000);
    child.once('exit', code => { clearTimeout(timer); resolve(code); });
  });
  child.stdin.end();
  assert.equal(await exited, 0);
});

test('official SDK client discovers and calls the server over stdio', async t => {
  const token = '53'.repeat(32);
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['scripts/mcp/server.mjs'],
    env: { ...process.env, NETHACK_MCP_TOKEN: token },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'nethack-sdk-integration-test', version: '1.0.0' });
  t.after(async () => { await client.close(); });
  await client.connect(transport);
  const listed = await client.listTools();
  assert.deepEqual(listed.tools.map(tool => tool.name).sort(), [...toolNames].sort());
  for (const tool of listed.tools) assert.equal(tool.annotations.readOnlyHint, ['get_state', 'get_app_state', 'list_saves', 'list_trial_saves', 'get_map', 'get_inventory'].includes(tool.name));
  const invalid = await client.callTool({ name: 'move', arguments: { direction: 'n' } });
  assert.equal(invalid.isError, true);
  const unexpected = await client.callTool({ name: 'move', arguments: { direction: 'n', sessionId: 's', requestId: 1, extra: true } });
  assert.equal(unexpected.isError, true);
  const identity = { sessionId: 'sdk-session', requestId: 9 };
  for (const [name, args] of [
    ['get_map', { extra: true }],
    ['get_inventory', { extra: true }],
    ['continue_game_over', { sessionId: 'sdk-session', revealId: 0 }],
    ['command', { ...identity, key: 'multiple' }],
    ['command', { ...identity, key: '' }],
    ['command', { ...identity, key: 'Ctrl+ab' }],
    ['command', { ...identity, key: 'Meta+?' }],
    ['command', { ...identity, key: 'n', sessionId: 's'.repeat(129) }],
    ['extended_command', { ...identity, command: '' }],
    ['extended_command', { ...identity, command: 'x'.repeat(81) }],
    ['extended_command', { ...identity, command: 'bad command' }],
    ['answer_prompt', { ...identity, answer: '' }],
    ['submit_text', { ...identity, text: 'x'.repeat(256) }],
    ['submit_text', { ...identity, text: 'a\u0000b' }],
    ['select_menu', { ...identity, selections: [{ index: -1 }] }],
    ['select_menu', { ...identity, selections: [{ index: 0, count: 0 }] }],
    ['select_menu', { ...identity, selections: [{ index: 0, count: 2147483648 }] }],
    ['select_menu', { ...identity, selections: [{ index: 0, count: 4294967295 }] }],
    ['select_menu', { ...identity, selections: [{ index: 0, extra: true }] }],
    ['select_menu', { ...identity, selections: Array.from({ length: 257 }, (_, index) => ({ index })) }],
    ['list_saves', { runtimeVersion: 'unknown' }],
    ['start_game', { mode: 'random', runtimeVersion: '3.6.7', name: '' }],
    ['start_game', { mode: 'random', runtimeVersion: '3.6.7', name: 'MCP', playmode: 'invalid' }],
    ['load_game', { runtimeVersion: '3.6.7', saveKey: '' }],
    ['return_to_title', { extra: true }],
    ['respond_confirmation', { confirmationId: 0, choice: 'confirm' }],
    ['dismiss', { ...identity, requestId: 0 }],
  ]) {
    assert.equal((await client.callTool({ name, arguments: args })).isError, true, `${name} must reject invalid arguments`);
  }

  const clientId = '11111111-1111-4111-8111-111111111111';
  async function poll(data = {}) {
    return fetch('http://127.0.0.1:38383/game/poll', { method: 'POST', headers: { origin: 'http://localhost:5173', 'content-type': 'application/json' }, body: JSON.stringify({ token, clientId, ...data }) });
  }
  for (let i = 0; ; i++) {
    try { await poll(); break; } catch (error) { if (i >= 50) throw error; await delay(20); }
  }
  const resultPromise = client.callTool({ name: 'get_state', arguments: {} });
  let request;
  for (let i = 0; i < 50; i++) {
    ({ request } = await (await poll()).json());
    if (request) break;
    await delay(20);
  }
  assert.equal(request.method, 'get_state');
  const originalId = request.id;
  await poll({ result: { id: request.id, result: { sessionId: 'sdk-session', inputWait: { requestId: 9 } } } });
  const result = await resultPromise;
  assert.equal(JSON.parse(result.content[0].text).inputWait.requestId, 9);
  const movePromise = client.callTool({ name: 'move', arguments: { direction: 'e', sessionId: 'sdk-session', requestId: 9 } });
  request = null;
  for (let i = 0; i < 50; i++) {
    ({ request } = await (await poll()).json());
    if (request) break;
    await delay(20);
  }
  assert.equal(request.method, 'move');
  assert.equal(request.params.direction, 'e');
  await poll({ result: { id: request.id, result: { status: 'submitted' } } });
  const moved = await movePromise;
  assert.equal(JSON.parse(moved.content[0].text).status, 'submitted');

  // Verify each supported operation survives the SDK validation and arrives
  // exactly once, unchanged, at the browser bridge.
  for (const [name, args] of [
    ['get_map', {}],
    ['get_inventory', {}],
    ['continue_game_over', { sessionId: 'sdk-session', revealId: 1 }],
    ['get_app_state', {}],
    ['list_saves', { runtimeVersion: '3.6.7' }],
    ['list_trial_saves', { runtimeVersion: '3.6.7' }],
    ['load_trial_save', { runtimeVersion: '3.6.7', name: 'MCP', kind: 'slot', slot: 1 }],
    ['start_game', { mode: 'random', runtimeVersion: '3.6.7', name: 'MCP', playmode: 'trial' }],
    ['load_game', { runtimeVersion: '3.6.7', saveKey: 'save-key' }],
    ['return_to_title', {}],
    ['respond_confirmation', { confirmationId: 1, choice: 'cancel' }],
    ['command', { ...identity, key: 'Ctrl+a' }],
    ['command', { ...identity, key: 'Meta+p' }],
    ...['Enter', 'Escape', 'Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].map(key => ['command', { ...identity, key }]),
    ['extended_command', { ...identity, command: 'pray' }],
    ['answer_prompt', { ...identity, answer: 'Escape' }],
    ['submit_text', { ...identity, text: '' }],
    ['select_menu', { ...identity, selections: [{ index: 0, count: 2 }, { index: 3 }] }],
    ['select_menu', { ...identity, selections: [{ index: 0, count: 2147483647 }] }],
    ['select_menu', { ...identity, selections: [] }],
    ['dismiss', identity],
  ]) {
    const call = client.callTool({ name, arguments: args });
    request = null;
    for (let i = 0; i < 50; i++) {
      ({ request } = await (await poll()).json());
      if (request) break;
      await delay(20);
    }
    assert.equal(request?.method, name);
    assert.deepEqual(request.params, args);
    assert.equal((await (await poll()).json()).request, null);
    await poll({ result: { id: request.id, result: { method: name } } });
    assert.equal(JSON.parse((await call).content[0].text).method, name);
  }

  // Reconnect the same simulated browser to a fresh server. Its client cache
  // must not mistake the new server's first request for an old result.
  await client.close();
  const restartedTransport = new StdioClientTransport({
    command: process.execPath,
    args: ['scripts/mcp/server.mjs'],
    env: { ...process.env, NETHACK_MCP_TOKEN: token },
    stderr: 'pipe',
  });
  const restartedClient = new Client({ name: 'nethack-sdk-restart-test', version: '1.0.0' });
  t.after(async () => { await restartedClient.close(); });
  await restartedClient.connect(restartedTransport);
  for (let i = 0; ; i++) {
    try { await poll(); break; } catch (error) { if (i >= 50) throw error; await delay(20); }
  }
  const restartedResult = restartedClient.callTool({ name: 'get_state', arguments: {} });
  request = null;
  for (let i = 0; i < 50; i++) {
    ({ request } = await (await poll()).json());
    if (request) break;
    await delay(20);
  }
  assert.equal(request.method, 'get_state');
  assert.notEqual(request.id, originalId);
  await poll({ result: { id: request.id, result: { sessionId: 'restarted-session' } } });
  assert.equal(JSON.parse((await restartedResult).content[0].text).sessionId, 'restarted-session');
});
