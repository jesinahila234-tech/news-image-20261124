// news-image-20261124 — a program that draws one image summing up the world
// news of Tuesday 24 November 2026, and writes it to /output/entry.png.
//
// It draws everything itself: a newspaper front page rendered with a small
// built-in 5x7 bitmap font, flat vector shapes and a hand-rolled PNG encoder,
// using only the Node standard library (node:fs, node:path, node:zlib,
// node:buffer). No network, no assets, no copied image.
//
// Run it:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows of 5 bits, written as hex numbers.
// ---------------------------------------------------------------------------
type Glyph = [number, number, number, number, number, number, number];

const FONT: Record<string, Glyph> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f],
  '3': [0x1e, 0x01, 0x01, 0x0e, 0x01, 0x01, 0x1e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  '-': [0, 0, 0, 0x0e, 0, 0, 0],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  '?': [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  '%': [0x19, 0x1a, 0x02, 0x04, 0x08, 0x0b, 0x13],
  '&': [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  '/': [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '+': [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ';': [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  '=': [0, 0, 0x1f, 0, 0x1f, 0, 0],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  '\u2022': [0, 0, 0x0c, 0x0c, 0x0c, 0, 0],
  '"': [0x0a, 0x0a, 0x0a, 0, 0, 0, 0],
  '\u00d7': [0, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0],
  '\u2192': [0, 0x04, 0x02, 0x1f, 0x02, 0x04, 0],
  '\u2013': [0, 0, 0, 0x0e, 0, 0, 0],
  '\u2014': [0, 0, 0, 0x1f, 0, 0, 0],
  '\u2019': [0x04, 0x04, 0x08, 0, 0, 0, 0],
};

const BLANK: Glyph = [0, 0, 0, 0, 0, 0, 0];

// ---------------------------------------------------------------------------
// Canvas: an RGB pixel buffer with flat-shape and bitmap-text drawing.
// ---------------------------------------------------------------------------
type RGB = [number, number, number];

class Canvas {
  readonly w: number;
  readonly h: number;
  readonly px: Uint8Array;

  constructor(w: number, h: number, bg: RGB) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      this.px[i * 3] = bg[0];
      this.px[i * 3 + 1] = bg[1];
      this.px[i * 3 + 2] = bg[2];
    }
  }

  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.px[i] = c[0];
    this.px[i + 1] = c[1];
    this.px[i + 2] = c[2];
  }

  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.set(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  circle(cx: number, cy: number, r: number, c: RGB): void {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r) this.set(cx + x, cy + y, c);
      }
    }
  }

  ring(cx: number, cy: number, r: number, t: number, c: RGB): void {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        const d = Math.sqrt(x * x + y * y);
        if (d <= r && d > r - t) this.set(cx + x, cy + y, c);
      }
    }
  }

  // Filled triangle (scanline).
  tri(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, c: RGB): void {
    const minX = Math.max(0, Math.min(ax, bx, cx));
    const maxX = Math.min(this.w - 1, Math.max(ax, bx, cx));
    const minY = Math.max(0, Math.min(ay, by, cy));
    const maxY = Math.min(this.h - 1, Math.max(ay, by, cy));
    const d = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (d === 0) return;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const w0 = ((bx - x) * (cy - y) - (by - y) * (cx - x)) / d;
        const w1 = ((cx - x) * (ay - y) - (cy - y) * (ax - x)) / d;
        const w2 = 1 - w0 - w1;
        if (w0 >= 0 && w1 >= 0 && w2 >= 0) this.set(x, y, c);
      }
    }
  }

  // Starburst (explosion) centred at (cx, cy).
  burst(cx: number, cy: number, rOuter: number, rInner: number, points: number, c: RGB): void {
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const a = (Math.PI * i) / points - Math.PI / 2;
      const x = Math.round(cx + r * Math.cos(a));
      const y = Math.round(cy + r * Math.sin(a));
      const a2 = (Math.PI * (i + 1)) / points - Math.PI / 2;
      const r2 = (i + 1) % 2 === 0 ? rOuter : rInner;
      const x2 = Math.round(cx + r2 * Math.cos(a2));
      const y2 = Math.round(cy + r2 * Math.sin(a2));
      this.tri(cx, cy, x, y, x2, y2, c);
    }
  }

  // --- bitmap text ---------------------------------------------------------
  textWidth(s: string, scale: number): number {
    return s.length * 6 * scale - scale;
  }

  text(s: string, x: number, y: number, scale: number, c: RGB): void {
    let cx = x;
    for (const ch of s.toUpperCase()) {
      const g = FONT[ch] ?? BLANK;
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if ((g[row] >> (4 - col)) & 1) {
            this.rect(cx + col * scale, y + row * scale, scale, scale, c);
          }
        }
      }
      cx += 6 * scale;
    }
  }

  textCentered(s: string, cx: number, y: number, scale: number, c: RGB): void {
    this.text(s, cx - Math.floor(this.textWidth(s, scale) / 2), y, scale, c);
  }

  // Word-wrap `s` to lines of at most maxW pixels at the given scale.
  wrap(s: string, scale: number, maxW: number): string[] {
    const words = s.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const trial = cur === '' ? w : cur + ' ' + w;
      if (this.textWidth(trial, scale) <= maxW || cur === '') {
        cur = trial;
      } else {
        lines.push(cur);
        cur = w;
      }
    }
    if (cur !== '') lines.push(cur);
    return lines;
  }

  para(lines: string[], x: number, y: number, scale: number, c: RGB, lh: number): void {
    let yy = y;
    for (const ln of lines) {
      this.text(ln, x, yy, scale, c);
      yy += lh;
    }
  }
}

