#!/usr/bin/env python3
"""Render a TTF into the plugin's F8X13 bitmap atlas.

The atlas format is fixed by lib/snapfont.js: magic "F8X13", u32le glyph count at
offset 8, count u32le codepoints, then count x 13 bytes of 8x13 one-bit rows.

Usage:
  tools/make-atlas.py FONT.ttf SIZE OUT.bin [--first 32] [--last 255] [--baseline 11] [--bold-px 0]
"""
import argparse, struct, sys
from PIL import Image, ImageDraw, ImageFont

def build(font_path, size, first, last, baseline, bold_px):
    font = ImageFont.truetype(font_path, size)
    ascent, descent = font.getmetrics()
    top = baseline - ascent
    glyphs = []
    for cp in range(first, last + 1):
        img = Image.new("1", (8, 13), 0)
        d = ImageDraw.Draw(img)
        d.text((0, top), chr(cp), font=font, fill=1)
        if bold_px:
            px = img.load()
            shifted = img.copy()
            sp = shifted.load()
            for y in range(13):
                for x in range(8):
                    if px[x, y]:
                        for dx in range(1, bold_px + 1):
                            if x + dx < 8:
                                sp[x + dx, y] = 1
            img = shifted
        rows = bytearray()
        px = img.load()
        for y in range(13):
            bits = 0
            for x in range(8):
                if px[x, y]:
                    bits |= 1 << (7 - x)
            rows.append(bits)
        glyphs.append(bytes(rows))
    out = bytearray(b"F8X13\x00\x00\x00")
    out += struct.pack("<I", len(glyphs))
    for cp in range(first, last + 1):
        out += struct.pack("<I", cp)
    for g in glyphs:
        out += g
    return bytes(out)

def show(font_path, size, baseline, chars="018B37gq"):
    font = ImageFont.truetype(font_path, size)
    ascent, _ = font.getmetrics()
    print("--- %s @%d (ascent %d, baseline %d)" % (font_path.split("/")[-1], size, ascent, baseline))
    for ch in chars:
        img = Image.new("1", (8, 13), 0)
        ImageDraw.Draw(img).text((0, baseline - ascent), ch, font=font, fill=1)
        px = img.load()
        print("  '" + ch + "'")
        for y in range(13):
            print("    " + "".join("#" if px[x, y] else "." for x in range(8)))

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("font"); ap.add_argument("size", type=int); ap.add_argument("out")
    ap.add_argument("--first", type=int, default=32)
    ap.add_argument("--last", type=int, default=255)
    ap.add_argument("--baseline", type=int, default=11)
    ap.add_argument("--bold-px", type=int, default=0)
    ap.add_argument("--show", action="store_true")
    a = ap.parse_args()
    if a.show:
        show(a.font, a.size, a.baseline)
    else:
        data = build(a.font, a.size, a.first, a.last, a.baseline, a.bold_px)
        open(a.out, "wb").write(data)
        print("wrote %s (%d glyphs, %d bytes)" % (a.out, a.last - a.first + 1, len(data)))
