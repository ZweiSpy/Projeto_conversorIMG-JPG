const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const USER_DATA_DIR = path.resolve('tmp_test_profile_full');

async function main() {
  const edgeProcess = spawn(EDGE_PATH, [
    '--headless=new',
    `--user-data-dir=${USER_DATA_DIR}`,
    '--remote-debugging-port=9223',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'http://localhost:8085'
  ], { stdio: 'ignore' });

  let targets = null;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9223/json');
      targets = await res.json();
      if (targets && targets.length > 0) break;
    } catch (e) {
      await new Promise(r => setTimeout(r, 400));
    }
  }

  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let idCounter = 1;
  const callbacks = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      callbacks.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise(r => ws.onopen = r);
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && callbacks.has(data.id)) {
      const cb = callbacks.get(data.id);
      callbacks.delete(data.id);
      if (data.error) cb.reject(data.error);
      else cb.resolve(data.result);
    }
  };

  await send('Page.enable');
  await send('DOM.enable');
  await send('Runtime.enable');
  await new Promise(r => setTimeout(r, 1500));

  const doc = await send('DOM.getDocument', { depth: -1 });
  const fileInputNode = await send('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: '#fileInput'
  });

  const bmpPath = path.resolve('test_samples', 'sample_test.bmp');
  const pngPath = path.resolve('test_samples', 'sample_transparent.png');

  await send('DOM.setFileInputFiles', {
    files: [bmpPath, pngPath],
    nodeId: fileInputNode.nodeId
  });

  await new Promise(r => setTimeout(r, 3000));

  // Captura tela completa (captureBeyondViewport)
  const fullSS = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true
  });

  fs.writeFileSync('app_full_page_converted.png', Buffer.from(fullSS.data, 'base64'));
  console.log('Screenshot completa salva em app_full_page_converted.png');

  ws.close();
  edgeProcess.kill();
  try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch (_) {}
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