// ---------------------------------------------------------------------------
// Minimal PNG encoder: 8-bit RGB, filter 0, zlib deflate.
// ---------------------------------------------------------------------------
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePNG(cv: Canvas): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(cv.w, 0);
  ihdr.writeUInt32BE(cv.h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((cv.w * 3 + 1) * cv.h);
  for (let y = 0; y < cv.h; y++) {
    raw[y * (cv.w * 3 + 1)] = 0;
    Buffer.from(cv.px.buffer, cv.px.byteOffset + y * cv.w * 3, cv.w * 3).copy(
      raw,
      y * (cv.w * 3 + 1) + 1,
    );
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Palette and page layout: a newspaper front page, 1024 x 1024.
// ---------------------------------------------------------------------------
const PAPER: RGB = [0xf8, 0xf4, 0xe9];
const INK: RGB = [0x16, 0x26, 0x4c]; // navy
const INK_SOFT: RGB = [0x3d, 0x4a, 0x66];
const GOLD: RGB = [0xc9, 0xa2, 0x27];
const RED: RGB = [0xb3, 0x27, 0x1e];
const GREEN: RGB = [0x2e, 0x7d, 0x32];
const CHIP: RGB = [0x76, 0xb9, 0x00];
const TEAL: RGB = [0x0f, 0x76, 0x6e];
const ORANGE: RGB = [0xc2, 0x41, 0x0c];
const BLUE: RGB = [0x1d, 0x4e, 0xd8];
const GREY: RGB = [0x6b, 0x72, 0x80];
const WHITE: RGB = [0xff, 0xff, 0xff];
const PANEL: RGB = [0xff, 0xfd, 0xf6];

const W = 1024;
const H = 1024;
const M = 28; // outer margin

function drawChip(cv: Canvas, x: number, y: number, s: number): void {
  // A computer chip, s = body size in px.
  const pin = Math.max(4, Math.round(s / 12));
  const gap = Math.max(6, Math.round(s / 7));
  for (let i = 0; i < 4; i++) {
    const p = gap + i * gap;
    cv.rect(x + p, y - pin, pin, pin, GREY);
    cv.rect(x + p, y + s, pin, pin, GREY);
    cv.rect(x - pin, y + p, pin, pin, GREY);
    cv.rect(x + s, y + p, pin, pin, GREY);
  }
  cv.rect(x, y, s, s, GREEN);
  cv.rect(x + Math.round(s * 0.18), y + Math.round(s * 0.18), Math.round(s * 0.64), Math.round(s * 0.64), CHIP);
  cv.rect(x + Math.round(s * 0.32), y + Math.round(s * 0.32), Math.round(s * 0.36), Math.round(s * 0.36), GREEN);
}

function drawSatellite(cv: Canvas, x: number, y: number, s: number): void {
  // s = width of the whole drawing.
  const bw = Math.round(s * 0.34);
  const bh = Math.round(s * 0.3);
  const bx = x + Math.round((s - bw) / 2);
  const by = y + Math.round(s * 0.3);
  cv.rect(x + 4, by + 6, Math.round(s * 0.24), Math.round(s * 0.2), BLUE);
  cv.rect(x + s - 4 - Math.round(s * 0.24), by + 6, Math.round(s * 0.24), Math.round(s * 0.2), BLUE);
  cv.rect(bx, by, bw, bh, INK);
  cv.rect(bx + 4, by + 4, bw - 8, Math.round(bh * 0.4), GOLD);
  cv.line(bx + Math.round(bw / 2), by, bx + Math.round(bw / 2), by - Math.round(s * 0.16), RED);
  cv.circle(bx + Math.round(bw / 2), by - Math.round(s * 0.18), Math.max(3, Math.round(s * 0.04)), RED);
  cv.burst(x + s - 8, y + 8, Math.round(s * 0.12), Math.round(s * 0.05), 8, RED);
}

function drawShip(cv: Canvas, x: number, y: number, s: number): void {
  const hy = y + Math.round(s * 0.52);
  cv.rect(x + Math.round(s * 0.42), y + Math.round(s * 0.12), Math.round(s * 0.1), Math.round(s * 0.4), GREY);
  cv.rect(x + Math.round(s * 0.3), y + Math.round(s * 0.3), Math.round(s * 0.4), Math.round(s * 0.24), INK);
  cv.tri(x + 4, hy, x + s - 4, hy, x + s - Math.round(s * 0.16), hy + Math.round(s * 0.22), INK);
  cv.tri(x + 4, hy, x + s - Math.round(s * 0.16), hy + Math.round(s * 0.22), x + Math.round(s * 0.14), hy + Math.round(s * 0.22), INK);
  cv.burst(x + Math.round(s * 0.78), y + Math.round(s * 0.3), Math.round(s * 0.2), Math.round(s * 0.09), 8, ORANGE);
  for (let i = 0; i < 3; i++) {
    const wy = hy + Math.round(s * 0.3) + i * Math.round(s * 0.07);
    cv.line(x + 6 + i * 8, wy, x + s - 6 - i * 8, wy, BLUE);
  }
}

function drawBlast(cv: Canvas, x: number, y: number, s: number): void {
  // City buildings with an explosion above them.
  const bw = Math.round(s / 3);
  cv.rect(x + 2, y + Math.round(s * 0.5), bw - 6, Math.round(s * 0.5), INK_SOFT);
  cv.rect(x + bw, y + Math.round(s * 0.34), bw - 6, Math.round(s * 0.66), INK);
  cv.rect(x + 2 * bw, y + Math.round(s * 0.58), bw - 6, Math.round(s * 0.42), INK_SOFT);
  cv.burst(x + Math.round(s * 0.5), y + Math.round(s * 0.26), Math.round(s * 0.3), Math.round(s * 0.14), 10, ORANGE);
  cv.burst(x + Math.round(s * 0.5), y + Math.round(s * 0.26), Math.round(s * 0.17), Math.round(s * 0.08), 8, GOLD);
}

function drawTanker(cv: Canvas, x: number, y: number, s: number): void {
  const hy = y + Math.round(s * 0.5);
  cv.rect(x + Math.round(s * 0.1), y + Math.round(s * 0.3), Math.round(s * 0.2), Math.round(s * 0.2), RED);
  cv.rect(x + Math.round(s * 0.32), y + Math.round(s * 0.3), Math.round(s * 0.2), Math.round(s * 0.2), GOLD);
  cv.rect(x + Math.round(s * 0.54), y + Math.round(s * 0.3), Math.round(s * 0.2), Math.round(s * 0.2), TEAL);
  cv.tri(x + 4, hy, x + s - 4, hy, x + s - Math.round(s * 0.14), hy + Math.round(s * 0.22), INK);
  cv.tri(x + 4, hy, x + s - Math.round(s * 0.14), hy + Math.round(s * 0.22), x + Math.round(s * 0.12), hy + Math.round(s * 0.22), INK);
  // A naval mine: spiked circle.
  const mx = x + Math.round(s * 0.82);
  const my = y + Math.round(s * 0.16);
  cv.circle(mx, my, Math.round(s * 0.09), INK);
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * i) / 4;
    cv.line(mx, my, Math.round(mx + Math.cos(a) * s * 0.14), Math.round(my + Math.sin(a) * s * 0.14), INK);
  }
  for (let i = 0; i < 2; i++) {
    const wy = hy + Math.round(s * 0.3) + i * Math.round(s * 0.07);
    cv.line(x + 6 + i * 8, wy, x + s - 6 - i * 8, wy, BLUE);
  }
}

