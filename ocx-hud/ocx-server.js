
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const DIR = __dirname;
const cache = path.join(DIR, 'cache.json');
const fetchScript = path.join(DIR, 'ocx-fetch.ps1');
const logf = path.join(DIR, 'server.log');
let busy = false;

function log(m) { try { fs.appendFileSync(logf, new Date().toISOString() + ' ' + m + '\n'); } catch (e) {} }

function refresh() {
  if (busy) return;
  let age = 1e9;
  try { age = Date.now() - fs.statSync(cache).mtimeMs; } catch (e) {}
  if (age < 90000) return;
  busy = true;
  execFile('pwsh', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', fetchScript], { windowsHide: true }, (err) => {
    busy = false;
    log('refresh done err=' + (err ? err.message : 'none'));
  });
}

refresh();
setInterval(refresh, 60000);

http.createServer((req, res) => {
  if (req.url.indexOf('/ocx.json') === 0) {
    refresh();
    let body = '{}';
    try { body = fs.readFileSync(cache, 'utf8'); } catch (e) {}
    res.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'no-store'
    });
    res.end(body);
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('not found');
}).listen(47900, '127.0.0.1', () => log('listening on 47900'));

