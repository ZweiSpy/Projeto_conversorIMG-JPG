import os
import struct
import zlib

os.makedirs('test_samples', exist_ok=True)

# 1. Gerar arquivo BMP 24-bit válido (150x150)
def create_bmp(filename, width=150, height=150):
    row_bytes = width * 3
    padding = (4 - (row_bytes % 4)) % 4
    image_size = (row_bytes + padding) * height
    file_size = 54 + image_size

    bmp_header = struct.pack('<2sIHHI', b'BM', file_size, 0, 0, 54)
    dib_header = struct.pack('<IIIHHIIIIII', 40, width, height, 1, 24, 0, image_size, 2835, 2835, 0, 0)

    with open(filename, 'wb') as f:
        f.write(bmp_header)
        f.write(dib_header)
        for y in range(height):
            row = bytearray()
            for x in range(width):
                blue = int((x / width) * 255)
                green = int((y / height) * 255)
                red = 200
                row.extend([blue, green, red])
            row.extend(b'\x00' * padding)
            f.write(row)

create_bmp('test_samples/sample_test.bmp')

# 2. Gerar arquivo PNG válido com canal Alfa/Transparência (150x150)
def create_png_with_alpha(filename, width=150, height=150):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter type 0 (None)
        for x in range(width):
            r = int((x / width) * 255)
            g = 100
            b = int((y / height) * 255)
            dist = ((x - width/2)**2 + (y - height/2)**2)**0.5
            a = max(0, min(255, int(255 - dist * 2.5)))
            raw_data.extend([r, g, b, a])

    compressed = zlib.compress(bytes(raw_data))

    def make_chunk(chunk_type, data):
        length = len(data)
        crc = zlib.crc32(chunk_type + data)
        return struct.pack('>I', length) + chunk_type + data + struct.pack('>I', crc)

    with open(filename, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
        f.write(make_chunk(b'IHDR', ihdr_data))
        f.write(make_chunk(b'IDAT', compressed))
        f.write(make_chunk(b'IEND', b''))

create_png_with_alpha('test_samples/sample_transparent.png')

# Helper: PNG em memória
def get_png_bytes(width=64, height=64):
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            raw.extend([100, 150, 240, 255])
    comp = zlib.compress(bytes(raw))
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)) + chunk(b'IDAT', comp) + chunk(b'IEND', b'')

# 3. Gerar arquivo TGA 24-bit Truecolor (120x120)
def create_tga(filename, width=120, height=120):
    header = bytearray(18)
    header[2] = 2  # Uncompressed Truecolor RGB
    struct.pack_into('<HH', header, 12, width, height)
    header[16] = 24  # 24 bits por pixel
    header[17] = 0x20  # Top-down

    data = bytearray()
    for y in range(height):
        for x in range(width):
            b = int((x / width) * 255)
            g = 180
            r = int((y / height) * 255)
            data.extend([b, g, r])

    with open(filename, 'wb') as f:
        f.write(header)
        f.write(data)

create_tga('test_samples/sample_targa.tga')

# 4. Gerar arquivo Netpbm PPM (P6 Binário RGB) (120x120)
def create_ppm(filename, width=120, height=120):
    header = f"P6\n{width} {height}\n255\n".encode('ascii')
    data = bytearray()
    for y in range(height):
        for x in range(width):
            r = int((x / width) * 255)
            g = int((y / height) * 255)
            b = 150
            data.extend([r, g, b])
    with open(filename, 'wb') as f:
        f.write(header)
        f.write(data)

create_ppm('test_samples/sample_pixmap.ppm')

# 5. Gerar arquivo Netpbm PGM (P5 Binário Grayscale) (100x100)
def create_pgm(filename, width=100, height=100):
    header = f"P5\n{width} {height}\n255\n".encode('ascii')
    data = bytearray()
    for y in range(height):
        for x in range(width):
            val = int(((x + y) / (width + height)) * 255)
            data.append(val)
    with open(filename, 'wb') as f:
        f.write(header)
        f.write(data)

create_pgm('test_samples/sample_gray.pgm')

# 6. Gerar arquivo SVG Vetorial Válido (200x200)
def create_svg(filename):
    svg_content = """<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#a855f7;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="20" fill="url(#grad1)"/>
  <circle cx="100" cy="100" r="50" fill="#38bdf8"/>
  <text x="100" y="108" font-size="24" font-weight="bold" text-anchor="middle" fill="#ffffff" font-family="sans-serif">ZWEI</text>
</svg>"""
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(svg_content)

create_svg('test_samples/sample_vector.svg')

