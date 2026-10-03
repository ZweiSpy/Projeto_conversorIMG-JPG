import os
import struct
import zlib

os.makedirs('test_samples', exist_ok=True)

# 1. Gerar arquivo BMP 24-bit válido (200x200)
def create_bmp(filename, width=200, height=200):
    row_bytes = width * 3
    padding = (4 - (row_bytes % 4)) % 4
    image_size = (row_bytes + padding) * height
    file_size = 54 + image_size

    # BMP Header
    bmp_header = struct.pack('<2sIHHI', b'BM', file_size, 0, 0, 54)
    # DIB Header (BITMAPINFOHEADER)
    dib_header = struct.pack('<IIIHHIIIIII', 40, width, height, 1, 24, 0, image_size, 2835, 2835, 0, 0)

    with open(filename, 'wb') as f:
        f.write(bmp_header)
        f.write(dib_header)
        for y in range(height):
            row = bytearray()
            for x in range(width):
                # Gradiente colorido (BGR)
                blue = int((x / width) * 255)
                green = int((y / height) * 255)
                red = 200
                row.extend([blue, green, red])
            row.extend(b'\x00' * padding)
            f.write(row)

create_bmp('test_samples/sample_test.bmp')

# 2. Gerar arquivo PNG válido com canal Alfa/Transparência (200x200)
def create_png_with_alpha(filename, width=200, height=200):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter type 0 (None)
        for x in range(width):
            r = int((x / width) * 255)
            g = 100
            b = int((y / height) * 255)
            # Transparência: centro opaco, cantos transparentes
            dist = ((x - 100)**2 + (y - 100)**2)**0.5
            a = max(0, min(255, int(255 - dist * 2.2)))
            raw_data.extend([r, g, b, a])

    compressed = zlib.compress(bytes(raw_data))

    def make_chunk(chunk_type, data):
        length = len(data)
        crc = zlib.crc32(chunk_type + data)
        return struct.pack('>I', length) + chunk_type + data + struct.pack('>I', crc)

    with open(filename, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')  # PNG Signature
        # IHDR: width, height, bit_depth=8, color_type=6 (RGBA), compression=0, filter=0, interlace=0
        ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
        f.write(make_chunk(b'IHDR', ihdr_data))
        f.write(make_chunk(b'IDAT', compressed))
        f.write(make_chunk(b'IEND', b''))

create_png_with_alpha('test_samples/sample_transparent.png')

# 3. Gerar arquivo de vídeo falso (.mp4) para testar rejeição de escopo
with open('test_samples/test_video.mp4', 'wb') as f:
    f.write(b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00isommp42')

# 4. Gerar arquivo GIF falso (.gif) para testar rejeição de escopo
with open('test_samples/test_animation.gif', 'wb') as f:
    f.write(b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;')

# 5. Gerar arquivo com extensão inválida
with open('test_samples/documento_invalido.xyz', 'w') as f:
    f.write('Este formato nao deve ser aceito')

print("Test assets successfully generated in test_samples/")
