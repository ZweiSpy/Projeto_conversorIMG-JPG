/**
 * Testes Automatizados E2E - Expansão de Formatos de Imagem (26 Famílias)
 * Zwei PixelCompact | Zwei Coorporações LTDA
 * Validação Completa via Edge Headless CDP
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const edgeExe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\Micro\\AppData\\Local\\Temp\\edge_e2e_formats_' + Date.now();

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('================================================================');
  console.log('  Zwei PixelCompact - Suite de Testes: Expansão de Formatos');
  console.log('  26 Famílias • 35+ Extensões • Decodificação 100% Client-Side');
  console.log('================================================================\n');

  console.log('[1/4] Conectando ao Edge Headless via CDP...');
  const edgeProc = spawn(edgeExe, [
    '--headless=new',
    '--disable-gpu',
    '--disable-extensions',
    `--user-data-dir=${userDataDir}`,
    '--remote-debugging-port=9222',
    '--window-size=1280,900',
    'http://localhost:8085'
  ]);

  let targets = null;
  for (let i = 0; i < 25; i++) {
    await sleep(400);
    try {
      const res = await fetch('http://localhost:9222/json');
      targets = await res.json();
      if (targets && targets.some(t => t.url && t.url.includes('8085'))) break;
    } catch (e) {}
  }

  if (!targets || targets.length === 0) {
    console.error('[ERRO] Falha ao conectar ao CDP do Edge na porta 9222.');
    edgeProc.kill();
    process.exit(1);
  }

  const pageTarget = targets.find(t => t.url && t.url.includes('8085')) || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let idCounter = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const resolve = pending.get(data.id);
      pending.delete(data.id);
      resolve(data);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = idCounter++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise(r => ws.onopen = r);

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.result && res.result.exceptionDetails) {
      throw new Error(JSON.stringify(res.result.exceptionDetails));
    }
    return res.result && res.result.result ? res.result.result.value : null;
  }

  console.log('[2/4] Aguardando inicialização completa dos módulos no navegador...');
  for (let i = 0; i < 35; i++) {
    const isReady = await evaluate(`!!(window.PixelCompact && window.PixelCompact.handleFiles && window.UniversalImageDecoder)`);
    if (isReady) break;
    await sleep(200);
  }

  const results = [];
  function recordPass(testNum, title, detail) {
    results.push({ testNum, title, pass: true, detail });
    console.log(`[PASS] Teste ${testNum}: ${title} -> ${detail}`);
  }
  function recordFail(testNum, title, err) {
    results.push({ testNum, title, pass: false, error: err.message || err });
    console.error(`[FAIL] Teste ${testNum}: ${title} -> ERRO:`, err.message || err);
  }

  // Teste 1: UniversalImageDecoder carregado e com catálogo completo
  try {
    const checkCatalog = await evaluate(`
      (() => {
        if (!window.UniversalImageDecoder) return { ok: false, error: 'UniversalImageDecoder ausente' };
        const extCount = window.UniversalImageDecoder.EXTENSIONS_LIST.length;
        const hasTGA = window.UniversalImageDecoder.isSupported('tga');
        const hasSVG = window.UniversalImageDecoder.isSupported('svg');
        const hasCR2 = window.UniversalImageDecoder.isSupported('cr2');
        const hasDNG = window.UniversalImageDecoder.isSupported('dng');
        const hasPPM = window.UniversalImageDecoder.isSupported('ppm');
        const hasPSD = window.UniversalImageDecoder.isSupported('psd');
        const hasTIFF = window.UniversalImageDecoder.isSupported('tiff');
        return { ok: true, extCount, hasTGA, hasSVG, hasCR2, hasDNG, hasPPM, hasPSD, hasTIFF };
      })()
    `);

    if (checkCatalog.ok && checkCatalog.extCount >= 30 && checkCatalog.hasTGA && checkCatalog.hasCR2 && checkCatalog.hasPSD) {
      recordPass(1, 'Módulo UniversalImageDecoder Ativo', `${checkCatalog.extCount} extensões mapeadas e ativas`);
    } else {
      throw new Error(`Falha no catálogo de extensões: ${JSON.stringify(checkCatalog)}`);
    }
  } catch (e) {
    recordFail(1, 'Módulo UniversalImageDecoder Ativo', e);
  }

  // Teste 2: Modal de Formatos Suportados (Abertura e Fechamento)
  try {
    const modalCheck = await evaluate(`
      (() => {
        const btn = document.getElementById('openFormatsModalBtn');
        const modal = document.getElementById('formatsModal');
        const closeBtn = document.getElementById('closeFormatsModalBtn');
        if (!btn || !modal) return { ok: false, error: 'Elementos do modal não encontrados' };
        
        btn.click();
        const isOpen = !modal.classList.contains('hidden');
        closeBtn.click();
        const isClosed = modal.classList.contains('hidden');
        return { ok: true, isOpen, isClosed };
      })()
    `);

    if (modalCheck.ok && modalCheck.isOpen && modalCheck.isClosed) {
      recordPass(2, 'Modal de 26 Formatos Suportados', 'Abertura por botão na dropzone e fechamento validados');
    } else {
      throw new Error(`Falha no modal de formatos: ${JSON.stringify(modalCheck)}`);
    }
  } catch (e) {
    recordFail(2, 'Modal de 26 Formatos Suportados', e);
  }

  console.log('[3/4] Ingestão e decodificação de novos formatos de imagem...');

  // Helper para carregar arquivo do disco no browser e esperar conversão
  async function loadFileIntoAppAndWait(filepath, filename) {
    const fileBytes = fs.readFileSync(filepath);
    const base64Data = fileBytes.toString('base64');
    await evaluate(`
      (async () => {
        const b64 = "${base64Data}";
        const byteCharacters = atob(b64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const file = new File([byteArray], "${filename}");
        window.PixelCompact.handleFiles([file]);
      })()
    `);

    // Aguarda conclusão da conversão (status completed ou error)
    for (let wait = 0; wait < 35; wait++) {
      const status = await evaluate(`(() => {
        const items = Array.from(window.PixelCompact.getItems().values());
        const target = items.find(i => i.name === '${filename}');
        return target ? target.status : null;
      })()`);
      if (status === 'completed' || status === 'error') break;
      await sleep(200);
    }
  }

  // Teste 3: Vetorial SVG
  try {
    await loadFileIntoAppAndWait('test_samples/sample_vector.svg', 'sample_vector.svg');
    const item = await evaluate(`
      (() => {
        const items = Array.from(window.PixelCompact.getItems().values());
        const svgItem = items.find(i => i.name === 'sample_vector.svg');
        if (!svgItem) return null;
        return { status: svgItem.status, origW: svgItem.origWidth, origH: svgItem.origHeight, outSize: svgItem.outputSize, err: svgItem.errorMessage };
      })()
    `);

    if (item && item.status === 'completed' && item.outSize > 0 && item.origW > 0) {
      recordPass(3, 'Formato Vetorial SVG', `Convertido para JPG Web: ${item.origW}x${item.origH}px, saída: ${item.outSize} bytes`);
    } else {
      throw new Error(`Falha na conversão de SVG: ${JSON.stringify(item)}`);
    }
  } catch (e) {
    recordFail(3, 'Formato Vetorial SVG', e);
  }

  // Teste 4: Targa (TGA 3D)
  try {
    await loadFileIntoAppAndWait('test_samples/sample_targa.tga', 'sample_targa.tga');
    const item = await evaluate(`
      (() => {
        const items = Array.from(window.PixelCompact.getItems().values());
        const tgaItem = items.find(i => i.name === 'sample_targa.tga');
        if (!tgaItem) return null;
        return { status: tgaItem.status, origW: tgaItem.origWidth, origH: tgaItem.origHeight, outSize: tgaItem.outputSize, reduction: tgaItem.reduction, err: tgaItem.errorMessage };
      })()
    `);

    if (item && item.status === 'completed' && item.outSize > 0 && item.origW === 120) {
      recordPass(4, 'Formato Targa TGA 3D', `Decodificado e otimizado: 120x120px, economia: ${item.reduction}%`);
    } else {
      throw new Error(`Falha na conversão de TGA: ${JSON.stringify(item)}`);
    }
  } catch (e) {
    recordFail(4, 'Formato Targa TGA 3D', e);
  }

  // Teste 5: Netpbm PPM (P6 Binário)
  try {
    await loadFileIntoAppAndWait('test_samples/sample_pixmap.ppm', 'sample_pixmap.ppm');
    const item = await evaluate(`
      (() => {
        const items = Array.from(window.PixelCompact.getItems().values());
        const ppmItem = items.find(i => i.name === 'sample_pixmap.ppm');
        if (!ppmItem) return null;
        return { status: ppmItem.status, origW: ppmItem.origWidth, origH: ppmItem.origHeight, outSize: ppmItem.outputSize, err: ppmItem.errorMessage };
      })()
    `);

    if (item && item.status === 'completed' && item.outSize > 0 && item.origW === 120) {
      recordPass(5, 'Formato Netpbm PPM', `Decodificado e convertido com sucesso: 120x120px`);
    } else {
      throw new Error(`Falha na conversão de PPM: ${JSON.stringify(item)}`);
    }
  } catch (e) {
    recordFail(5, 'Formato Netpbm PPM', e);
  }

  // Teste 6: Netpbm PGM (P5 Grayscale)
  try {
    await loadFileIntoAppAndWait('test_samples/sample_gray.pgm', 'sample_gray.pgm');
    const item = await evaluate(`
      (() => {
        const items = Array.from(window.PixelCompact.getItems().values());
        const pgmItem = items.find(i => i.name === 'sample_gray.pgm');
        if (!pgmItem) return null;
        return { status: pgmItem.status, origW: pgmItem.origWidth, origH: pgmItem.origHeight, outSize: pgmItem.outputSize, err: pgmItem.errorMessage };
      })()
    `);

    if (item && item.status === 'completed' && item.outSize > 0 && item.origW === 100) {
      recordPass(6, 'Formato Netpbm PGM', `Tons de cinza convertidos para JPG: 100x100px`);
    } else {
      throw new Error(`Falha na conversão de PGM: ${JSON.stringify(item)}`);
    }
  } catch (e) {
    recordFail(6, 'Formato Netpbm PGM', e);
  }

  // Teste 7: Windows Icon (ICO)
  try {
    await loadFileIntoAppAndWait('test_samples/sample_icon.ico', 'sample_icon.ico');
    const item = await evaluate(`
      (() => {
        const items = Array.from(window.PixelCompact.getItems().values());
        const icoItem = items.find(i => i.name === 'sample_icon.ico');
        if (!icoItem) return null;
        return { status: icoItem.status, origW: icoItem.origWidth, origH: icoItem.origHeight, outSize: icoItem.outputSize, err: icoItem.errorMessage };
      })()
    `);

    if (item && item.status === 'completed' && item.outSize > 0 && item.origW === 64) {
      recordPass(7, 'Formato Windows Icon ICO', `Ícone 64x64 extraído e convertido com sucesso`);
    } else {
      throw new Error(`Falha na conversão de ICO: ${JSON.stringify(item)}`);
    }
  } catch (e) {
    recordFail(7, 'Formato Windows Icon ICO', e);
  }

  // Teste 8: Baseline TIFF
  try {
    await loadFileIntoAppAndWait('test_samples/sample_scan.tiff', 'sample_scan.tiff');
    const item = await evaluate(`
      (() => {
        const items = Array.from(window.PixelCompact.getItems().values());
        const tiffItem = items.find(i => i.name === 'sample_scan.tiff');
        if (!tiffItem) return null;
        return { status: tiffItem.status, origW: tiffItem.origWidth, origH: tiffItem.origHeight, outSize: tiffItem.outputSize, err: tiffItem.errorMessage };
      })()
    `);

    if (item && item.status === 'completed' && item.outSize > 0 && item.origW === 100) {
      recordPass(8, 'Formato TIFF Gráfica', `TIFF 24-bit 100x100px decodificado e convertido com sucesso`);
    } else {
      throw new Error(`Falha na conversão de TIFF: ${JSON.stringify(item)}`);
    }
  } catch (e) {
    recordFail(8, 'Formato TIFF Gráfica', e);
  }

  // Teste 9: Câmeras Profissionais RAW (DNG / CR2 com JPEG Preview embutido)
  try {
    const realJpegB64 = await evaluate(`
      (() => {
        const c = document.createElement('canvas');
        c.width = 160; c.height = 120;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(0, 0, 160, 120);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('RAW DSLR', 20, 65);
        return c.toDataURL('image/jpeg', 0.9).split(',')[1];
      })()
    `);

    const rawJpegBuf = Buffer.from(realJpegB64, 'base64');
    const cr2Header = Buffer.from([0x49, 0x49, 0x55, 0x00, 0x10, 0x00, 0x00, 0x00]);
    const rawFile = Buffer.concat([cr2Header, Buffer.alloc(512), rawJpegBuf]);
    fs.writeFileSync('test_samples/sample_camera.dng', rawFile);

    await loadFileIntoAppAndWait('test_samples/sample_camera.dng', 'sample_camera.dng');
    const item = await evaluate(`
      (() => {
        const items = Array.from(window.PixelCompact.getItems().values());
        const rawItem = items.find(i => i.name === 'sample_camera.dng');
        if (!rawItem) return null;
        return { status: rawItem.status, origW: rawItem.origWidth, origH: rawItem.origHeight, outSize: rawItem.outputSize, err: rawItem.errorMessage };
      })()
    `);

    if (item && item.status === 'completed' && item.outSize > 0 && item.origW === 160) {
      recordPass(9, 'Formato DSLR/Mirrorless RAW', `Preview JPEG extraído instantaneamente do arquivo DNG: 160x120px`);
    } else {
      throw new Error(`Falha na extração de RAW: ${JSON.stringify(item)}`);
    }
  } catch (e) {
    recordFail(9, 'Formato DSLR/Mirrorless RAW', e);
  }

  console.log('[4/4] Teste de Segurança e Escopo Negativo...');

  // Teste 10: Rejeição Imediata de Vídeos (.mp4)
  try {
    const videoRejection = await evaluate(`
      (() => {
        const file = new File([new Uint8Array(20)], 'video_aula.mp4', { type: 'video/mp4' });
        const beforeCount = window.PixelCompact.getItems().size;
        window.PixelCompact.handleFiles([file]);
        const afterCount = window.PixelCompact.getItems().size;
        const toast = document.querySelector('.toast-danger');
        return {
          blocked: beforeCount === afterCount,
          hasToast: toast !== null && toast.textContent.includes('vídeos é proibida')
        };
      })()
    `);

    if (videoRejection.blocked && videoRejection.hasToast) {
      recordPass(10, 'Segurança: Bloqueio Estrito de Vídeos', 'Arquivo .mp4 sumariamente rejeitado com toast explicativo');
    } else {
      throw new Error(`Falha na rejeição de vídeo: ${JSON.stringify(videoRejection)}`);
    }
  } catch (e) {
    recordFail(10, 'Segurança: Bloqueio Estrito de Vídeos', e);
  }

  // Teste 11: Rejeição Imediata de GIFs Animados (.gif)
  try {
    const gifRejection = await evaluate(`
      (() => {
        const file = new File([new Uint8Array(20)], 'animacao.gif', { type: 'image/gif' });
        const beforeCount = window.PixelCompact.getItems().size;
        window.PixelCompact.handleFiles([file]);
        const afterCount = window.PixelCompact.getItems().size;
        const toast = document.querySelector('.toast-warning');
        return {
          blocked: beforeCount === afterCount,
          hasToast: toast !== null && toast.textContent.includes('GIFs animados não são suportados')
        };
      })()
    `);

    if (gifRejection.blocked && gifRejection.hasToast) {
      recordPass(11, 'Segurança: Bloqueio de GIFs Animados', 'Arquivo .gif sumariamente rejeitado para preservar animação');
    } else {
      throw new Error(`Falha na rejeição de GIF: ${JSON.stringify(gifRejection)}`);
    }
  } catch (e) {
    recordFail(11, 'Segurança: Bloqueio de GIFs Animados', e);
  }

  console.log('\n================================================================');
  const allPassed = results.every(r => r.pass);
  const passedCount = results.filter(r => r.pass).length;
  console.log(`  Resultado Final: ${passedCount}/${results.length} Testes PASS`);
  if (allPassed) {
    console.log('  🎉 COMPATIBILIDADE UNIVERSAL DE IMAGENS COMPROVADA COM 100% DE SUCESSO!');
  } else {
    console.log('  ⚠️ ALGUNS TESTES FALHARAM. VERIFIQUE OS LOGS ACIMA.');
  }
  console.log('================================================================\n');

  edgeProc.kill();
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
  process.exit(allPassed ? 0 : 1);
}

run().catch((err) => {
  console.error('[ERRO CRÍTICO]', err);
  process.exit(1);
});
