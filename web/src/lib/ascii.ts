// Core image -> ASCII conversion. Same algorithm as cli/img2ascii.py:
// shrink the image to one pixel per character, then map each pixel's
// brightness to a character from a "ramp" ordered dense -> light.

export const CHARSETS = {
  standard: "@%#*+=-:. ",
  detailed:
    "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
  blocks: "█▓▒░ ",
  simple: "#+-. ",
  dots: "⣿⣷⣧⣇⡇⡆⡄⡀ ",
} as const;

export type CharsetName = keyof typeof CHARSETS;

export interface CellMetrics {
  font: string; // canvas font string
  cellW: number; // CSS px per character
  cellH: number; // CSS px per line
  aspect: number; // cellW / cellH: corrects for tall character cells
}

export const FONT_SIZE = 12;

export const DEFAULT_METRICS: CellMetrics = {
  font: `${FONT_SIZE}px monospace`,
  cellW: FONT_SIZE * 0.6,
  cellH: FONT_SIZE * 1.2,
  aspect: 0.5,
};

export interface AsciiOptions {
  cols: number;
  ramp: string; // dense -> light
  invert: boolean; // true = for light backgrounds
  contrast: number;
  brightness: number;
  cellAspect: number;
}

export interface AsciiResult {
  cols: number;
  rows: number;
  chars: string[]; // flat, length cols * rows
  rgb: Uint8ClampedArray; // 3 bytes per cell
  text: string; // newline-joined, for copy/download
}

/** Measure the site's monospace font so the output grid isn't stretched. */
export async function measureCell(): Promise<CellMetrics> {
  const family =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--font-geist-mono")
      .trim() || "monospace";
  const font = `${FONT_SIZE}px ${family}, monospace`;
  try {
    await document.fonts.load(font);
  } catch {
    /* fall back to whatever is available */
  }
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return DEFAULT_METRICS;
  ctx.font = font;
  const cellW = ctx.measureText("M").width || DEFAULT_METRICS.cellW;
  const cellH = FONT_SIZE * 1.2;
  return { font, cellW, cellH, aspect: cellW / cellH };
}

/**
 * Downscale a huge photo once (max 1000px wide) so every slider change
 * afterwards only resamples a small canvas. Transparent areas become black.
 */
export function prepareSource(
  img: CanvasImageSource,
  width: number,
  height: number,
): HTMLCanvasElement {
  const scale = Math.min(1, 1000 / width);
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(width * scale));
  c.height = Math.max(1, Math.round(height * scale));
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

let work: HTMLCanvasElement | null = null;

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

export function convert(src: HTMLCanvasElement, o: AsciiOptions): AsciiResult {
  const cols = Math.max(4, Math.round(o.cols));
  const rows = Math.max(
    1,
    Math.round((src.height / src.width) * cols * o.cellAspect),
  );

  work ??= document.createElement("canvas");
  work.width = cols;
  work.height = rows;
  const ctx = work.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, cols, rows);
  const px = ctx.getImageData(0, 0, cols, rows).data;

  // Ramps are dense -> light. On a dark background bright pixels should get
  // the dense characters, so reverse unless inverting for light backgrounds.
  const ramp = Array.from(o.ramp);
  if (!o.invert) ramp.reverse();
  const n = ramp.length - 1;

  const chars = new Array<string>(cols * rows);
  const rgb = new Uint8ClampedArray(cols * rows * 3);
  const lines: string[] = [];

  for (let y = 0; y < rows; y++) {
    let line = "";
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const adj = (v: number) => clamp(((v - 128) * o.contrast + 128) * o.brightness);
      const r = adj(px[i * 4]);
      const g = adj(px[i * 4 + 1]);
      const b = adj(px[i * 4 + 2]);
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const ch = ramp[Math.round((lum / 255) * n)];
      chars[i] = ch;
      rgb[i * 3] = r;
      rgb[i * 3 + 1] = g;
      rgb[i * 3 + 2] = b;
      line += ch;
    }
    lines.push(line.trimEnd());
  }

  return { cols, rows, chars, rgb, text: lines.join("\n") };
}

/** Cheap deterministic 0..1 noise per cell, used for reveal timing. */
export function cellHash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** A built-in demo image (a ringed planet over mountains) so the page isn't empty. */
export function makeSample(): HTMLCanvasElement {
  const W = 800;
  const H = 560;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;

  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#04050d");
  sky.addColorStop(1, "#24103d");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 140; i++) {
    g.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.65})`;
    const s = rnd() < 0.15 ? 4 : 2;
    g.fillRect(rnd() * W, rnd() * H * 0.7, s, s);
  }

  const cx = 400;
  const cy = 240;
  const r = 150;
  const ring = (start: number, end: number) => {
    g.save();
    g.translate(cx, cy);
    g.rotate(-0.28);
    g.strokeStyle = "rgba(125, 211, 252, 0.9)";
    g.lineWidth = 16;
    g.beginPath();
    g.ellipse(0, 0, 270, 58, 0, start, end);
    g.stroke();
    g.restore();
  };

  ring(Math.PI, Math.PI * 2); // back half
  const planet = g.createRadialGradient(cx - 55, cy - 65, 8, cx, cy, r);
  planet.addColorStop(0, "#fff7dc");
  planet.addColorStop(0.3, "#ffb347");
  planet.addColorStop(0.72, "#c2410c");
  planet.addColorStop(1, "#2a0a05");
  g.fillStyle = planet;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  ring(0, Math.PI); // front half

  g.fillStyle = "#0a0614";
  g.beginPath();
  g.moveTo(0, H);
  let x = 0;
  let y = 460;
  while (x <= W) {
    g.lineTo(x, y);
    x += 40 + rnd() * 50;
    y = 400 + rnd() * 110;
  }
  g.lineTo(W, H);
  g.closePath();
  g.fill();

  return c;
}