function drawFactory(cv: Canvas, x: number, y: number, s: number): void {
  const by = y + Math.round(s * 0.55);
  cv.rect(x + Math.round(s * 0.62), y + Math.round(s * 0.08), Math.round(s * 0.12), Math.round(s * 0.5), GREY);
  cv.rect(x + 4, by, Math.round(s * 0.72), Math.round(s * 0.4), INK);
  cv.tri(x + 4, by, x + Math.round(s * 0.26), by, x + Math.round(s * 0.26), by - Math.round(s * 0.16), RED);
  cv.tri(x + Math.round(s * 0.26), by, x + Math.round(s * 0.5), by, x + Math.round(s * 0.5), by - Math.round(s * 0.16), RED);
  cv.tri(x + Math.round(s * 0.5), by, x + Math.round(s * 0.74), by, x + Math.round(s * 0.74), by - Math.round(s * 0.16), RED);
  // Flame.
  cv.tri(x + Math.round(s * 0.3), y + Math.round(s * 0.42), x + Math.round(s * 0.44), y + Math.round(s * 0.42), x + Math.round(s * 0.37), y + Math.round(s * 0.08), ORANGE);
  cv.tri(x + Math.round(s * 0.52), y + Math.round(s * 0.42), x + Math.round(s * 0.62), y + Math.round(s * 0.42), x + Math.round(s * 0.57), y + Math.round(s * 0.18), GOLD);
}

