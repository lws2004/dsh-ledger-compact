#!/usr/bin/env python3
"""Render any font FreeType can open (TTF, OTF, X.org PCF) into a glyph atlas.

Atlas format (lib/snapfont.js, parseAsciiAtlas):

    magic   "FGATLAS1"            8 bytes
    width   u8                    glyph box width  (8, 9, 10, ...)
    height  u8                    glyph box height (13, 15, 16, 20, ...)
    pad     u16
    count   u32le
    cps     u32le x count         codepoints, ascending
    bits    count x ceil(w/8)*h   one-bit rows, top to bottom, MSB = leftmost

Sources: the shipped atlas is the X.org misc-fixed 8x13 face, and
--check-legacy re-derives lib/fonts/font8x13.bin glyph for glyph from
/usr/share/fonts/X11/misc/8x13.pcf.gz (3385/3385 non-combining glyphs match;
the zero-width combining marks are the only difference, and FreeType repositions
those, so they are not carried over).

Usage:
  tools/make-atlas.py FONT OUT.bin [--cell 8x16] [--first 32] [--last 255]
  tools/make-atlas.py FONT --show [-c 0OIl1] [--cell 9x15]
  tools/make-atlas.py FONT --check-legacy lib/fonts/font8x13.bin [--size 13]
"""
import argparse, struct, sys
from PIL import Image, ImageDraw, ImageFont

MAGIC = b"FGATLAS1"
LEGACY_MAGIC = b"F8X13"
LEGACY_H = 13


def open_font(path, size):
    if size is None:
        raise SystemExit("--size is required for " + path)
    return ImageFont.truetype(path, size)


def glyph_image(font, cp, cell, baseline, bold_px):
    cellW, cellH = cell
    ascent, _descent = font.getmetrics()
    top = (ascent if baseline is None else baseline) - ascent
    img = Image.new("1", (cellW, cellH), 0)
    ImageDraw.Draw(img).text((0, top), chr(cp), font=font, fill=1)
    if bold_px:
        px = img.load()
        shifted = img.copy()
        sp = shifted.load()
        for y in range(cellH):
            for x in range(cellW):
                if px[x, y]:
                    for dx in range(1, bold_px + 1):
                        if x + dx < cellW:
                            sp[x + dx, y] = 1
        img = shifted
    return img


def pack_rows(img, cell):
    """One-bit rows, top to bottom, MSB = leftmost, padded to whole bytes."""
    cellW, cellH = cell
    px = img.load()
    out = bytearray()
    for y in range(cellH):
        for x0 in range(0, cellW, 8):
            byte = 0
            for bit in range(8):
                x = x0 + bit
                if x < cellW and px[x, y]:
                    byte |= 1 << (7 - bit)
            out.append(byte)
    return bytes(out)


def codepoints_from(atlas):
    """The codepoint list of an existing atlas, in either format."""
    d = open(atlas, "rb").read()
    if d[:8] == MAGIC:
        n = struct.unpack_from("<I", d, 12)[0]
        return list(struct.unpack_from("<%dI" % n, d, 16))
    if d[:5] == LEGACY_MAGIC:
        n = struct.unpack_from("<I", d, 8)[0]
        return list(struct.unpack_from("<%dI" % n, d, 12))
    raise SystemExit(atlas + ": not an atlas")


def build(path, size, first, last, cell, baseline, bold_px, cps_from=""):
    font = open_font(path, size)
    cps, blobs = [], []
    for cp in (codepoints_from(cps_from) if cps_from else range(first, last + 1)):
        try:
            if not font.getmask(chr(cp)).getbbox():
                if cp != 32:  # keep space so the atlas stays a full block
                    continue
        except Exception:
            continue
        cps.append(cp)
        blobs.append(pack_rows(glyph_image(font, cp, cell, baseline, bold_px), cell))
    out = bytearray(MAGIC)
    out += struct.pack("<BBH", cell[0], cell[1], 0)
    out += struct.pack("<I", len(cps))
    for cp in cps:
        out += struct.pack("<I", cp)
    for b in blobs:
        out += b
    return bytes(out)


def show(path, size, chars, cell, baseline):
    font = open_font(path, size)
    ascent, descent = font.getmetrics()
    print("--- %s @%s  cell %dx%d  ascent %d descent %d  baseline %s"
          % (path.split("/")[-1], size, cell[0], cell[1], ascent, descent,
             ascent if baseline is None else baseline))
    for ch in chars:
        try:
            img = glyph_image(font, ord(ch), cell, baseline, 0)
        except Exception as exc:
            print("  %r failed: %s" % (ch, exc))
            continue
        px = img.load()
        print("  %r  advance %.1f" % (ch, font.getlength(ch)))
        for y in range(cell[1]):
            print("    " + "".join("#" if px[x, y] else "." for x in range(cell[0])))


