#!/usr/bin/env python3
"""Membuat ikon PWA Nusa Island (gambar asli buatan kode: pulau, laut, ikan). Jalankan: python3 scripts/make-pwa-icons.py"""
from PIL import Image, ImageDraw
import math, os
OUT = os.path.join(os.path.dirname(__file__), "..", "pwa", "icons")
S = 1024  # kanvas kerja (disusutkan agar halus)

def art(maskable):
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    # latar: gradien laut #173f50 -> #1f5f6b
    for y in range(S):
        t = y / S; c = (int(23 + 12 * t), int(63 + 38 * t), int(80 + 30 * t), 255)
        d.line([(0, y), (S, y)], fill=c)
    k = 0.66 if maskable else 0.82  # maskable: isi dalam zona aman 80%
    cx, cy = S / 2, S / 2
    def P(x, y): return (cx + (x - 0.5) * S * k, cy + (y - 0.5) * S * k)
    # matahari
    r = 0.13; sx, sy = P(0.73, 0.27)
    d.ellipse([sx - r * S * k, sy - r * S * k, sx + r * S * k, sy + r * S * k], fill=(255, 214, 102, 255))
    # pulau (bukit hijau + pasir)
    d.polygon([P(0.05, 0.62), P(0.22, 0.42), P(0.34, 0.50), P(0.48, 0.34), P(0.66, 0.62)], fill=(87, 155, 139, 255))
    d.polygon([P(0.18, 0.55), P(0.30, 0.45), P(0.40, 0.55)], fill=(49, 95, 78, 255))
    d.ellipse([*P(0.02, 0.58), *P(0.70, 0.68)], fill=(240, 214, 160, 255))
    # laut
    d.rectangle([0, P(0, 0.63)[1], S, S], fill=(31, 111, 128, 255))
    for i, yy in enumerate((0.70, 0.80)):
        pts = [P(0.05 + j * 0.02, yy + 0.018 * math.sin(j * 0.9 + i)) for j in range(0, 48)]
        d.line(pts, fill=(169, 219, 192, 255), width=int(S * 0.012))
    # ikan (badan, ekor, mata) melompat
    fx, fy = 0.60, 0.80
    body = [P(fx + 0.30 * math.cos(a) * 0.5 + 0.0, fy + 0.13 * math.sin(a) * 0.5) for a in [i * math.pi / 18 for i in range(36)]]
    d.polygon(body, fill=(255, 140, 90, 255))
    d.polygon([P(fx - 0.14, fy), P(fx - 0.27, fy - 0.08), P(fx - 0.27, fy + 0.08)], fill=(255, 112, 67, 255))
    ex, ey = P(fx + 0.09, fy - 0.015); er = S * k * 0.014
    d.ellipse([ex - er, ey - er, ex + er, ey + er], fill=(23, 63, 80, 255))
    if not maskable:  # sudut membulat untuk ikon biasa (setelah semua digambar)
        m = Image.new("L", (S, S), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=255)
        out = Image.new("RGBA", (S, S), (0, 0, 0, 0)); out.paste(im, (0, 0), m); im = out
    return im

for name, size, mask in (("icon-192.png", 192, False), ("icon-512.png", 512, False), ("icon-maskable-512.png", 512, True), ("apple-touch-icon.png", 180, False)):
    im = art(mask)
    if name.startswith("apple"):  # iOS membulatkan sendiri: latar penuh
        bg = Image.new("RGB", (S, S), (23, 63, 80)); a = art(True); bg.paste(a, (0, 0), a); im = bg
    im.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name), optimize=True)
print("ikon dibuat di", os.path.abspath(OUT))
