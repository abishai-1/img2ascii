"use client";

import { useEffect, useRef, type RefObject } from "react";
import { cellHash, type AsciiResult, type CellMetrics } from "@/lib/ascii";

export type ColorMode = "mono" | "color" | "phosphor";

const SCALE = 2; // render at 2x for crisp display and PNG export
export const OUTPUT_BG = "#0a0d12";
const MONO = "#d6dde6";
const PHOSPHOR = "#5cf29a";
const NOISE = "!<>-_\\/[]{}=+*^?#%@";
const REVEAL_MS = 1000;
const REVEAL_END = 1.1;

/**
 * Draws the grid. `p` is reveal progress: each cell has a threshold based on
 * its row plus some noise; it's hidden before, flickers as a random glyph
 * just after, then settles to its real character. `p = null` = final frame.
 */
function draw(
  canvas: HTMLCanvasElement,
  r: AsciiResult,
  m: CellMetrics,
  mode: ColorMode,
  p: number | null,
) {
  const w = Math.ceil(r.cols * m.cellW * SCALE);
  const h = Math.ceil(r.rows * m.cellH * SCALE);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.fillStyle = OUTPUT_BG;
  ctx.fillRect(0, 0, w, h);
  ctx.font = m.font;
  ctx.textBaseline = "middle";

  const solid = mode === "mono" ? MONO : PHOSPHOR;
  const half = m.cellH / 2;
  ctx.fillStyle = solid;

  for (let y = 0; y < r.rows; y++) {
    for (let x = 0; x < r.cols; x++) {
      const i = y * r.cols + x;
      const ch = r.chars[i];
      const px = x * m.cellW;
      const py = y * m.cellH + half;

      if (p !== null) {
        const t = (y / r.rows) * 0.75 + cellHash(x, y) * 0.25;
        if (p < t) continue;
        if (p < t + 0.08) {
          ctx.fillStyle = PHOSPHOR;
          ctx.fillText(NOISE[(Math.random() * NOISE.length) | 0], px, py);
          ctx.fillStyle = solid;
          continue;
        }
      }

      if (ch === " ") continue;
      if (mode === "color") {
        ctx.fillStyle = `rgb(${r.rgb[i * 3]},${r.rgb[i * 3 + 1]},${r.rgb[i * 3 + 2]})`;
      }
      ctx.fillText(ch, px, py);
    }
  }
}

interface Props {
  result: AsciiResult | null;
  metrics: CellMetrics;
  mode: ColorMode;
  /** bump this to play the reveal animation (new image loaded) */
  revealKey: number;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export default function AsciiCanvas({ result, metrics, mode, revealKey, canvasRef }: Props) {
  const played = useRef(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !result) return;

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (played.current === revealKey || reduce) {
      played.current = revealKey;
      draw(canvas, result, metrics, mode, null);
      return;
    }
    played.current = revealKey;

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = ((now - start) / REVEAL_MS) * REVEAL_END;
      if (p >= REVEAL_END) {
        draw(canvas, result, metrics, mode, null);
        return;
      }
      draw(canvas, result, metrics, mode, p);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      // if interrupted (e.g. a slider moved), make sure the final frame shows
      draw(canvas, result, metrics, mode, null);
    };
  }, [result, metrics, mode, revealKey, canvasRef]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="ASCII art output"
      className="block h-auto w-full"
    />
  );
}
