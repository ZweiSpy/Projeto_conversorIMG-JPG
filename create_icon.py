import struct
import zlib

def create_png_icon(size):
    # Generates a clean 32-bit RGBA PNG image buffer with a gradient icon
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            # Indigo / Cyan rounded box
            dx = abs(x - size // 2)
            dy = abs(y - size // 2)
            radius = size // 2 - 2
            if dx * dx + dy * dy <= radius * radius:
                r = int(99 + (x / size) * 50)
                g = int(102 + (y / size) * 80)
                b = 241
                a = 255
            else:
                r, g, b, a = 0, 0, 0, 0
            raw.extend([r, g, b, a])
    
    compressed = zlib.compress(bytes(raw))
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data))
    
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    return png

# ICO format allows embedding PNG images directly!
png_64 = create_png_icon(64)

# ICONDIR header: idReserved (0), idType (1 for ICO), idCount (1)
ico_header = struct.pack('<HHH', 0, 1, 1)

# ICONDIRENTRY: bWidth, bHeight, bColorCount, bReserved, wPlanes, wBitCount, dwBytesInRes, dwImageOffset
entry = struct.pack('<BBBBHHII', 64, 64, 0, 0, 1, 32, len(png_64), 6 + 16)

with open('icon.ico', 'wb') as f:
    f.write(ico_header)
    f.write(entry)
    f.write(png_64)

print("icon.ico generated successfully!")
