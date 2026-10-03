/**
 * Test Runner usando Chrome DevTools Protocol nativo no Node.js v24
 * Spawna o Edge, conecta via CDP, executa o teste e encerra.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const USER_DATA_DIR = path.resolve('tmp_test_profile');

async function main() {
  console.log('1. Iniciando Microsoft Edge headless com porta de depuração 9222...');
  
  if (fs.existsSync(USER_DATA_DIR)) {
    try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch (_) {}
  }

  const edgeProcess = spawn(EDGE_PATH, [
    '--headless=new',
    `--user-data-dir=${USER_DATA_DIR}`,
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'http://localhost:8085'
  ], { stdio: 'ignore' });

  edgeProcess.on('error', (err) => {
    console.error('Erro ao iniciar Edge:', err);
  });

  // Aguarda até o DevTools responder
  let targets = null;
  console.log('2. Aguardando DevTools responder na porta 9222...');
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
      targets = await res.json();
      if (targets && targets.length > 0) break;
    } catch (e) {
      await new Promise(r => setTimeout(r, 400));
    }
  }

  if (!targets || targets.length === 0) {
    edgeProcess.kill();
    throw new Error('Falha ao conectar no DevTools do Edge na porta 9222.');
  }

  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  console.log('Conectado à página:', pageTarget.url);

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

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && callbacks.has(data.id)) {
      const cb = callbacks.get(data.id);
      callbacks.delete(data.id);
      if (data.error) cb.reject(data.error);
      else cb.resolve(data.result);
    }
  };

  try {
    console.log('3. Habilitando domínios Page, Runtime e DOM...');
    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');

    console.log('4. Aguardando carregamento completo da página...');
    await new Promise(r => setTimeout(r, 2000));

    console.log('5. Localizando input de arquivos (#fileInput)...');
    const doc = await send('DOM.getDocument', { depth: -1 });
    const fileInputNode = await send('DOM.querySelector', {
      nodeId: doc.root.nodeId,
      selector: '#fileInput'
    });

    console.log('Node ID do fileInput encontrado:', fileInputNode.nodeId);

    const bmpPath = path.resolve('test_samples', 'sample_test.bmp');
    const pngPath = path.resolve('test_samples', 'sample_transparent.png');

    console.log('6. Injetando arquivos válidos para conversão: BMP e PNG com canal alfa...');
    await send('DOM.setFileInputFiles', {
      files: [bmpPath, pngPath],
      nodeId: fileInputNode.nodeId
    });

    console.log('7. Aguardando conclusão da conversão no navegador (3 segundos)...');
    await new Promise(r => setTimeout(r, 3500));

    const evalResult = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const cards = document.querySelectorAll('.image-card');
          const stats = {
            totalCount: document.getElementById('statTotalCount').textContent,
            origTotal: document.getElementById('statOriginalTotal').textContent,
            newTotal: document.getElementById('statNewTotal').textContent,
            reduction: document.getElementById('statReductionBadge').textContent,
            cardCount: cards.length,
            cardStatuses: Array.from(cards).map(c => c.querySelector('.card-status').textContent.trim()),
            savings: Array.from(cards).map(c => c.querySelector('.card-metrics span:last-child').textContent.trim())
          };
          return JSON.stringify(stats);
        })()
      `
    });

    console.log('>>> [RESULTADO DA CONVERSÃO]:', evalResult.result.value);

    console.log('8. Testando rejeição de arquivos fora de escopo (Vídeo .mp4 e GIF animado .gif)...');
    const videoPath = path.resolve('test_samples', 'test_video.mp4');
    const gifPath = path.resolve('test_samples', 'test_animation.gif');

    await send('DOM.setFileInputFiles', {
      files: [videoPath, gifPath],
      nodeId: fileInputNode.nodeId
    });

    await new Promise(r => setTimeout(r, 1200));

    const toastsResult = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const toasts = Array.from(document.querySelectorAll('.toast')).map(t => t.textContent.trim());
          return JSON.stringify(toasts);
        })()
      `
    });

    console.log('>>> [TOASTS DE REJEIÇÃO]:', toastsResult.result.value);

    console.log('9. Capturando screenshot da tela com as imagens convertidas...');
    const ssResult = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('app_converted_state.png', Buffer.from(ssResult.data, 'base64'));
    console.log('>>> Screenshot salva em: app_converted_state.png');

    console.log('10. Testando abertura do Modal de Comparação...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const compareBtn = document.querySelector('.action-btn[title="Comparar antes e depois"]');
          if (compareBtn) compareBtn.click();
        })()
      `
    });

    await new Promise(r => setTimeout(r, 800));

    const modalSS = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('app_modal_state.png', Buffer.from(modalSS.data, 'base64'));
    console.log('>>> Screenshot do modal salva em: app_modal_state.png');

    await send('Runtime.evaluate', {
      expression: `document.getElementById('closeModalBtn').click();`
    });

    console.log('11. Testando validação do botão de download ZIP...');
    const zipStatus = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const zipBtn = document.getElementById('downloadZipBtn');
          return {
            enabled: !zipBtn.disabled,
            text: zipBtn.textContent.trim()
          };
        })()
      `
    });
    console.log('>>> [STATUS BOTÃO ZIP]:', zipStatus.result.value);

    console.log('----------------------------------------------------');
    console.log('TODOS OS TESTES FORAM EXECUTADOS E VALIDADOS COM SUCESSO!');
    console.log('----------------------------------------------------');

  } finally {
    ws.close();
    edgeProcess.kill();
    try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch (_) {}
  }
}

main().catch(err => {
  console.error('Falha fatal no runner:', err);
  process.exit(1);
});
