// Manual development client; reads {name, arguments} tool calls as JSON lines.
// Launch with NETHACK_MCP_TOKEN and, if needed, NETHACK_MCP_ORIGIN set.
import { spawn } from 'node:child_process';
import readline from 'node:readline';

const child = spawn(process.execPath, ['scripts/mcp/server.mjs'], { stdio: ['pipe', 'pipe', 'inherit'], env: process.env });
let id = 0;
function request(method, params) {
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params })}\n`);
}
readline.createInterface({ input: child.stdout }).on('line', line => {
  console.log(line);
  const message = JSON.parse(line);
  if (message.id === 1 && message.result) {
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
    request('tools/list', {});
  }
});
child.on('exit', code => { process.exitCode = code ?? 1; process.stdin.destroy(); });
request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'nethack-smoke-client', version: '0.1.0' } });
readline.createInterface({ input: process.stdin }).on('line', line => {
  try { request('tools/call', JSON.parse(line)); }
  catch { console.error('Expected JSON: {"name":"get_state","arguments":{}}'); }
}).on('close', () => child.stdin.end());
