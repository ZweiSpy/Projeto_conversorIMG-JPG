/**
 * PixelCompact JPG - Motor de Conversão e Lógica Client-Side
 * 100% no navegador • Privacidade Total • Zero Servidor
 */

(function () {
  'use strict';

  // --- 1. Constantes e Configurações Globais ---
  const MAX_CONCURRENT_CONVERSIONS = 2; // Semáforo de concorrência para poupar RAM

  const FORMATS_ALLOWED = [
    'image/png', 'image/heic', 'image/heif', 'image/bmp', 
    'image/x-ms-bmp', 'image/webp', 'image/tiff', 'image/jpeg'
  ];

  const EXTENSIONS_ALLOWED = ['png', 'heic', 'heif', 'bmp', 'webp', 'tiff', 'tif', 'jpg', 'jpeg'];
  const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'm4v'];

  // --- 2. Estado Global da Aplicação ---
  const state = {
    quality: 0.82,            // 82% por padrão (Equilibrado)
    maxDimension: 'original', // 'original' ou número (1920, 1280, 800)
    backgroundColor: '#FFFFFF',
    items: new Map(),         // id -> itemData
    queue: [],                // lista de IDs aguardando conversão
    activeWorkers: 0,         // conversões em andamento
    isZipping: false,
    isSavingFolder: false,
    isDesktop: false,
    autoConvert: localStorage.getItem('pixelcompact_auto_convert') !== 'false',
    settingsDirty: false
  };

  // --- 3. Elementos do DOM ---
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const qualitySlider = document.getElementById('qualitySlider');
  const qualityValue = document.getElementById('qualityValue');
  const presetButtons = document.querySelectorAll('.preset-btn');
  const resizeSelect = document.getElementById('resizeSelect');
  const bgFillSelect = document.getElementById('bgFillSelect');

  const autoConvertToggle = document.getElementById('autoConvertToggle');
  const reprocessHeaderBtn = document.getElementById('reprocessHeaderBtn');
  const reprocessHeaderBtnText = document.getElementById('reprocessHeaderBtnText');
  const reprocessBatchBtn = document.getElementById('reprocessBatchBtn');
  const startBatchBtn = document.getElementById('startBatchBtn');
  const startBatchBtnText = document.getElementById('startBatchBtnText');

  const statsBar = document.getElementById('statsBar');
  const statTotalCount = document.getElementById('statTotalCount');
  const statOriginalTotal = document.getElementById('statOriginalTotal');
  const statNewTotal = document.getElementById('statNewTotal');
  const statReductionBadge = document.getElementById('statReductionBadge');

  const queueSection = document.getElementById('queueSection');
  const queueHeader = document.getElementById('queueHeader');
  const queueStatusText = document.getElementById('queueStatusText');
  const queueList = document.getElementById('queueList');

  const clearBtn = document.getElementById('clearBtn');
  const saveFolderBtn = document.getElementById('saveFolderBtn');
  const downloadZipBtn = document.getElementById('downloadZipBtn');
  const toastContainer = document.getElementById('toastContainer');

  const compareModal = document.getElementById('compareModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const compareOriginalImg = document.getElementById('compareOriginalImg');
  const compareNewImg = document.getElementById('compareNewImg');
  const compareOriginalSize = document.getElementById('compareOriginalSize');
  const compareNewSize = document.getElementById('compareNewSize');

  // --- 4. Sistema de Notificações Toast ---
  function showToast(message, type = 'warning') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'danger') {
      iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else if (type === 'success') {
      iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (type === 'info') {
      iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    } else {
      iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    }

    toast.innerHTML = `${iconSvg} <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 4000);
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;');
  }

  // Formatação de bytes para formato legível (KB / MB)
  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // --- 5. Inicialização e Event Listeners de Configuração ---
  function initControls() {
    // Configura o estado inicial do toggle de início automático
    if (autoConvertToggle) {
      autoConvertToggle.checked = state.autoConvert;
      autoConvertToggle.addEventListener('change', (e) => {
        state.autoConvert = e.target.checked;
        localStorage.setItem('pixelcompact_auto_convert', state.autoConvert);
        updateGlobalUI();
        if (state.autoConvert) {
          showToast('Início automático ativado: imagens serão convertidas ao soltar.', 'info');
          startManualQueue();
        } else {
          showToast('Modo manual ativado: configure a qualidade e clique em "Iniciar Conversão".', 'info');
        }
      });
    }

    // Botões de Iniciar e Recomprimir
    if (startBatchBtn) {
      startBatchBtn.addEventListener('click', startManualQueue);
    }

    if (reprocessHeaderBtn) {
      reprocessHeaderBtn.addEventListener('click', reprocessAll);
    }

    if (reprocessBatchBtn) {
      reprocessBatchBtn.addEventListener('click', reprocessAll);
    }

    // Detector de alteração das configurações de compressão
    function onSettingsChanged() {
      const hasCompleted = Array.from(state.items.values()).some(it => it.status === 'completed');
      if (hasCompleted) {
        state.settingsDirty = true;
      }
      updateGlobalUI();
    }

    // Slider de qualidade
    qualitySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.quality = val / 100;
      qualityValue.textContent = `${val}%`;

      // Atualiza presets ativos
      presetButtons.forEach(btn => {
        const btnVal = parseInt(btn.getAttribute('data-quality'), 10);
        btn.classList.toggle('active', btnVal === val);
      });

      onSettingsChanged();
    });

    // Botões de Presets
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.getAttribute('data-quality'), 10);
        qualitySlider.value = val;
        state.quality = val / 100;
        qualityValue.textContent = `${val}%`;

        presetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        onSettingsChanged();
      });
    });

    // Redimensionamento
    resizeSelect.addEventListener('change', (e) => {
      state.maxDimension = e.target.value === 'original' ? 'original' : parseInt(e.target.value, 10);
      onSettingsChanged();
    });

    // Fundo para transparência
    bgFillSelect.addEventListener('change', (e) => {
      state.backgroundColor = e.target.value;
      onSettingsChanged();
    });

    // Limpar Lista
    clearBtn.addEventListener('click', clearAll);

    // Salvar na Pasta do PC (Desktop)
    if (saveFolderBtn) {
      saveFolderBtn.addEventListener('click', saveAllToFolder);
    }

    // Download ZIP
    downloadZipBtn.addEventListener('click', downloadAllAsZip);

    // Modal de Comparação
    closeModalBtn.addEventListener('click', closeCompareModal);
    compareModal.addEventListener('click', (e) => {
      if (e.target === compareModal) closeCompareModal();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !compareModal.classList.contains('hidden')) {
        closeCompareModal();
      }
    });
  }

  // --- 6. Interações da Dropzone (Arrastar e Soltar) ---
  function initDropzone() {
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
      fileInput.value = ''; // Permite selecionar o mesmo arquivo novamente se desejar
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        handleFiles(dt.files);
      }
    });
  }

  // --- 7. Validação e Ingestão de Arquivos ---
  function handleFiles(fileList) {
    if (!fileList || fileList.length === 0) return;

    let addedCount = 0;
    const files = Array.from(fileList);

    files.forEach(file => {
      const ext = (file.name.split('.').pop() || '').toLowerCase();

      // Regra 1: Rejeição Imediata de Vídeos
      if (VIDEO_EXTENSIONS.includes(ext) || file.type.startsWith('video/')) {
        showToast(`"${file.name}": Conversão de vídeos é proibida e fora do escopo.`, 'danger');
        return;
      }

      // Regra 2: Rejeição Imediata de GIFs Animados
      if (ext === 'gif' || file.type === 'image/gif') {
        showToast(`"${file.name}": GIFs animados não são suportados para manter a integridade da animação.`, 'warning');
        return;
      }

      // Regra 3: Rejeição de Formatos Desconhecidos / Extensões Falsas
      const isAllowedExt = EXTENSIONS_ALLOWED.includes(ext);
      const isAllowedMime = FORMATS_ALLOWED.includes(file.type) || file.type.startsWith('image/');
      
      if (!isAllowedExt && !isAllowedMime) {
        showToast(`"${file.name}": Formato de arquivo não reconhecido como imagem suportada.`, 'warning');
        return;
      }

      // Arquivo válido -> Criar registro no estado
      const id = 'img_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      const originalExt = ext.toUpperCase() || 'IMG';
      const initialStatus = state.autoConvert ? 'pending' : 'idle';

      const item = {
        id,
        file,
        name: file.name,
        cleanName: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
        originalSize: file.size,
        originalFormat: originalExt,
        originalUrl: null,
        status: initialStatus, // 'idle', 'pending', 'converting', 'completed', 'error'
        outputBlob: null,
        outputSize: 0,
        outputUrl: null,
        reduction: 0,
        origWidth: 0,
        origHeight: 0,
        newWidth: 0,
        newHeight: 0,
        errorMessage: null
      };

      // Cria URL local temporária para thumbnail original
      if (originalExt !== 'HEIC' && originalExt !== 'HEIF') {
        try {
          item.originalUrl = URL.createObjectURL(file);
        } catch (err) {
          console.warn('Erro ao criar ObjectURL original:', err);
        }
      }

      state.items.set(id, item);
      if (state.autoConvert) {
        state.queue.push(id);
      }
      renderCard(item);
      addedCount++;
    });

    if (addedCount > 0) {
      updateGlobalUI();
      if (state.autoConvert) {
        processQueue();
      } else {
        showToast(`${addedCount} imagem(ns) adicionada(s). Ajuste as configurações e clique em "Iniciar Conversão".`, 'info');
      }
    }
  }

  // --- 8. Controle de Início Manual e Recompressão ---
  function startManualQueue() {
    let queued = 0;
    state.items.forEach(item => {
      if (item.status === 'idle') {
        item.status = 'pending';
        updateCardStatus(item);
        if (!state.queue.includes(item.id)) {
          state.queue.push(item.id);
        }
        queued++;
      }
    });

    if (queued > 0) {
      state.settingsDirty = false;
      updateGlobalUI();
      processQueue();
    }
  }

  function startSingleItem(id) {
    const item = state.items.get(id);
    if (!item || item.status !== 'idle') return;

    item.status = 'pending';
    updateCardStatus(item);
    if (!state.queue.includes(id)) {
      state.queue.push(id);
    }
    updateGlobalUI();
    processQueue();
  }

  function reprocessAll() {
    let reprocessCount = 0;
    state.items.forEach(item => {
      if (item.status !== 'converting') {
        if (item.outputUrl) {
          URL.revokeObjectURL(item.outputUrl);
          item.outputUrl = null;
        }
        item.outputBlob = null;
        item.outputSize = 0;
        item.reduction = 0;
        item.status = 'pending';
        item.errorMessage = null;

        updateCardStatus(item);
        if (!state.queue.includes(item.id)) {
          state.queue.push(item.id);
        }
        reprocessCount++;
      }
    });

    if (reprocessCount > 0) {
      state.settingsDirty = false;
      updateGlobalUI();
      processQueue();
      showToast(`Recomprimindo ${reprocessCount} imagem(ns) com as configurações atuais...`, 'info');
    }
  }

  function reprocessItem(id) {
    const item = state.items.get(id);
    if (!item || item.status === 'converting') return;

    if (item.outputUrl) {
      URL.revokeObjectURL(item.outputUrl);
      item.outputUrl = null;
    }
    item.outputBlob = null;
    item.outputSize = 0;
    item.reduction = 0;
    item.status = 'pending';
    item.errorMessage = null;

    updateCardStatus(item);
    if (!state.queue.includes(id)) {
      state.queue.push(id);
    }
    updateGlobalUI();
    processQueue();
    showToast(`Recomprimindo "${item.name}"...`, 'info');
  }

  // --- 9. Fila de Concorrência e Gerenciador de Conversão ---
  function processQueue() {
    while (state.activeWorkers < MAX_CONCURRENT_CONVERSIONS && state.queue.length > 0) {
      const nextId = state.queue.shift();
      const item = state.items.get(nextId);
      if (item && item.status === 'pending') {
        state.activeWorkers++;
        convertItem(item);
      }
    }
  }

  async function convertItem(item) {
    item.status = 'converting';
    updateCardStatus(item);
    updateGlobalUI();

    try {
      let imageSource = null;
      const ext = item.originalFormat.toLowerCase();

      // Rota 1: Decodificação de Arquivos Apple HEIC/HEIF via Wasm
      if (ext === 'heic' || ext === 'heif') {
        if (typeof window.heic2any !== 'function') {
          throw new Error('Módulo de decodificação HEIC não carregado.');
        }
        
        // Conversão inicial do HEIC para Blob legível pelo navegador
        const convertedBlob = await window.heic2any({
          blob: item.file,
          toType: 'image/jpeg',
          quality: 0.95
        });

        // Heic2any pode retornar um array caso haja múltiplas imagens
        const singleBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        item.originalUrl = URL.createObjectURL(singleBlob);
        imageSource = await loadImageElement(item.originalUrl);
      } 
      // Rota 2: Formatos Nacionais/Web Nativos (PNG, BMP, WEBP, TIFF, JPG)
      else {
        if (!item.originalUrl) {
          item.originalUrl = URL.createObjectURL(item.file);
        }
        imageSource = await loadImageElement(item.originalUrl);
      }

      // Dimensões originais obtidas
      item.origWidth = imageSource.naturalWidth || imageSource.width;
      item.origHeight = imageSource.naturalHeight || imageSource.height;

      // Cálculo de Redimensionamento Proporcional
      let targetW = item.origWidth;
      let targetH = item.origHeight;

      if (state.maxDimension !== 'original') {
        const maxD = state.maxDimension;
        const largestSide = Math.max(item.origWidth, item.origHeight);
        if (largestSide > maxD) {
          const ratio = maxD / largestSide;
          targetW = Math.round(item.origWidth * ratio);
          targetH = Math.round(item.origHeight * ratio);
        }
      }

      item.newWidth = targetW;
      item.newHeight = targetH;

      // Renderização e Composição no Canvas 2D
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d', { alpha: false });

      // Preenchimento de fundo sólido (tratamento de transparência em PNGs)
      ctx.fillStyle = state.backgroundColor;
      ctx.fillRect(0, 0, targetW, targetH);

      // Algoritmo de suavização de alta fidelidade
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Desenhar a imagem escalada
      ctx.drawImage(imageSource, 0, 0, targetW, targetH);

      // Codificação para JPEG Web (elimina metadados EXIF/GPS pesados)
      const outputBlob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Falha ao codificar imagem para JPEG.'));
        }, 'image/jpeg', state.quality);
      });

      // Limpeza de recursos do Canvas para liberar VRAM
      canvas.width = 0;
      canvas.height = 0;

      // Armazenamento do resultado
      item.outputBlob = outputBlob;
      item.outputSize = outputBlob.size;
      item.outputUrl = URL.createObjectURL(outputBlob);
      item.status = 'completed';

      // Cálculo da economia em %
      if (item.originalSize > 0) {
        const saved = item.originalSize - item.outputSize;
        item.reduction = Math.round((saved / item.originalSize) * 100);
      }

    } catch (err) {
      console.error(`Erro ao converter ${item.name}:`, err);
      item.status = 'error';
      item.errorMessage = err.message || 'Erro inesperado na conversão.';
    } finally {
      state.activeWorkers--;
      updateCardStatus(item);
      updateGlobalUI();
      processQueue(); // Aciona o próximo item da fila
    }
  }

  // Auxiliar para carregar HTMLImageElement com Promises
  function loadImageElement(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Falha ao decodificar imagem no navegador.'));
      img.src = url;
    });
  }

  // --- 10. Renderização e Atualização da Interface (Cards & Stats) ---
  function renderCard(item) {
    queueHeader.classList.remove('hidden');

    const card = document.createElement('article');
    card.className = 'image-card';
    card.id = `card_${item.id}`;

    // Determina cor da tag
    let tagClass = 'tag-jpg';
    const fmt = item.originalFormat.toLowerCase();
    if (fmt === 'png') tagClass = 'tag-png';
    else if (fmt === 'heic' || fmt === 'heif') tagClass = 'tag-heic';
    else if (fmt === 'bmp') tagClass = 'tag-bmp';
    else if (fmt === 'webp') tagClass = 'tag-webp';
    else if (fmt === 'tiff' || fmt === 'tif') tagClass = 'tag-tiff';

    const isIdle = item.status === 'idle';

    card.innerHTML = `
      <div class="card-thumb-box" id="thumbBox_${item.id}">
        ${item.originalUrl ? `<img class="card-thumb" src="${item.originalUrl}" alt="Thumbnail">` : `<div class="spinner"></div>`}
      </div>

      <div class="card-info">
        <span class="card-filename" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
        <div class="card-meta-row">
          <span class="card-format-badge ${tagClass}">${item.originalFormat}</span>
          <span class="card-status ${isIdle ? 'idle' : 'pending'}" id="statusText_${item.id}">
            <span class="status-indicator"></span> ${isIdle ? 'Aguardando início' : 'Aguardando conversão...'}
          </span>
        </div>
      </div>

      <div class="card-metrics" id="metrics_${item.id}">
        <div class="metric-pill">
          <span class="metric-old">${formatBytes(item.originalSize)}</span>
          <span class="metric-arrow">➔</span>
          <span class="metric-new">${isIdle ? 'Aguardando' : 'Processando...'}</span>
        </div>
      </div>

      <div class="card-actions" id="actions_${item.id}">
        ${isIdle ? `
          <button type="button" class="action-btn btn-single-start" title="Iniciar esta imagem" onclick="window.PixelCompact.startSingleItem('${item.id}')">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>
        ` : ''}
        <button type="button" class="action-btn btn-remove" title="Remover da lista" onclick="window.PixelCompact.removeItem('${item.id}')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    queueList.appendChild(card);
  }

  function updateCardStatus(item) {
    const statusText = document.getElementById(`statusText_${item.id}`);
    const metricsEl = document.getElementById(`metrics_${item.id}`);
    const actionsEl = document.getElementById(`actions_${item.id}`);
    const thumbBox = document.getElementById(`thumbBox_${item.id}`);

    if (!statusText || !metricsEl || !actionsEl) return;

    // Atualiza Thumbnail caso tenha sido decodificado (ex: HEIC)
    if (thumbBox && item.outputUrl && !thumbBox.querySelector('img')) {
      thumbBox.innerHTML = `<img class="card-thumb" src="${item.outputUrl}" alt="Thumbnail">`;
    }

    if (item.status === 'idle') {
      statusText.className = 'card-status idle';
      statusText.innerHTML = `<span class="status-indicator"></span> Aguardando início`;
      metricsEl.innerHTML = `
        <div class="metric-pill">
          <span class="metric-old">${formatBytes(item.originalSize)}</span>
          <span class="metric-arrow">➔</span>
          <span class="metric-new">Aguardando</span>
        </div>
      `;
      actionsEl.innerHTML = `
        <button type="button" class="action-btn btn-single-start" title="Iniciar esta imagem" onclick="window.PixelCompact.startSingleItem('${item.id}')">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </button>
        <button type="button" class="action-btn btn-remove" title="Remover da lista" onclick="window.PixelCompact.removeItem('${item.id}')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      `;
    } else if (item.status === 'pending') {
      statusText.className = 'card-status pending';
      statusText.innerHTML = `<span class="status-indicator"></span> Aguardando conversão...`;
      metricsEl.innerHTML = `
        <div class="metric-pill">
          <span class="metric-old">${formatBytes(item.originalSize)}</span>
          <span class="metric-arrow">➔</span>
          <span class="metric-new">Processando...</span>
        </div>
      `;
      actionsEl.innerHTML = `
        <button type="button" class="action-btn btn-remove" title="Remover da lista" onclick="window.PixelCompact.removeItem('${item.id}')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      `;
    } else if (item.status === 'converting') {
      statusText.className = 'card-status converting';
      statusText.innerHTML = `<div class="spinner"></div> Convertendo...`;
      actionsEl.innerHTML = `
        <button type="button" class="action-btn btn-remove" title="Remover da lista" onclick="window.PixelCompact.removeItem('${item.id}')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      `;
    } else if (item.status === 'completed') {
      statusText.className = 'card-status completed';
      statusText.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg> Concluído
      `;

      // Atualiza thumbnail para a versão final otimizada
      if (thumbBox && item.outputUrl) {
        thumbBox.innerHTML = `<img class="card-thumb" src="${item.outputUrl}" alt="Thumbnail JPG">`;
      }

      // Métricas de antes vs depois com percentual de economia
      const badgeClass = item.reduction > 0 ? 'metric-savings' : 'metric-old';
      const badgeText = item.reduction > 0 ? `-${item.reduction}%` : `+${Math.abs(item.reduction)}%`;

      metricsEl.innerHTML = `
        <div class="metric-pill">
          <span class="metric-old">${formatBytes(item.originalSize)}</span>
          <span class="metric-arrow">➔</span>
          <span class="metric-new">${formatBytes(item.outputSize)}</span>
        </div>
        <span class="${badgeClass}">${badgeText}</span>
      `;

      // Ações: Comparar + Recomprimir Individual + Download + Remover
      actionsEl.innerHTML = `
        <button type="button" class="action-btn" title="Comparar antes e depois" onclick="window.PixelCompact.openCompare('${item.id}')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
        </button>
        <button type="button" class="action-btn btn-single-reprocess" title="Recomprimir apenas esta foto com as configurações atuais" onclick="window.PixelCompact.reprocessItem('${item.id}')">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
          </svg>
        </button>
        <a class="btn-download-single" href="${item.outputUrl}" download="${escapeHtml(item.cleanName)}.jpg" title="Baixar JPG">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          JPG
        </a>
        <button type="button" class="action-btn btn-remove" title="Remover da lista" onclick="window.PixelCompact.removeItem('${item.id}')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      `;
    } else if (item.status === 'error') {
      statusText.className = 'card-status error';
      statusText.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg> Falha
      `;
      metricsEl.innerHTML = `<span style="color: var(--danger); font-size: 0.78rem;">${escapeHtml(item.errorMessage || 'Erro')}</span>`;
      actionsEl.innerHTML = `
        <button type="button" class="action-btn btn-single-reprocess" title="Tentar novamente" onclick="window.PixelCompact.reprocessItem('${item.id}')">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
          </svg>
        </button>
        <button type="button" class="action-btn btn-remove" title="Remover da lista" onclick="window.PixelCompact.removeItem('${item.id}')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      `;
    }
  }

  // Atualização das métricas globais e botões de lote
  function updateGlobalUI() {
    const totalItems = state.items.size;

    if (totalItems === 0) {
      statsBar.classList.add('hidden');
      queueHeader.classList.add('hidden');
      if (reprocessHeaderBtn) reprocessHeaderBtn.classList.add('hidden');
      if (reprocessBatchBtn) reprocessBatchBtn.classList.add('hidden');
      if (startBatchBtn) startBatchBtn.classList.add('hidden');
      state.settingsDirty = false;
      return;
    }

    statsBar.classList.remove('hidden');
    statTotalCount.textContent = totalItems;

    let origBytes = 0;
    let newBytes = 0;
    let completedCount = 0;
    let idleCount = 0;
    let convertingCount = 0;
    let pendingCount = 0;

    state.items.forEach(item => {
      origBytes += item.originalSize;
      if (item.status === 'completed' && item.outputSize > 0) {
        newBytes += item.outputSize;
        completedCount++;
      } else {
        newBytes += item.originalSize; // Provisório enquanto não finalizado
      }

      if (item.status === 'idle') idleCount++;
      else if (item.status === 'converting') convertingCount++;
      else if (item.status === 'pending') pendingCount++;
    });

    statOriginalTotal.textContent = formatBytes(origBytes);
    statNewTotal.textContent = formatBytes(newBytes);

    if (origBytes > 0 && completedCount > 0) {
      const savedBytes = origBytes - newBytes;
      const reductionPerc = Math.max(0, Math.round((savedBytes / origBytes) * 100));
      statReductionBadge.textContent = `-${reductionPerc}%`;
    } else {
      statReductionBadge.textContent = '-0%';
    }

    // Botão de Início Manual em Lote
    if (startBatchBtn) {
      if (idleCount > 0) {
        startBatchBtn.classList.remove('hidden');
        startBatchBtn.disabled = convertingCount > 0;
        if (startBatchBtnText) {
          startBatchBtnText.textContent = idleCount > 1 ? `Iniciar Conversão (${idleCount})` : 'Iniciar Conversão';
        }
      } else {
        startBatchBtn.classList.add('hidden');
      }
    }

    // Botões de Recompressão (Header e Batch)
    const canReprocess = completedCount > 0 && convertingCount === 0;
    if (reprocessHeaderBtn) {
      if (completedCount > 0) {
        reprocessHeaderBtn.classList.remove('hidden');
        reprocessHeaderBtn.disabled = convertingCount > 0;
        if (reprocessHeaderBtnText) {
          reprocessHeaderBtnText.textContent = completedCount > 1 ? `Atualizar (${completedCount})` : 'Atualizar Compressão';
        }
        reprocessHeaderBtn.classList.toggle('pulse', state.settingsDirty && canReprocess);
      } else {
        reprocessHeaderBtn.classList.add('hidden');
      }
    }

    if (reprocessBatchBtn) {
      if (completedCount > 0) {
        reprocessBatchBtn.classList.remove('hidden');
        reprocessBatchBtn.disabled = convertingCount > 0;
        reprocessBatchBtn.classList.toggle('pulse', state.settingsDirty && canReprocess);
      } else {
        reprocessBatchBtn.classList.add('hidden');
      }
    }

    // Botões de Ação liberados quando houver ao menos 1 item concluído
    downloadZipBtn.disabled = completedCount === 0 || state.isZipping;
    if (saveFolderBtn) {
      saveFolderBtn.disabled = completedCount === 0 || state.isSavingFolder;
    }

    // Texto de status da fila
    if (convertingCount > 0 || pendingCount > 0) {
      queueStatusText.textContent = `Processando (${completedCount}/${totalItems})...`;
    } else if (idleCount > 0 && completedCount === 0) {
      queueStatusText.textContent = `${idleCount} imagem(ns) aguardando início da conversão.`;
    } else if (idleCount > 0 && completedCount > 0) {
      queueStatusText.textContent = `${completedCount} concluídas, ${idleCount} aguardando início.`;
    } else {
      queueStatusText.textContent = `Concluído: ${completedCount} de ${totalItems} imagens otimizadas.`;
    }
  }

  // --- 10. Ações em Lote e Remoção de Itens ---
  function removeItem(id) {
    const item = state.items.get(id);
    if (!item) return;

    // Revoga URLs temporárias para evitar vazamentos de memória
    if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
    if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);

    // Remove do estado
    state.items.delete(id);
    const qIndex = state.queue.indexOf(id);
    if (qIndex !== -1) state.queue.splice(qIndex, 1);

    // Remove elemento do DOM
    const cardEl = document.getElementById(`card_${id}`);
    if (cardEl) cardEl.remove();

    updateGlobalUI();
  }

  function clearAll() {
    state.items.forEach(item => {
      if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
      if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
    });

    state.items.clear();
    state.queue = [];
    state.settingsDirty = false;
    queueList.innerHTML = '';
    updateGlobalUI();
    showToast('Lista de conversão esvaziada.', 'success');
  }

  // Empacotamento em Lote com JSZip
  async function downloadAllAsZip() {
    if (typeof window.JSZip !== 'function') {
      showToast('Biblioteca JSZip não encontrada.', 'danger');
      return;
    }

    const completedItems = Array.from(state.items.values()).filter(item => item.status === 'completed' && item.outputBlob);

    if (completedItems.length === 0) {
      showToast('Nenhuma imagem convertida pronta para download.', 'warning');
      return;
    }

    state.isZipping = true;
    downloadZipBtn.disabled = true;
    downloadZipBtn.innerHTML = `<div class="spinner"></div> Empacotando ZIP...`;

    try {
      const zip = new window.JSZip();
      const usedNames = new Set();

      completedItems.forEach((item, index) => {
        // Sanitização de nomes de arquivos para evitar path traversal ou colisões
        let clean = item.cleanName.replace(/[/\\?%*:|"<>]/g, '_').trim() || `imagem_${index + 1}`;
        let finalFilename = `${clean}.jpg`;
        
        let counter = 1;
        while (usedNames.has(finalFilename.toLowerCase())) {
          finalFilename = `${clean}_(${counter}).jpg`;
          counter++;
        }
        usedNames.add(finalFilename.toLowerCase());

        zip.file(finalFilename, item.outputBlob);
      });

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      // Dispara o download nativo do arquivo ZIP
      const zipUrl = URL.createObjectURL(zipBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = zipUrl;
      downloadLink.download = 'imagens-otimizadas-jpg.zip';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // Limpeza da URL após o disparo do download
      setTimeout(() => URL.revokeObjectURL(zipUrl), 2000);
      showToast(`ZIP gerado com sucesso contendo ${completedItems.length} imagens!`, 'success');

    } catch (err) {
      console.error('Erro ao gerar arquivo ZIP:', err);
      showToast('Falha ao empacotar o arquivo ZIP.', 'danger');
    } finally {
      state.isZipping = false;
      downloadZipBtn.disabled = false;
      downloadZipBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg> Baixar Todos (.ZIP)
      `;
    }
  }

  // Conversão de Blob para Base64 para envio via API Desktop
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result;
        const b64 = res.split(',')[1];
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Salvamento direto em pasta do computador via API Desktop
  async function saveAllToFolder() {
    if (!window.pywebview || !window.pywebview.api) {
      showToast('API de sistema desktop não detectada.', 'danger');
      return;
    }

    const completedItems = Array.from(state.items.values()).filter(item => item.status === 'completed' && item.outputBlob);
    if (completedItems.length === 0) {
      showToast('Nenhuma imagem convertida pronta para salvar.', 'warning');
      return;
    }

    // Solicita ao usuário selecionar uma pasta no Windows Explorer
    const targetFolder = await window.pywebview.api.select_folder();
    if (!targetFolder) return; // cancelado pelo usuário

    state.isSavingFolder = true;
    saveFolderBtn.disabled = true;
    saveFolderBtn.innerHTML = `<div class="spinner"></div> Gravando no PC...`;

    try {
      const filesPayload = [];
      const usedNames = new Set();

      for (let i = 0; i < completedItems.length; i++) {
        const item = completedItems[i];
        let clean = item.cleanName.replace(/[/\\?%*:|"<>]/g, '_').trim() || `imagem_${i + 1}`;
        let finalFilename = `${clean}.jpg`;
        let counter = 1;
        while (usedNames.has(finalFilename.toLowerCase())) {
          finalFilename = `${clean}_(${counter}).jpg`;
          counter++;
        }
        usedNames.add(finalFilename.toLowerCase());

        const b64 = await blobToBase64(item.outputBlob);
        filesPayload.push({
          filename: finalFilename,
          base64: b64
        });
      }

      const res = await window.pywebview.api.save_all_files(filesPayload, targetFolder);
      if (res && res.success) {
        showToast(`${res.count} imagens gravadas diretamente em: ${res.path}`, 'success');
      } else {
        showToast(res.error || 'Falha ao gravar arquivos.', 'danger');
      }
    } catch (err) {
      console.error('Erro ao salvar no disco:', err);
      showToast('Erro durante a gravação dos arquivos no computador.', 'danger');
    } finally {
      state.isSavingFolder = false;
      saveFolderBtn.disabled = false;
      saveFolderBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg> Salvar na Pasta do PC
      `;
    }
  }

  // --- 11. Modal de Comparação Visual Antes vs Depois ---
  function openCompare(id) {
    const item = state.items.get(id);
    if (!item || !item.outputUrl) return;

    compareOriginalImg.src = item.originalUrl || item.outputUrl;
    compareNewImg.src = item.outputUrl;

    compareOriginalSize.textContent = `${item.origWidth}x${item.origHeight}px • ${formatBytes(item.originalSize)}`;
    compareNewSize.textContent = `${item.newWidth}x${item.newHeight}px • ${formatBytes(item.outputSize)} (-${item.reduction}%)`;

    compareModal.classList.remove('hidden');
  }

  function closeCompareModal() {
    compareModal.classList.add('hidden');
    compareOriginalImg.src = '';
    compareNewImg.src = '';
  }

  // Expõe métodos específicos para handlers inline de forma segura
  window.PixelCompact = {
    removeItem,
    openCompare,
    reprocessItem,
    reprocessAll,
    startSingleItem,
    startManualQueue
  };

  // Inicialização quando o DOM estiver pronto
  document.addEventListener('DOMContentLoaded', () => {
    initControls();
    initDropzone();

    // Detecção da API Desktop PyWebView
    const enableDesktopMode = () => {
      state.isDesktop = true;
      if (saveFolderBtn) {
        saveFolderBtn.classList.remove('hidden');
      }
    };

    if (window.pywebview) {
      enableDesktopMode();
    } else {
      window.addEventListener('pywebviewready', enableDesktopMode);
    }
  });

})();