# 7. Gerar arquivo Windows Icon (ICO) com frame PNG embutido
def create_ico(filename):
    png_data = get_png_bytes(64, 64)
    # Header: reserved(0), type(1), count(1)
    header = struct.pack('<HHH', 0, 1, 1)
    # Dir Entry: width(64), height(64), colorCount(0), reserved(0), planes(1), bpp(32), bytes(len), offset(22)
    entry = struct.pack('<BBBBHHII', 64, 64, 0, 0, 1, 32, len(png_data), 22)
    with open(filename, 'wb') as f:
        f.write(header)
        f.write(entry)
        f.write(png_data)

create_ico('test_samples/sample_icon.ico')

# 8. Gerar arquivo Baseline TIFF 24-bit RGB (100x100)
def create_tiff(filename, width=100, height=100):
    raw_rgb = bytearray()
    for y in range(height):
        for x in range(width):
            raw_rgb.extend([int((x/width)*255), 120, int((y/height)*255)])

    data_offset = 8 + 2 + 10 * 12 + 4 + 6 # Header + IFD entries + nextIFD + BitsPerSample (3 shorts)
    bits_offset = 8 + 2 + 10 * 12 + 4

    header = b'II\x2a\x00' + struct.pack('<I', 8)
    num_entries = 10
    ifd = struct.pack('<H', num_entries)

    # 1. ImageWidth (256, LONG)
    ifd += struct.pack('<HHII', 256, 4, 1, width)
    # 2. ImageLength (257, LONG)
    ifd += struct.pack('<HHII', 257, 4, 1, height)
    # 3. BitsPerSample (258, SHORT x 3) -> offset
    ifd += struct.pack('<HHII', 258, 3, 3, bits_offset)
    # 4. Compression (259, SHORT = 1 None)
    ifd += struct.pack('<HHII', 259, 3, 1, 1)
    # 5. Photometric (262, SHORT = 2 RGB)
    ifd += struct.pack('<HHII', 262, 3, 1, 2)
    # 6. StripOffsets (273, LONG)
    ifd += struct.pack('<HHII', 273, 4, 1, data_offset)
    # 7. SamplesPerPixel (277, SHORT = 3)
    ifd += struct.pack('<HHII', 277, 3, 1, 3)
    # 8. RowsPerStrip (278, LONG = height)
    ifd += struct.pack('<HHII', 278, 4, 1, height)
    # 9. StripByteCounts (279, LONG = len)
    ifd += struct.pack('<HHII', 279, 4, 1, len(raw_rgb))
    # 10. PlanarConfig (284, SHORT = 1 Chunky)
    ifd += struct.pack('<HHII', 284, 3, 1, 1)

    next_ifd = struct.pack('<I', 0)
    extra_data = struct.pack('<HHH', 8, 8, 8) # 8-bit per channel R, G, B

    with open(filename, 'wb') as f:
        f.write(header)
        f.write(ifd)
        f.write(next_ifd)
        f.write(extra_data)
        f.write(raw_rgb)

create_tiff('test_samples/sample_scan.tiff')

# 9. Gerar arquivo RAW simulado (DNG e CR2) contendo preview JPEG embutido
def create_simulated_raw(filename):
    # Gera JPEG válido minimalista ou embutido
    # JPEG mínimo válido com marcador SOI 0xFFD8 ... EOI 0xFFD9
    # Cria uma simulação com cabeçalho TIFF / CR2 e embutido JPEG de 60KB
    raw_header = b'II\x55\x00' + struct.pack('<I', 16) # CR2 Signature
    filler = b'\x00' * 512
    # JPEG SOI ... EOI sintético
    jpeg_dummy = bytearray([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00])
    jpeg_dummy.extend(b'\xAA' * 50000)
    jpeg_dummy.extend([0xFF, 0xD9])

    with open(filename, 'wb') as f:
        f.write(raw_header)
        f.write(filler)
        f.write(jpeg_dummy)

create_simulated_raw('test_samples/sample_camera.dng')
create_simulated_raw('test_samples/sample_camera.cr2')

# 10. Gerar arquivos de teste de escopo (Vídeo e GIF que DEVEM ser bloqueados)
with open('test_samples/test_video.mp4', 'wb') as f:
    f.write(b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00isommp42')

with open('test_samples/test_animation.gif', 'wb') as f:
    f.write(b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;')

with open('test_samples/documento_invalido.xyz', 'w') as f:
    f.write('Este formato nao deve ser aceito')

print("Todos os arquivos de teste de novos formatos foram gerados com sucesso em test_samples/!")