def upgrade(legacy, out):
    """Rewrite an F8X13 atlas as FGATLAS1 without touching the glyph bytes."""
    d = open(legacy, "rb").read()
    if d[:5] != LEGACY_MAGIC:
        raise SystemExit(legacy + ": not a legacy " + LEGACY_MAGIC.decode() + " atlas")
    n = struct.unpack_from("<I", d, 8)[0]
    cps_at, bits_at = 12, 12 + n * 4
    out_bytes = bytearray(MAGIC) + struct.pack("<BBH", 8, LEGACY_H, 0)
    out_bytes += struct.pack("<I", n) + d[cps_at:cps_at + n * 4] + d[bits_at:]
    open(out, "wb").write(out_bytes)
    print("upgraded %s -> %s (8x%d, %d glyphs, %d bytes)" % (legacy, out, LEGACY_H, n, len(out_bytes)))


def check_legacy(path, legacy, baseline, bold_px):
    """Rebuild the legacy atlas's own codepoint list and compare glyph for glyph."""
    d = open(legacy, "rb").read()
    if d[:5] != LEGACY_MAGIC:
        raise SystemExit(legacy + ": not a legacy " + LEGACY_MAGIC.decode() + " atlas")
    n = struct.unpack_from("<I", d, 8)[0]
    cps = struct.unpack_from("<%dI" % n, d, 12)
    base = 12 + n * 4
    font = open_font(path, 13)
    same, diff, blank = 0, [], 0
    for i, cp in enumerate(cps):
        rows = list(d[base + i * LEGACY_H: base + (i + 1) * LEGACY_H])
        if not any(rows):
            blank += 1
            continue
        mine = list(pack_rows(glyph_image(font, cp, (8, LEGACY_H), baseline, bold_px), (8, LEGACY_H)))
        if mine == rows:
            same += 1
        else:
            diff.append(cp)
    combining = sum(1 for cp in diff if 0x300 <= cp <= 0x36F or 0x483 <= cp <= 0x489 or
                    0x5B0 <= cp <= 0x5C7 or 0xE31 <= cp <= 0xE4E or 0x20D0 <= cp <= 0x20EA)
    print("%s vs %s: %d identical, %d different (%d of them zero-width combining marks), %d blank"
          % (legacy, path, same, len(diff), combining, blank))
    if diff:
        print("  differing: " + " ".join("U+%04X" % cp for cp in diff[:24]) +
              (" ..." if len(diff) > 24 else ""))
    return 0 if not diff else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("font")
    ap.add_argument("out", nargs="?")
    ap.add_argument("--size", type=int, default=None, help="pixel size (PCF: the strike)")
    ap.add_argument("--cell", default="", help="WxH glyph box, default 8x13")
    ap.add_argument("--first", type=int, default=32)
    ap.add_argument("--last", type=int, default=255)
    ap.add_argument("--baseline", type=int, default=None)
    ap.add_argument("--bold-px", type=int, default=0)
    ap.add_argument("--show", action="store_true")
    ap.add_argument("-c", "--chars", default="0OIl1gq8B")
    ap.add_argument("--check-legacy", default="")
    ap.add_argument("--cps-from", default="", help="take the codepoint list from an existing atlas")
    ap.add_argument("--upgrade", action="store_true", help="rewrite a legacy F8X13 atlas as FGATLAS1")
    a = ap.parse_args()
    cell = tuple(int(v) for v in a.cell.lower().split("x")) if a.cell else (8, LEGACY_H)
    if a.size is None:
        a.size = cell[1]
    if a.upgrade:
        if not a.out:
            raise SystemExit("OUT.bin is required")
        upgrade(a.font, a.out)
    elif a.check_legacy:
        sys.exit(check_legacy(a.font, a.check_legacy, a.baseline, a.bold_px))
    elif a.show:
        show(a.font, a.size, a.chars, cell, a.baseline)
    else:
        if not a.out:
            raise SystemExit("OUT.bin is required")
        data = build(a.font, a.size, a.first, a.last, cell, a.baseline, a.bold_px, a.cps_from)
        open(a.out, "wb").write(data)
        n = struct.unpack_from("<I", data, 12)[0]
        print("wrote %s (%dx%d, %d glyphs, %d bytes)" % (a.out, cell[0], cell[1], n, len(data)))
