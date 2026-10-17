
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DIR = __dirname;
const CLIENT = fs.readFileSync(path.join(DIR, 'ocx-client-inject.js'), 'utf8');
const CACHE = path.join(DIR, 'cache.json');
const logf = path.join(DIR, 'inject.log');
function log(m) { try { fs.appendFileSync(logf, new Date().toISOString() + ' ' + m + '\n'); } catch (e) {} }

const conns = new Map();

function readData() {
  try { return fs.readFileSync(CACHE, 'utf8'); } catch (e) { return '{}'; }
}

function push(st) {
  st.send('Runtime.evaluate', { expression: 'window.__ocxRender && window.__ocxRender(' + readData() + ')' });
}

function grow(st, target) {
  if (st.grew) { return; }
  st.send('Browser.getWindowForTarget', { targetId: target.id }, function (res) {
    const wid = res && res.result && res.result.windowId;
    const b = res && res.result && res.result.bounds;
    if (!wid || !b) { log('no window bounds: ' + JSON.stringify(res && res.error || {})); return; }
    st.grew = true;
    const nb = { left: b.left, top: Math.max(0, b.top - 170), width: b.width, height: b.height + 170 };
    st.send('Browser.setWindowBounds', { windowId: wid, bounds: nb }, function (r2) {
      log('resize -> ' + JSON.stringify(nb) + ' err=' + JSON.stringify(r2 && r2.error || null));
    });
  });
}

function ensure(target) {
  const ex = conns.get(target.id);
  if (ex && ex.ws.readyState === 1) { return ex; }
  let ws;
  try { ws = new WebSocket(target.webSocketDebuggerUrl); } catch (e) { log('ws fail ' + e.message); return null; }
  const st = { ws: ws, id: 0, pending: new Map(), grew: false, send: null };
  ws.addEventListener('message', function (ev) {
    let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.id && st.pending.has(m.id)) { const cb = st.pending.get(m.id); st.pending.delete(m.id); try { cb(m); } catch (e) {} }
  });
  st.send = function (method, params, cb) {
    if (ws.readyState !== 1) { return; }
    const id = ++st.id;
    if (cb) { st.pending.set(id, cb); }
    try { ws.send(JSON.stringify({ id: id, method: method, params: params || {} })); } catch (e) { log('send fail ' + e.message); }
  };
  ws.addEventListener('open', function () {
    log('attached ' + target.url);
    st.send('Runtime.enable');
    st.send('Page.enable');
    st.send('Page.addScriptToEvaluateOnNewDocument', { source: CLIENT });
    st.send('Runtime.evaluate', { expression: CLIENT });
    push(st);
    if (process.env.OCX_GROW === '1') { grow(st, target); }
  });
  ws.addEventListener('close', function () { conns.delete(target.id); log('detached ' + target.id); });
  ws.addEventListener('error', function () { log('ws error ' + target.id); });
  conns.set(target.id, st);
  return st;
}

async function tick() {
  let list = [];
  try {
    const r = await fetch('http://127.0.0.1:9339/json/list', { cache: 'no-store' });
    list = await r.json();
  } catch (e) { return; }
  const seen = new Set();
  for (const t of list) {
    if (!t.url || t.url.indexOf('popover.html') < 0) { continue; }
    seen.add(t.id);
    const st = ensure(t);
    if (st && st.ws.readyState === 1) { push(st); }
  }
  for (const id of Array.from(conns.keys())) {
    if (!seen.has(id)) { try { conns.get(id).ws.close(); } catch (e) {} conns.delete(id); }
  }
}

const LAUNCHER = path.join(DIR, 'launch-agentpet.exe');
function repairAutostart() {
  try {
    const out = execFileSync('reg', ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', 'AgentPet'], { encoding: 'utf8', windowsHide: true });
    if (out && out.toLowerCase().indexOf('launch-agentpet.exe') < 0) {
      execFileSync('reg', ['add', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', 'AgentPet', '/t', 'REG_SZ', '/d', '"' + LAUNCHER + '"', '/f'], { windowsHide: true });
      log('autostart repointed to launcher');
    }
  } catch (e) {}
}
repairAutostart();
setInterval(repairAutostart, 120000);
log('injector started');
tick();
setInterval(tick, 7000);

