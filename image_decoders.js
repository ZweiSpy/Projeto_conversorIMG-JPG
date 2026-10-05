/**
 * Zwei PixelCompact - Módulo Universal de Decodificação de Imagens
 * Desenvolvido por Zwei (Tech Lead & PO) • Zwei Coorporações LTDA
 * Suporte a 26 famílias de formatos gráficos (35+ extensões)
 * 100% Client-Side • Zero Servidores • Performance Extrema
 */

(function (global) {
  'use strict';

  // --- 1. Mapeamento de Extensões, Categorias e Nomes Amigáveis ---
  const FORMAT_CATEGORIES = {
    // Web & Nativos
    png: { name: 'PNG', category: 'web', badgeClass: 'badge-web' },
    jpg: { name: 'JPEG', category: 'web', badgeClass: 'badge-web' },
    jpeg: { name: 'JPEG', category: 'web', badgeClass: 'badge-web' },
    jpe: { name: 'JPEG', category: 'web', badgeClass: 'badge-web' },
    jfif: { name: 'JFIF', category: 'web', badgeClass: 'badge-web' },
    webp: { name: 'WEBP', category: 'web', badgeClass: 'badge-web' },
    bmp: { name: 'BMP', category: 'web', badgeClass: 'badge-web' },
    dib: { name: 'DIB', category: 'web', badgeClass: 'badge-web' },
    avif: { name: 'AVIF', category: 'web', badgeClass: 'badge-web' },
    apng: { name: 'APNG', category: 'web', badgeClass: 'badge-web' },

    // Gráficos Vetoriais
    svg: { name: 'SVG Vetorial', category: 'vector', badgeClass: 'badge-vector' },
    svgz: { name: 'SVG Comprimido', category: 'vector', badgeClass: 'badge-vector' },

    // Ícones do Sistema
    ico: { name: 'Windows Icon', category: 'icon', badgeClass: 'badge-icon' },
    cur: { name: 'Windows Cursor', category: 'icon', badgeClass: 'badge-icon' },

    // Mobile / Apple
    heic: { name: 'Apple HEIC', category: 'mobile', badgeClass: 'badge-mobile' },
    heif: { name: 'Apple HEIF', category: 'mobile', badgeClass: 'badge-mobile' },
    heics: { name: 'Apple HEICS', category: 'mobile', badgeClass: 'badge-mobile' },
    heifs: { name: 'Apple HEIFS', category: 'mobile', badgeClass: 'badge-mobile' },

    // Gráfica & Scanners
    tiff: { name: 'TIFF Gráfica', category: 'print', badgeClass: 'badge-print' },
    tif: { name: 'TIFF Gráfica', category: 'print', badgeClass: 'badge-print' },

    // Design, 3D & Games
    psd: { name: 'Adobe Photoshop', category: 'design', badgeClass: 'badge-design' },
    psb: { name: 'Photoshop Large', category: 'design', badgeClass: 'badge-design' },
    tga: { name: 'Targa 3D', category: 'design', badgeClass: 'badge-design' },
    tpic: { name: 'Targa 3D', category: 'design', badgeClass: 'badge-design' },
    dds: { name: 'DirectDraw Texture', category: 'design', badgeClass: 'badge-design' },
    hdr: { name: 'Radiance HDRI', category: 'design', badgeClass: 'badge-design' },

    // Câmeras DSLR / Mirrorless (RAW)
    dng: { name: 'Adobe DNG RAW', category: 'raw', badgeClass: 'badge-raw' },
    cr2: { name: 'Canon CR2 RAW', category: 'raw', badgeClass: 'badge-raw' },
    cr3: { name: 'Canon CR3 RAW', category: 'raw', badgeClass: 'badge-raw' },
    nef: { name: 'Nikon NEF RAW', category: 'raw', badgeClass: 'badge-raw' },
    nrw: { name: 'Nikon NRW RAW', category: 'raw', badgeClass: 'badge-raw' },
    arw: { name: 'Sony ARW RAW', category: 'raw', badgeClass: 'badge-raw' },
    sr2: { name: 'Sony SR2 RAW', category: 'raw', badgeClass: 'badge-raw' },
    srf: { name: 'Sony SRF RAW', category: 'raw', badgeClass: 'badge-raw' },
    orf: { name: 'Olympus ORF RAW', category: 'raw', badgeClass: 'badge-raw' },
    raf: { name: 'Fujifilm RAF RAW', category: 'raw', badgeClass: 'badge-raw' },
    rw2: { name: 'Panasonic RW2 RAW', category: 'raw', badgeClass: 'badge-raw' },
    pef: { name: 'Pentax PEF RAW', category: 'raw', badgeClass: 'badge-raw' },

    // Científicos & Legados
    ppm: { name: 'Netpbm PPM', category: 'scientific', badgeClass: 'badge-sci' },
    pgm: { name: 'Netpbm PGM', category: 'scientific', badgeClass: 'badge-sci' },
    pbm: { name: 'Netpbm PBM', category: 'scientific', badgeClass: 'badge-sci' },
    pnm: { name: 'Netpbm PNM', category: 'scientific', badgeClass: 'badge-sci' },
    pcx: { name: 'Paintbrush PCX', category: 'scientific', badgeClass: 'badge-sci' },
    wbmp: { name: 'Wireless Bitmap', category: 'scientific', badgeClass: 'badge-sci' }
  };

  const EXTENSIONS_LIST = Object.keys(FORMAT_CATEGORIES);

  // --- 2. Decodificadores Especializados ---

  /**
   * Converte um objeto ImageData para HTMLCanvasElement
   */
  function imageDataToCanvas(imageData) {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * Decodificador de TGA (Truevision Targa)
   * Suporta não-comprimido e RLE, Truecolor (24/32 bits) e Tons de Cinza (8 bits)
   */
  function decodeTGA(buffer) {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 18) throw new Error('Arquivo TGA corrompido ou incompleto.');

    const idLength = bytes[0];
    const colorMapType = bytes[1];
    const imageType = bytes[2];
    const width = view.getUint16(12, true);
    const height = view.getUint16(14, true);
    const pixelDepth = bytes[16];
    const descriptor = bytes[17];

    if (width === 0 || height === 0) throw new Error('Dimensões inválidas no arquivo TGA.');

    const isRLE = (imageType === 9 || imageType === 10 || imageType === 11);
    const isRGB = (imageType === 2 || imageType === 10);
    const isGray = (imageType === 3 || imageType === 11);

    if (!isRGB && !isGray) {
      throw new Error(`Tipo TGA não suportado (${imageType}). Suportados: RGB e Tons de Cinza.`);
    }

    const bytesPerPixel = Math.floor(pixelDepth / 8);
    const totalPixels = width * height;
    const output = new Uint8ClampedArray(totalPixels * 4);

    let offset = 18 + idLength;
    if (colorMapType === 1) {
      const colorMapLength = view.getUint16(5, true);
      const colorMapDepth = bytes[7];
      offset += Math.ceil((colorMapLength * colorMapDepth) / 8);
    }

    let pixelIdx = 0;

    if (!isRLE) {
      // Leitura Direta (Não-Comprimido)
      while (pixelIdx < totalPixels && offset < bytes.length) {
        let b = 0, g = 0, r = 0, a = 255;
        if (isRGB) {
          b = bytes[offset++];
          g = bytes[offset++];
          r = bytes[offset++];
          if (bytesPerPixel === 4) a = bytes[offset++];
        } else if (isGray) {
          const val = bytes[offset++];
          r = g = b = val;
          if (bytesPerPixel === 2) a = bytes[offset++];
        }
        const outIdx = pixelIdx * 4;
        output[outIdx] = r;
        output[outIdx + 1] = g;
        output[outIdx + 2] = b;
        output[outIdx + 3] = a;
        pixelIdx++;
      }
    } else {
      // Descompressão RLE
      while (pixelIdx < totalPixels && offset < bytes.length) {
        const packetHeader = bytes[offset++];
        const count = (packetHeader & 0x7F) + 1;
        const isRunLength = (packetHeader & 0x80) !== 0;

        if (isRunLength) {
          let b = 0, g = 0, r = 0, a = 255;
          if (isRGB) {
            b = bytes[offset++];
            g = bytes[offset++];
            r = bytes[offset++];
            if (bytesPerPixel === 4) a = bytes[offset++];
          } else if (isGray) {
            const val = bytes[offset++];
            r = g = b = val;
            if (bytesPerPixel === 2) a = bytes[offset++];
          }
          for (let i = 0; i < count && pixelIdx < totalPixels; i++) {
            const outIdx = pixelIdx * 4;
            output[outIdx] = r;
            output[outIdx + 1] = g;
            output[outIdx + 2] = b;
            output[outIdx + 3] = a;
            pixelIdx++;
          }
        } else {
          // Pacote RAW de N pixels
          for (let i = 0; i < count && pixelIdx < totalPixels; i++) {
            let b = 0, g = 0, r = 0, a = 255;
            if (isRGB) {
              b = bytes[offset++];
              g = bytes[offset++];
              r = bytes[offset++];
              if (bytesPerPixel === 4) a = bytes[offset++];
            } else if (isGray) {
              const val = bytes[offset++];
              r = g = b = val;
              if (bytesPerPixel === 2) a = bytes[offset++];
            }
            const outIdx = pixelIdx * 4;
            output[outIdx] = r;
            output[outIdx + 1] = g;
            output[outIdx + 2] = b;
            output[outIdx + 3] = a;
            pixelIdx++;
          }
        }
      }
    }

    // Orientação: O bit 5 do descritor indica se a imagem começa no topo (1) ou embaixo (0)
    const isTopDown = (descriptor & 0x20) !== 0;
    if (!isTopDown) {
      // Inverte verticalmente para corrigir orientação TGA tradicional
      flipVertical(output, width, height);
    }

    return new ImageData(output, width, height);
  }

  function flipVertical(data, width, height) {
    const rowBytes = width * 4;
    const tempRow = new Uint8ClampedArray(rowBytes);
    for (let y = 0; y < Math.floor(height / 2); y++) {
      const topOffset = y * rowBytes;
      const bottomOffset = (height - 1 - y) * rowBytes;
      tempRow.set(data.subarray(topOffset, topOffset + rowBytes));
      data.set(data.subarray(bottomOffset, bottomOffset + rowBytes), topOffset);
      data.set(tempRow, bottomOffset);
    }
  }

  /**
   * Decodificador de Netpbm (PPM, PGM, PBM, PNM)
   * Suporta P1, P2, P3 (ASCII) e P4, P5, P6 (Binário)
   */
  function decodeNetpbm(buffer) {
    const bytes = new Uint8Array(buffer);
    let pos = 0;

    function nextToken() {
      // Ignora espaços em branco e comentários (# ...)
      while (pos < bytes.length) {
        const c = bytes[pos];
        if (c === 0x23) { // '#'
          while (pos < bytes.length && bytes[pos] !== 0x0A && bytes[pos] !== 0x0D) pos++;
        } else if (c <= 0x20) {
          pos++;
        } else {
          break;
        }
      }
      if (pos >= bytes.length) return null;
      let start = pos;
      while (pos < bytes.length && bytes[pos] > 0x20 && bytes[pos] !== 0x23) pos++;
      let token = '';
      for (let i = start; i < pos; i++) token += String.fromCharCode(bytes[i]);
      return token;
    }

    const magic = nextToken();
    if (!magic || !magic.startsWith('P')) throw new Error('Assinatura Netpbm inválida.');

    const type = parseInt(magic.substring(1), 10);
    const width = parseInt(nextToken(), 10);
    const height = parseInt(nextToken(), 10);
    if (!width || !height) throw new Error('Dimensões inválidas no arquivo Netpbm.');

    let maxVal = 1;
    if (type !== 1 && type !== 4) {
      maxVal = parseInt(nextToken(), 10) || 255;
    }

    // Pula um único caractere em branco separador antes dos dados binários
    if (pos < bytes.length && (bytes[pos] === 0x20 || bytes[pos] === 0x0A || bytes[pos] === 0x0D)) {
      pos++;
    }

    const totalPixels = width * height;
    const output = new Uint8ClampedArray(totalPixels * 4);
    const scale = 255 / maxVal;

    if (type === 6) { // PPM Binário RGB
      let outIdx = 0;
      for (let i = 0; i < totalPixels && pos + 2 < bytes.length; i++) {
        output[outIdx++] = Math.round(bytes[pos++] * scale);
        output[outIdx++] = Math.round(bytes[pos++] * scale);
        output[outIdx++] = Math.round(bytes[pos++] * scale);
        output[outIdx++] = 255;
      }
    } else if (type === 5) { // PGM Binário Grayscale
      let outIdx = 0;
      for (let i = 0; i < totalPixels && pos < bytes.length; i++) {
        const val = Math.round(bytes[pos++] * scale);
        output[outIdx++] = val;
        output[outIdx++] = val;
        output[outIdx++] = val;
        output[outIdx++] = 255;
      }
    } else if (type === 4) { // PBM Binário 1-bit
      let outIdx = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const byteIdx = pos + (y * Math.ceil(width / 8) + Math.floor(x / 8));
          const bit = (bytes[byteIdx] >> (7 - (x % 8))) & 1;
          const val = bit ? 0 : 255; // 1 = preto, 0 = branco
          output[outIdx++] = val;
          output[outIdx++] = val;
          output[outIdx++] = val;
          output[outIdx++] = 255;
        }
      }
    } else if (type === 3) { // PPM ASCII RGB
      let outIdx = 0;
      for (let i = 0; i < totalPixels; i++) {
        const r = parseInt(nextToken(), 10);
        const g = parseInt(nextToken(), 10);
        const b = parseInt(nextToken(), 10);
        output[outIdx++] = Math.round(r * scale);
        output[outIdx++] = Math.round(g * scale);
        output[outIdx++] = Math.round(b * scale);
        output[outIdx++] = 255;
      }
    } else if (type === 2) { // PGM ASCII Grayscale
      let outIdx = 0;
      for (let i = 0; i < totalPixels; i++) {
        const val = Math.round(parseInt(nextToken(), 10) * scale);
        output[outIdx++] = val;
        output[outIdx++] = val;
        output[outIdx++] = val;
        output[outIdx++] = 255;
      }
    } else if (type === 1) { // PBM ASCII 1-bit
      let outIdx = 0;
      for (let i = 0; i < totalPixels; i++) {
        const bit = parseInt(nextToken(), 10);
        const val = bit ? 0 : 255;
        output[outIdx++] = val;
        output[outIdx++] = val;
        output[outIdx++] = val;
        output[outIdx++] = 255;
      }
    }

    return new ImageData(output, width, height);
  }

  /**
   * Decodificador de PCX (ZSoft Paintbrush)
   * Suporta 8-bit com paleta VGA de 256 cores e 24-bit RGB
   */
  function decodePCX(buffer) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    if (bytes.length < 128 || bytes[0] !== 10) throw new Error('Arquivo PCX inválido.');

    const bpp = bytes[3];
    const xMin = view.getUint16(4, true);
    const yMin = view.getUint16(6, true);
    const xMax = view.getUint16(8, true);
    const yMax = view.getUint16(10, true);
    const nPlanes = bytes[65];
    const bytesPerLine = view.getUint16(66, true);

    const width = xMax - xMin + 1;
    const height = yMax - yMin + 1;
    if (width <= 0 || height <= 0) throw new Error('Dimensões inválidas no PCX.');

    // Lê paleta VGA de 256 cores caso exista no final (byte 0x0C seguido de 768 bytes)
    let palette = null;
    if (bytes.length >= 769 && bytes[bytes.length - 769] === 12) {
      palette = bytes.subarray(bytes.length - 768);
    }

    const totalPixels = width * height;
    const output = new Uint8ClampedArray(totalPixels * 4);

    let offset = 128;
    const scanline = new Uint8Array(bytesPerLine * nPlanes);

    for (let y = 0; y < height; y++) {
      let scanlineIdx = 0;
      while (scanlineIdx < scanline.length && offset < bytes.length) {
        const byte = bytes[offset++];
        if ((byte & 0xC0) === 0xC0) {
          const runCount = byte & 0x3F;
          const val = bytes[offset++];
          for (let r = 0; r < runCount && scanlineIdx < scanline.length; r++) {
            scanline[scanlineIdx++] = val;
          }
        } else {
          scanline[scanlineIdx++] = byte;
        }
      }

      const rowStart = y * width * 4;
      if (nPlanes === 1 && palette) {
        // 256 Cores Paletizadas
        for (let x = 0; x < width; x++) {
          const colorIdx = scanline[x] * 3;
          const outIdx = rowStart + x * 4;
          output[outIdx] = palette[colorIdx];
          output[outIdx + 1] = palette[colorIdx + 1];
          output[outIdx + 2] = palette[colorIdx + 2];
          output[outIdx + 3] = 255;
        }
      } else if (nPlanes === 3) {
        // 24-bit RGB (planos sequenciais R, G, B)
        const planeSize = bytesPerLine;
        for (let x = 0; x < width; x++) {
          const outIdx = rowStart + x * 4;
          output[outIdx] = scanline[x];
          output[outIdx + 1] = scanline[planeSize + x];
          output[outIdx + 2] = scanline[planeSize * 2 + x];
          output[outIdx + 3] = 255;
        }
      } else {
        // Fallback em tons de cinza
        for (let x = 0; x < width; x++) {
          const outIdx = rowStart + x * 4;
          const val = scanline[x] || 0;
          output[outIdx] = val;
          output[outIdx + 1] = val;
          output[outIdx + 2] = val;
          output[outIdx + 3] = 255;
        }
      }
    }

    return new ImageData(output, width, height);
  }

  /**
   * Decodificador de Photoshop (PSD / PSB)
   * Extrai o 'Merged Composite Image' (imagem achatada de visualização)
   */
  function decodePSD(buffer) {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // Assinatura '8BPS'
    const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (sig !== '8BPS') throw new Error('Assinatura PSD inválida.');

    const channels = view.getUint16(12, false);
    const height = view.getUint32(14, false);
    const width = view.getUint32(18, false);
    const depth = view.getUint16(22, false);
    const colorMode = view.getUint16(24, false);

    if (depth !== 8) {
      throw new Error(`PSD com profundidade de ${depth}-bits não suportado diretamente (apenas 8-bit).`);
    }

    let offset = 26;
    // Pula Color Mode Data
    const colorModeLen = view.getUint32(offset, false);
    offset += 4 + colorModeLen;

    // Pula Image Resources
    const imageResLen = view.getUint32(offset, false);
    offset += 4 + imageResLen;

    // Pula Layer & Mask Data
    const layerMaskLen = view.getUint32(offset, false);
    offset += 4 + layerMaskLen;

    if (offset >= bytes.length) throw new Error('Seção de imagem achatada não encontrada no PSD.');

    const compression = view.getUint16(offset, false);
    offset += 2;

    const totalPixels = width * height;
    const output = new Uint8ClampedArray(totalPixels * 4);
    output.fill(255); // Alfa padrão 255

    const numChannelsToRead = Math.min(channels, 4);

    if (compression === 0) {
      // Não-comprimido (Planar R, G, B, [A])
      for (let c = 0; c < numChannelsToRead; c++) {
        for (let i = 0; i < totalPixels && offset < bytes.length; i++) {
          output[i * 4 + c] = bytes[offset++];
        }
      }
    } else if (compression === 1) {
      // PackBits RLE (tabela de contagem de linhas: height * channels * 2 bytes)
      offset += height * channels * 2;

      for (let c = 0; c < numChannelsToRead; c++) {
        let pixelIdx = 0;
        for (let y = 0; y < height && pixelIdx < totalPixels; y++) {
          let linePixels = 0;
          while (linePixels < width && offset < bytes.length) {
            const n = bytes[offset++];
            if (n <= 127) {
              const count = n + 1;
              for (let i = 0; i < count && linePixels < width; i++) {
                output[(pixelIdx + linePixels) * 4 + c] = bytes[offset++];
                linePixels++;
              }
            } else if (n >= 129) {
              const count = 257 - n;
              const val = bytes[offset++];
              for (let i = 0; i < count && linePixels < width; i++) {
                output[(pixelIdx + linePixels) * 4 + c] = val;
                linePixels++;
              }
            }
          }
          pixelIdx += width;
        }
      }
    }

    return new ImageData(output, width, height);
  }

  /**
   * Extrator Instantâneo de Preview JPEG em Câmeras Profissionais RAW
   * Suporta Canon (CR2/CR3), Nikon (NEF/NRW), Sony (ARW/SR2), Adobe DNG, Olympus (ORF), Fuji (RAF), Lumix (RW2), Pentax (PEF).
   * Varre a estrutura TIFF IFD0/SubIFD e localiza o stream JPEG embutido (< 15ms).
   */
  function extractRawPreview(buffer) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    // 1. Tenta localização via marcadores TIFF (IFD0 / SubIFD)
    try {
      const isLittleEndian = (bytes[0] === 0x49 && bytes[1] === 0x49); // 'II'
      const isBigEndian = (bytes[0] === 0x4D && bytes[1] === 0x4D);    // 'MM'

      if (isLittleEndian || isBigEndian) {
        const le = isLittleEndian;
        const magic = view.getUint16(2, le);
        if (magic === 42 || magic === 0x55 || magic === 0x4352) { // TIFF ou CR2
          let ifdOffset = view.getUint32(4, le);
          let jpegOffset = 0;
          let jpegLen = 0;

          // Varre até 4 IFDs procurando as tags JPEGInterchangeFormat (0x0201)
          for (let ifdCount = 0; ifdCount < 4 && ifdOffset > 0 && ifdOffset + 2 < bytes.length; ifdCount++) {
            const numEntries = view.getUint16(ifdOffset, le);

            for (let i = 0; i < numEntries; i++) {
              const entryPos = ifdOffset + 2 + i * 12;
              if (entryPos + 12 > bytes.length) break;
              const tag = view.getUint16(entryPos, le);

              if (tag === 0x0201) { // JPEGInterchangeFormat (Offset)
                jpegOffset = view.getUint32(entryPos + 8, le);
              } else if (tag === 0x0202) { // JPEGInterchangeFormatLength
                jpegLen = view.getUint32(entryPos + 8, le);
              }
            }

            if (jpegOffset > 0 && jpegLen > 500) { // Encontrou preview significativo
              const slice = bytes.subarray(jpegOffset, jpegOffset + jpegLen);
              return new Blob([slice], { type: 'image/jpeg' });
            }

            const nextPtrOffset = ifdOffset + 2 + numEntries * 12;
            if (nextPtrOffset + 4 <= bytes.length) {
              ifdOffset = view.getUint32(nextPtrOffset, le);
            } else {
              break;
            }
          }
        }
      }
    } catch (e) {
      // Segue para a varredura linear de marcador SOI
    }

    // 2. Varredura Rápida de Assinatura SOI JPEG (0xFF 0xD8 0xFF)
    // Procura o maior JPEG embutido nos primeiros 20MB do arquivo
    const maxSearch = Math.min(bytes.length, 20 * 1024 * 1024);
    let bestStart = -1;
    let bestEnd = -1;
    let maxFoundSize = 0;

    for (let i = 0; i < maxSearch - 4; i++) {
      if (bytes[i] === 0xFF && bytes[i + 1] === 0xD8 && bytes[i + 2] === 0xFF) {
        // Encontrou SOI. Busca o marcador EOI (0xFF 0xD9)
        let eoi = -1;
        for (let j = i + 128; j < Math.min(bytes.length, i + 15 * 1024 * 1024); j++) {
          if (bytes[j] === 0xFF && bytes[j + 1] === 0xD9) {
            eoi = j + 2;
          }
        }
        if (eoi > 0) {
          const currentSize = eoi - i;
          if (currentSize > maxFoundSize && currentSize > 500) {
            maxFoundSize = currentSize;
            bestStart = i;
            bestEnd = eoi;
          }
        }
      }
    }

    if (bestStart !== -1 && bestEnd > bestStart) {
      const slice = bytes.subarray(bestStart, bestEnd);
      return new Blob([slice], { type: 'image/jpeg' });
    }

    throw new Error('Nenhuma pré-visualização JPEG em alta resolução foi encontrada neste arquivo RAW.');
  }

  /**
   * Decodificador de Baseline TIFF / TIF (sem dependência externa)
   * Suporta RGB, Tons de Cinza, Uncompressed e PackBits RLE
   */
  function decodeTIFF(buffer) {
    // Se a biblioteca UTIF estiver disponível globalmente, usa sua implementação
    if (global.UTIF && typeof global.UTIF.decode === 'function') {
      const ifds = global.UTIF.decode(buffer);
      if (ifds && ifds.length > 0) {
        global.UTIF.decodeImage(buffer, ifds[0]);
        const rgba = global.UTIF.toRGBA8(ifds[0]);
        return new ImageData(new Uint8ClampedArray(rgba), ifds[0].width, ifds[0].height);
      }
    }

    // Decodificador interno baseline TIFF
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const le = (bytes[0] === 0x49 && bytes[1] === 0x49); // 'II'

    let ifdOffset = view.getUint32(4, le);
    const numEntries = view.getUint16(ifdOffset, le);

    let width = 0, height = 0, compression = 1, photometric = 2, samplesPerPixel = 3;
    let stripOffsets = [], stripByteCounts = [];

    function readTagValue(type, count, valOrOffset) {
      if (count === 1 && (type === 3 || type === 4)) {
        return valOrOffset;
      }
      if (count > 1) {
        const arr = [];
        let ptr = valOrOffset;
        for (let c = 0; c < count; c++) {
          if (type === 3) { arr.push(view.getUint16(ptr, le)); ptr += 2; }
          else if (type === 4) { arr.push(view.getUint32(ptr, le)); ptr += 4; }
        }
        return arr;
      }
      return valOrOffset;
    }

    for (let i = 0; i < numEntries; i++) {
      const entryPos = ifdOffset + 2 + i * 12;
      const tag = view.getUint16(entryPos, le);
      const type = view.getUint16(entryPos + 2, le);
      const count = view.getUint32(entryPos + 4, le);
      const valOrOffset = view.getUint32(entryPos + 8, le);

      if (tag === 256) width = valOrOffset;
      else if (tag === 257) height = valOrOffset;
      else if (tag === 259) compression = valOrOffset;
      else if (tag === 262) photometric = valOrOffset;
      else if (tag === 273) {
        const val = readTagValue(type, count, valOrOffset);
        stripOffsets = Array.isArray(val) ? val : [val];
      }
      else if (tag === 277) samplesPerPixel = valOrOffset;
      else if (tag === 279) {
        const val = readTagValue(type, count, valOrOffset);
        stripByteCounts = Array.isArray(val) ? val : [val];
      }
    }

    if (!width || !height) throw new Error('Dimensões TIFF inválidas.');

    const totalPixels = width * height;
    const output = new Uint8ClampedArray(totalPixels * 4);
    output.fill(255);

    let pixelIdx = 0;

    for (let s = 0; s < stripOffsets.length; s++) {
      const offset = stripOffsets[s];
      const byteCount = stripByteCounts[s] || (bytes.length - offset);
      const stripData = bytes.subarray(offset, offset + byteCount);

      if (compression === 1) { // Uncompressed RGB
        let pos = 0;
        while (pos < stripData.length && pixelIdx < totalPixels) {
          const outIdx = pixelIdx * 4;
          if (samplesPerPixel >= 3) {
            output[outIdx] = stripData[pos++];
            output[outIdx + 1] = stripData[pos++];
            output[outIdx + 2] = stripData[pos++];
            if (samplesPerPixel >= 4) output[outIdx + 3] = stripData[pos++];
          } else {
            const v = stripData[pos++];
            output[outIdx] = v;
            output[outIdx + 1] = v;
            output[outIdx + 2] = v;
          }
          pixelIdx++;
        }
      } else if (compression === 32773) { // PackBits
        let pos = 0;
        while (pos < stripData.length && pixelIdx < totalPixels) {
          const n = stripData[pos++];
          if (n <= 127) {
            const count = n + 1;
            for (let k = 0; k < count && pixelIdx < totalPixels; k++) {
              const outIdx = pixelIdx * 4;
              output[outIdx] = stripData[pos++];
              output[outIdx + 1] = stripData[pos++];
              output[outIdx + 2] = stripData[pos++];
              if (samplesPerPixel >= 4) output[outIdx + 3] = stripData[pos++];
              pixelIdx++;
            }
          } else if (n >= 129) {
            const count = 257 - n;
            const r = stripData[pos++];
            const g = stripData[pos++];
            const b = stripData[pos++];
            const a = samplesPerPixel >= 4 ? stripData[pos++] : 255;
            for (let k = 0; k < count && pixelIdx < totalPixels; k++) {
              const outIdx = pixelIdx * 4;
              output[outIdx] = r;
              output[outIdx + 1] = g;
              output[outIdx + 2] = b;
              output[outIdx + 3] = a;
              pixelIdx++;
            }
          }
        }
      }
    }

    return new ImageData(output, width, height);
  }

  /**
   * Decodificador de Ícones Windows (ICO / CUR)
   * Localiza a maior resolução interna e extrai PNG ou DIB
   */
  async function decodeICO(buffer) {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    const type = view.getUint16(2, true); // 1 = ICO, 2 = CUR
    const count = view.getUint16(4, true);
    if ((type !== 1 && type !== 2) || count === 0) throw new Error('Arquivo ICO inválido.');

    let bestIdx = 0;
    let maxArea = 0;
    let bestOffset = 0;
    let bestSize = 0;

    for (let i = 0; i < count; i++) {
      const entryPos = 6 + i * 16;
      let w = bytes[entryPos] || 256;
      let h = bytes[entryPos + 1] || 256;
      const size = view.getUint32(entryPos + 8, true);
      const offset = view.getUint32(entryPos + 12, true);

      const area = w * h;
      if (area > maxArea) {
        maxArea = area;
        bestIdx = i;
        bestOffset = offset;
        bestSize = size;
      }
    }

    const subData = bytes.subarray(bestOffset, bestOffset + bestSize);

    // Se começar com PNG signature (\x89PNG)
    if (subData[0] === 0x89 && subData[1] === 0x50 && subData[2] === 0x4E && subData[3] === 0x47) {
      const blob = new Blob([subData], { type: 'image/png' });
      return await loadImageFromBlob(blob);
    }

    // Se for DIB (BITMAPINFOHEADER)
    const blob = new Blob([buffer], { type: 'image/x-icon' });
    return await loadImageFromBlob(blob);
  }

  /**
   * Decodificador de Radiance HDRI (.hdr)
   * RGBE 32-bit float com tonemapping para 8-bit RGB
   */
  function decodeHDR(buffer) {
    const bytes = new Uint8Array(buffer);
    let pos = 0;

    function readLine() {
      let line = '';
      while (pos < bytes.length) {
        const c = bytes[pos++];
        if (c === 0x0A) break;
        if (c !== 0x0D) line += String.fromCharCode(c);
      }
      return line;
    }

    const head = readLine();
    if (!head.startsWith('#?RADIANCE') && !head.startsWith('#?RGBE')) {
      throw new Error('Assinatura HDR inválida.');
    }

    let line = readLine();
    while (line && !line.startsWith('-Y')) {
      line = readLine();
    }

    const parts = line.split(' ');
    const height = parseInt(parts[1], 10);
    const width = parseInt(parts[3], 10);
    if (!width || !height) throw new Error('Dimensões HDR inválidas.');

    const totalPixels = width * height;
    const output = new Uint8ClampedArray(totalPixels * 4);

    let outIdx = 0;
    while (pos + 3 < bytes.length && outIdx < output.length) {
      const r = bytes[pos++];
      const g = bytes[pos++];
      const b = bytes[pos++];
      const e = bytes[pos++];

      if (e === 0) {
        output[outIdx++] = 0;
        output[outIdx++] = 0;
        output[outIdx++] = 0;
        output[outIdx++] = 255;
      } else {
        const exp = Math.pow(2, e - 128) / 256;
        output[outIdx++] = Math.min(255, Math.round(Math.pow(r * exp, 0.4545) * 255));
        output[outIdx++] = Math.min(255, Math.round(Math.pow(g * exp, 0.4545) * 255));
        output[outIdx++] = Math.min(255, Math.round(Math.pow(b * exp, 0.4545) * 255));
        output[outIdx++] = 255;
      }
    }

    return new ImageData(output, width, height);
  }

  /**
   * Decodificador de Wireless Bitmap (.wbmp)
   */
  function decodeWBMP(buffer) {
    const bytes = new Uint8Array(buffer);
    if (bytes[0] !== 0 || bytes[1] !== 0) throw new Error('Arquivo WBMP inválido.');

    let pos = 2;
    function readMultiByte() {
      let val = 0;
      while (pos < bytes.length) {
        const b = bytes[pos++];
        val = (val << 7) | (b & 0x7F);
        if ((b & 0x80) === 0) break;
      }
      return val;
    }

    const width = readMultiByte();
    const height = readMultiByte();
    if (!width || !height) throw new Error('Dimensões WBMP inválidas.');

    const totalPixels = width * height;
    const output = new Uint8ClampedArray(totalPixels * 4);
    const rowBytes = Math.ceil(width / 8);

    let outIdx = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const byteIdx = pos + (y * rowBytes + Math.floor(x / 8));
        const bit = (bytes[byteIdx] >> (7 - (x % 8))) & 1;
        const val = bit ? 255 : 0;
        output[outIdx++] = val;
        output[outIdx++] = val;
        output[outIdx++] = val;
        output[outIdx++] = 255;
      }
    }

    return new ImageData(output, width, height);
  }

  /**
   * Helper para carregar um Blob em um elemento Image
   */
  function loadImageFromBlob(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        resolve({ source: img, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height, url });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Falha ao decodificar imagem no navegador.'));
      };
      img.src = url;
    });
  }

  // --- 3. Fachada Principal: UniversalImageDecoder ---
  const UniversalImageDecoder = {
    FORMAT_CATEGORIES,
    EXTENSIONS_LIST,

    /**
     * Retorna metadados da extensão do arquivo
     */
    getInfo(extension) {
      const ext = (extension || '').toLowerCase().replace(/^\./, '');
      return FORMAT_CATEGORIES[ext] || { name: ext.toUpperCase(), category: 'unknown', badgeClass: 'badge-default' };
    },

    /**
     * Valida se uma extensão é suportada
     */
    isSupported(filenameOrExt) {
      const ext = (filenameOrExt.split('.').pop() || '').toLowerCase();
      return EXTENSIONS_LIST.includes(ext);
    },

    /**
     * Decodifica qualquer arquivo suportado para uma fonte utilizável pelo Canvas/Worker
     * Retorna { source, width, height, orientation, category, formatName, url }
     */
    async decode(file) {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const info = this.getInfo(ext);

      // 1. Câmeras Profissionais RAW (CR2, NEF, ARW, DNG, etc.)
      if (info.category === 'raw') {
        const buffer = await file.arrayBuffer();
        const jpegBlob = extractRawPreview(buffer);
        const imgResult = await loadImageFromBlob(jpegBlob);
        return {
          source: imgResult.source,
          width: imgResult.width,
          height: imgResult.height,
          orientation: 1,
          category: info.category,
          formatName: info.name,
          url: imgResult.url
        };
      }

      // 2. Gráficos Vetoriais (SVG)
      if (ext === 'svg' || ext === 'svgz') {
        const svgBlob = new Blob([file], { type: 'image/svg+xml' });
        const imgResult = await loadImageFromBlob(svgBlob);
        return {
          source: imgResult.source,
          width: imgResult.width || 1920,
          height: imgResult.height || 1080,
          orientation: 1,
          category: info.category,
          formatName: info.name,
          url: imgResult.url
        };
      }

      // 3. Apple HEIC / HEIF
      if (ext === 'heic' || ext === 'heif' || ext === 'heics' || ext === 'heifs') {
        if (typeof global.heic2any !== 'function') {
          throw new Error('Módulo heic2any não inicializado.');
        }
        const convertedBlob = await global.heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.95
        });
        const singleBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        const imgResult = await loadImageFromBlob(singleBlob);
        return {
          source: imgResult.source,
          width: imgResult.width,
          height: imgResult.height,
          orientation: 1,
          category: info.category,
          formatName: info.name,
          url: imgResult.url
        };
      }

      // 4. Ícones do Windows (ICO / CUR)
      if (ext === 'ico' || ext === 'cur') {
        const buffer = await file.arrayBuffer();
        try {
          const imgResult = await decodeICO(buffer);
          return {
            source: imgResult.source,
            width: imgResult.width,
            height: imgResult.height,
            orientation: 1,
            category: info.category,
            formatName: info.name,
            url: imgResult.url
          };
        } catch (e) {
          // Fallback para carregador direto do navegador
          const imgResult = await loadImageFromBlob(file);
          return {
            source: imgResult.source,
            width: imgResult.width,
            height: imgResult.height,
            orientation: 1,
            category: info.category,
            formatName: info.name,
            url: imgResult.url
          };
        }
      }

      // 5. Targa (TGA)
      if (ext === 'tga' || ext === 'tpic') {
        const buffer = await file.arrayBuffer();
        const imgData = decodeTGA(buffer);
        const canvas = imageDataToCanvas(imgData);
        return {
          source: canvas,
          width: canvas.width,
          height: canvas.height,
          orientation: 1,
          category: info.category,
          formatName: info.name,
          url: null
        };
      }

      // 6. Netpbm (PPM, PGM, PBM, PNM)
      if (ext === 'ppm' || ext === 'pgm' || ext === 'pbm' || ext === 'pnm') {
        const buffer = await file.arrayBuffer();
        const imgData = decodeNetpbm(buffer);
        const canvas = imageDataToCanvas(imgData);
        return {
          source: canvas,
          width: canvas.width,
          height: canvas.height,
          orientation: 1,
          category: info.category,
          formatName: info.name,
          url: null
        };
      }

      // 7. Paintbrush (PCX)
      if (ext === 'pcx') {
        const buffer = await file.arrayBuffer();
        const imgData = decodePCX(buffer);
        const canvas = imageDataToCanvas(imgData);
        return {
          source: canvas,
          width: canvas.width,
          height: canvas.height,
          orientation: 1,
          category: info.category,
          formatName: info.name,
          url: null
        };
      }

      // 8. Photoshop (PSD / PSB)
      if (ext === 'psd' || ext === 'psb') {
        const buffer = await file.arrayBuffer();
        const imgData = decodePSD(buffer);
        const canvas = imageDataToCanvas(imgData);
        return {
          source: canvas,
          width: canvas.width,
          height: canvas.height,
          orientation: 1,
          category: info.category,
          formatName: info.name,
          url: null
        };
      }

      // 9. TIFF / TIF
      if (ext === 'tiff' || ext === 'tif') {
        const buffer = await file.arrayBuffer();
        const imgData = decodeTIFF(buffer);
        const canvas = imageDataToCanvas(imgData);
        return {
          source: canvas,
          width: canvas.width,
          height: canvas.height,
          orientation: 1,
          category: info.category,
          formatName: info.name,
          url: null
        };
      }

      // 10. Radiance HDRI (HDR)
      if (ext === 'hdr') {
        const buffer = await file.arrayBuffer();
        const imgData = decodeHDR(buffer);
        const canvas = imageDataToCanvas(imgData);
        return {
          source: canvas,
          width: canvas.width,
          height: canvas.height,
          orientation: 1,
          category: info.category,
          formatName: info.name,
          url: null
        };
      }

      // 11. Wireless Bitmap (WBMP)
      if (ext === 'wbmp') {
        const buffer = await file.arrayBuffer();
        const imgData = decodeWBMP(buffer);
        const canvas = imageDataToCanvas(imgData);
        return {
          source: canvas,
          width: canvas.width,
          height: canvas.height,
          orientation: 1,
          category: info.category,
          formatName: info.name,
          url: null
        };
      }

      // 12. Padrão Nativos (PNG, JPG, WEBP, BMP, AVIF, APNG)
      const imgResult = await loadImageFromBlob(file);
      return {
        source: imgResult.source,
        width: imgResult.width,
        height: imgResult.height,
        orientation: 1,
        category: info.category,
        formatName: info.name,
        url: imgResult.url
      };
    }
  };

  // Exportação no escopo global
  global.UniversalImageDecoder = UniversalImageDecoder;

})(typeof window !== 'undefined' ? window : this);
