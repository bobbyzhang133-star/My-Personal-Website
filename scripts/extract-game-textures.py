"""Losslessly decode native GameMaker texture pages; never run bundle code.

Format references: UndertaleModLib Models/UndertaleSprite.cs,
Models/UndertaleTexturePageItem.cs and Util/QoiConverter.cs (GM QOI wire format).
No resizing, repainting, recoloring, or sprite compositing is performed.
Usage: python3 scripts/extract-game-textures.py bundle.unx output-directory
"""
import bz2
import json
import struct
import sys
from pathlib import Path
from PIL import Image


def decode_qoi(data):
    assert data[:4] == b'fioq'
    width, height, length = struct.unpack_from('<HHI', data, 4)
    assert 0 < width <= 4096 and 0 < height <= 4096
    stream = memoryview(data)[12:12+length]
    position, run = 0, 0
    pixel = [0, 0, 0, 255]
    cache = [[0, 0, 0, 0] for _ in range(64)]
    raw = bytearray(width*height*4)
    signed = lambda value, bits: value-(1 << bits) if value & (1 << (bits-1)) else value
    for offset in range(0, len(raw), 4):
        if run:
            run -= 1
        else:
            tag = stream[position]
            position += 1
            if tag < 64:
                pixel = cache[tag].copy()
            elif tag < 96:
                run = tag & 31
            elif tag < 128:
                run = ((tag & 31) << 8 | stream[position])+32
                position += 1
            elif tag < 192:
                delta = [signed((tag >> 4) & 3, 2), signed((tag >> 2) & 3, 2), signed(tag & 3, 2), 0]
                pixel = [(channel+change) & 255 for channel, change in zip(pixel, delta)]
            elif tag < 224:
                value = tag << 8 | stream[position]
                position += 1
                delta = [signed((value >> 8) & 31, 5), signed((value >> 4) & 15, 4), signed(value & 15, 4), 0]
                pixel = [(channel+change) & 255 for channel, change in zip(pixel, delta)]
            elif tag < 240:
                value = tag << 16 | stream[position] << 8 | stream[position+1]
                position += 2
                delta = [signed((value >> shift) & 31, 5) for shift in [15, 10, 5, 0]]
                pixel = [(channel+change) & 255 for channel, change in zip(pixel, delta)]
            else:
                for channel, mask in enumerate([8, 4, 2, 1]):
                    if tag & mask:
                        pixel[channel] = stream[position]
                        position += 1
            cache[(pixel[0] ^ pixel[1] ^ pixel[2] ^ pixel[3]) & 63] = pixel.copy()
        raw[offset:offset+4] = bytes(pixel)
    assert position <= len(stream)
    return Image.frombytes('RGBA', (width, height), bytes(raw))


def extract(source, destination):
    bundle = Path(source).read_bytes()
    assert bundle[:4] == b'FORM'
    u32 = lambda position: struct.unpack_from('<I', bundle, position)[0]
    chunks, position = {}, 8
    while position+8 <= len(bundle):
        length = u32(position+4)
        assert position+8+length <= len(bundle)
        chunks[bundle[position:position+4]] = position+8
        position += 8+length
    pointers = lambda name: [u32(chunks[name]+4+i*4) for i in range(u32(chunks[name]))]
    target = Path(destination)
    target.mkdir(parents=True, exist_ok=True)
    for index, pointer in enumerate(pointers(b'TXTR')):
        address = u32(pointer+24)
        assert bundle[address:address+4] == b'2zoq'
        image = decode_qoi(bz2.BZ2Decompressor().decompress(bundle[address+12:]))
        image.save(target / ('atlas-'+str(index)+'.png'))
    sprites = {}
    for pointer in pointers(b'SPRT'):
        if pointer == 0:
            continue
        name_pointer = u32(pointer)
        name = bundle[name_pointer:bundle.index(b'\0', name_pointer)].decode('utf8')
        assert u32(pointer+56) == 0xffffffff and u32(pointer+60) == 3 and u32(pointer+64) == 0
        frames = []
        for index in range(u32(pointer+84)):
            texture_pointer = u32(pointer+88+index*4)
            values = struct.unpack_from('<11H', bundle, texture_pointer)
            frames.append({'page': values[10], 'source': list(values[:4]), 'target': list(values[4:8])})
        sprites[name] = {'width': u32(pointer+4), 'height': u32(pointer+8), 'frames': frames}
    (target / 'sprites.json').write_text(json.dumps(sprites, indent=2))
    print(json.dumps({'pages': len(pointers(b'TXTR')), 'sprites': list(sprites)}))


if __name__ == '__main__':
    extract(sys.argv[1], sys.argv[2])
