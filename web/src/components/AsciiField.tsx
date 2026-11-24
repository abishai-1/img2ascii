"use client";

import { useEffect, useRef } from "react";

const RAMP = " .:-=+*#%@";
const FS = 14;
const FPS = 30;

/**
 * Full-page animated background: a drifting interference pattern drawn
 * entirely with characters. It glows around the cursor (in the accent
 * color) and sends out a ripple wherever you click.
 */
export default function AsciiField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const family =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-geist-mono")
        .trim() || "monospace";
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cw = FS * 0.6;
    const ch = FS * 1.15;
    let cols = 0;
    let rows = 0;
    const mouse = { x: -1e4, y: -1e4 };
    const ripples: { x: number; y: number; t: number }[] = [];
    let time = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${FS}px ${family}, monospace`;
      ctx.textBaseline = "top";
      cw = ctx.measureText("M").width || cw;
      cols = Math.ceil(innerWidth / cw) + 1;
      rows = Math.ceil(innerHeight / ch) + 1;
    };

    const frame = (t: number) => {
      const n = RAMP.length - 1;
      const k = cw / ch; // makes the glow circular despite tall cells
      ctx.clearRect(0, 0, innerWidth, innerHeight);

      for (let y = 0; y < rows; y++) {
        let base = "";
        let glow = "";
        for (let x = 0; x < cols; x++) {
          let v =
            Math.sin(x * 0.07 + t * 0.6) +
            Math.sin(y * 0.11 - t * 0.4) +
            Math.sin((x * 0.5 + y) * 0.06 + t * 0.3);
          v = (v + 3) / 6;
          v = v * v * v; // keep it sparse

          const dx = (x - mouse.x) * k;
          const dy = y - mouse.y;
          const d2 = dx * dx + dy * dy;
          let extra = 0.95 * Math.exp(-d2 / 22);
          for (const r of ripples) {
            const age = t - r.t;
            const rx = (x - r.x) * k;
            const ry = y - r.y;
            const d = Math.sqrt(rx * rx + ry * ry);
            const ring = Math.max(0, 1 - Math.abs(d - age * 20) / 1.6);
            extra += ring * Math.max(0, 1 - age / 2.2);
          }

          const c = RAMP[Math.min(n, ((v + extra) * n) | 0)];
          if (extra > 0.12) {
            base += " ";
            glow += c;
          } else {
            base += c;
            glow += " ";
          }
        }
        ctx.fillStyle = "rgba(148, 163, 184, 0.17)";
        ctx.fillText(base, 0, y * ch);
        ctx.fillStyle = "rgba(92, 242, 154, 0.55)";
        ctx.fillText(glow, 0, y * ch);
      }

      while (ripples.length && t - ripples[0].t > 2.2) ripples.shift();
    };

    resize();
    if (reduce) {
      frame(0);
      return;
    }

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX / cw;
      mouse.y = e.clientY / ch;
    };
    const onLeave = () => {
      mouse.x = mouse.y = -1e4;
    };
    const onDown = (e: PointerEvent) => {
      ripples.push({ x: e.clientX / cw, y: e.clientY / ch, t: time });
      if (ripples.length > 6) ripples.shift();
    };
    const onResize = () => resize();

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);

    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 1000 / FPS) return;
      last = now;
      time = now / 1000;
      frame(time);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <>
      <canvas
        ref={ref}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 h-full w-full"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--bg)_95%)]"
      />
    </>
  );
}
