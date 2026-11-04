const http = require('http'), fs = require('fs'), { spawn } = require('child_process');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9223;
const server = http.createServer((req, res) => {
  const file = '.' + req.url.split('?')[0];
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(buf);
  });
}).listen(8104);

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox',
  '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
  '--autoplay-policy=no-user-gesture-required',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + require('os').tmpdir().split(String.fromCharCode(92)).join('/') + '/chrome-cam9',
  'http://localhost:8104/_cam.html'
], { stdio: ['ignore', fs.openSync('_chrome.log','w'), fs.openSync('_chrome.log','a')] });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = path => new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port: PORT, path }, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
  }).on('error', rej);
});

(async () => {
  let target = null;
  for (let i = 0; i < 80 && !target; i++) {
    try {
      const list = await getJson('/json/list');
      target = list.find(t => t.type === 'page' && t.url.includes('_cam.html'));
    } catch (e) {}
    if (!target) await sleep(250);
  }
  if (!target) { console.log('NO TARGET'); return done(); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const send = (method, params) => new Promise(res => {
    const mid = ++id;
    const onMsg = e => {
      const m = JSON.parse(e.data);
      if (m.id === mid) { ws.removeEventListener('message', onMsg); res(m); }
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  let val = '';
  for (let i = 0; i < 100 && !val; i++) {
    const r = await send('Runtime.evaluate', { expression: 'window.__done || ""', returnByValue: true });
    val = (r.result && r.result.result && r.result.result.value) || '';
    if (val) break;
    if (i === 40) {
      const err = await send('Runtime.evaluate', { expression: 'window.__probe || ""', returnByValue: true });
      console.error('probe:', JSON.stringify(err.result && err.result.result && err.result.result.value));
    }
    await sleep(250);
  }
  console.log(val || 'NO RESULT');
  ws.close();
  done();
})().catch(e => { console.log('ERR ' + e.message); done(); });

function done() {
  try { server.close(); } catch (e) {}
  try { chrome.kill(); } catch (e) {}
  setTimeout(() => process.exit(0), 400);
}