// A small story panel: coloured top bar, icon on the left, kicker, headline,
// one short summary. Returns nothing; draws inside (x, y, w, h).
function panel(
  cv: Canvas,
  x: number,
  y: number,
  w: number,
  h: number,
  bar: RGB,
  kicker: string,
  headline: string,
  summary: string,
  icon: (cv: Canvas, x: number, y: number, s: number) => void,
): void {
  cv.rect(x, y, w, h, PANEL);
  cv.rect(x, y, w, 5, bar);
  cv.rect(x, y, w, 1, INK);
  cv.rect(x, y + h - 1, w, 1, INK);
  cv.rect(x, y, 1, h, INK);
  cv.rect(x + w - 1, y, 1, h, INK);
  const iw = 108;
  icon(cv, x + 14, y + 26, iw);
  const tx = x + 14 + iw + 12;
  const tw = x + w - 14 - tx;
  cv.text(kicker, tx, y + 14, 2, RED);
  const head = cv.wrap(headline, 3, tw);
  cv.para(head, tx, y + 36, 3, INK, 24);
  const sum = cv.wrap(summary, 2, tw).slice(0, 3);
  cv.para(sum, tx, y + 36 + head.length * 24 + 6, 2, INK_SOFT, 16);
}

function buildPage(): Canvas {
  const cv = new Canvas(W, H, PAPER);
  // Outer frame.
  cv.rect(M - 8, M - 8, W - 2 * (M - 8), H - 2 * (M - 8), INK);
  cv.rect(M - 4, M - 4, W - 2 * (M - 4), H - 2 * (M - 4), PAPER);

  // Masthead.
  cv.rect(M, M, W - 2 * M, 150, INK);
  cv.textCentered('THE WORLD', W / 2, M + 22, 9, PAPER);
  cv.rect(M + 90, M + 96, W - 2 * M - 180, 3, GOLD);
  cv.textCentered('TUESDAY, 24 NOVEMBER 2026', W / 2, M + 112, 3, GOLD);

  // Strap line.
  cv.textCentered("THE DAY'S WORLD NEWS — IN ONE PAGE", W / 2, M + 164, 2, INK);

  // Hero story: Nvidia brings back its founder.
  const hy = M + 196;
  const hh = 256;
  cv.rect(M, hy, W - 2 * M, hh, PANEL);
  cv.rect(M, hy, W - 2 * M, 5, GREEN);
  cv.rect(M, hy, W - 2 * M, 1, INK);
  cv.rect(M, hy + hh - 1, W - 2 * M, 1, INK);
  cv.rect(M, hy, 1, hh, INK);
  cv.rect(M + W - 2 * M - 1, hy, 1, hh, INK);
  drawChip(cv, M + 46, hy + 62, 150);
  cv.text('+31%', M + 46, hy + 224, 3, RED);
  const hx = M + 260;
  cv.text('TECHNOLOGY  •  MARKETS', hx, hy + 24, 2, RED);
  cv.text('HUANG IS BACK', hx, hy + 52, 5, INK);
  cv.text('AT NVIDIA', hx, hy + 100, 5, INK);
  const heroSum = cv.wrap(
    'Founder Jensen Huang is reinstated as chief executive days after resigning — shares jump 31% in a day, adding over $900 billion in value.',
    2,
    W - 2 * M - 260 - 40,
  );
  cv.para(heroSum, hx, hy + 158, 2, INK_SOFT, 17);

  // Grid of five more stories plus an "also today" panel.
  const gy = hy + hh + 14;
  const gw = Math.floor((W - 2 * M - 14) / 2);
  const gh = 148;
  panel(cv, M, gy, gw, gh, BLUE, 'SPACE', 'NUCLEAR SHADOW IN ORBIT',
    'NATO vows to defend space. Russia may launch a nuclear-armed satellite soon.', drawSatellite);
  panel(cv, M + gw + 14, gy, gw, gh, INK, 'UKRAINE  •  LIBYA', 'WARSHIP HIT OFF LIBYA',
    'Ukraine says naval drones hit the Russian corvette Merkury at Benghazi.', drawShip);
  panel(cv, M, gy + gh + 12, gw, gh, ORANGE, 'GAZA', 'HAMAS SECURITY CHIEF KILLED',
    'Israeli airstrikes in Gaza City kill Naeem Abu Nahel and six others.', drawBlast);
  panel(cv, M + gw + 14, gy + gh + 12, gw, gh, TEAL, 'STRAIT OF HORMUZ', 'MINES HIT TANKERS IN HORMUZ',
    'Iran says three tankers struck mines and caught fire; talks refused.', drawTanker);
  panel(cv, M, gy + 2 * (gh + 12), gw, gh, RED, 'INDONESIA', 'FACTORY FIRE KILLS 26',
    'Blaze at a factory in Banten kills 26; dozens still missing.', drawFactory);

  // Also-today panel (text only).
  const ax = M + gw + 14;
  const ay = gy + 2 * (gh + 12);
  cv.rect(ax, ay, gw, gh, PANEL);
  cv.rect(ax, ay, gw, 5, GOLD);
  cv.rect(ax, ay, gw, 1, INK);
  cv.rect(ax, ay + gh - 1, gw, 1, INK);
  cv.rect(ax, ay, 1, gh, INK);
  cv.rect(ax + gw - 1, ay, 1, gh, INK);
  cv.text('ALSO TODAY', ax + 16, ay + 14, 2, RED);
  const also = [
    '• SPAIN AMNESTIES PUIGDEMONT',
    '• PAKISTAN ASTRONAUT JOINS',
    '  CHINA SPACE STATION',
    '• NEPAL QUAKE 5.6 NEAR',
    '  CHINA BORDER',
  ];
  cv.para(also, ax + 16, ay + 38, 2, INK, 20);

  // Footer.
  cv.textCentered('24 NOVEMBER 2026  •  THE WORLD IN ONE PAGE', W / 2, H - M - 22, 2, INK_SOFT);
  return cv;
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  const png = encodePNG(buildPage());
  writeFileSync(join(outDir, 'entry.png'), png);
  console.log(`wrote entry.png (${png.length} bytes)`);
}

main();
