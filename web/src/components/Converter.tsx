"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CHARSETS,
  DEFAULT_METRICS,
  convert,
  makeSample,
  measureCell,
  prepareSource,
  type CellMetrics,
  type CharsetName,
} from "@/lib/ascii";
import AsciiCanvas, { type ColorMode } from "./AsciiCanvas";
import Panel from "./Panel";
import Scramble from "./Scramble";

const CHARSET_NAMES = Object.keys(CHARSETS) as CharsetName[];
const COLOR_MODES: readonly ColorMode[] = ["color", "mono", "phosphor"];

function bar(v: number, min: number, max: number, len = 14) {
  const filled = Math.round(((v - min) / (max - min)) * len);
  return "█".repeat(filled) + "·".repeat(len - filled);
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = String,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-dim">{label}</span>
        <span className="tabular-nums">
          <span aria-hidden="true" className="mr-2 text-accent/60">
            {bar(value, min, max)}
          </span>
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full"
      />
    </label>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs text-dim">{label}</div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {options.map((o) => {
          const on = o === value;
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o)}
              className={`border px-2 py-1 text-xs transition-colors ${
                on
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line text-dim hover:border-dim hover:text-fg"
              }`}
            >
              {on ? `[${o}]` : ` ${o} `}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group border border-line px-3 py-2 text-xs text-fg transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
    >
      <span className="text-dim group-hover:text-accent">&gt; </span>
      {children}
    </button>
  );
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Converter() {
  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  const [fileName, setFileName] = useState("sample.png");
  const [revealKey, setRevealKey] = useState(0);
  const [metrics, setMetrics] = useState<CellMetrics>(DEFAULT_METRICS);

  const [cols, setCols] = useState(120);
  const [charset, setCharset] = useState<CharsetName>("standard");
  const [custom, setCustom] = useState("");
  const [invert, setInvert] = useState(false);
  const [contrast, setContrast] = useState(1.2);
  const [brightness, setBrightness] = useState(1);
  const [colorMode, setColorMode] = useState<ColorMode>("color");

  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragDepth = useRef(0);

  // Measure the font first, then load the demo image so the intro reveal
  // isn't interrupted by a metrics change.
  useEffect(() => {
    let alive = true;
    measureCell().then((m) => {
      if (!alive) return;
      setMetrics(m);
      setSource(makeSample());
      setRevealKey((k) => k + 1);
    });
    return () => {
      alive = false;
    };
  }, []);

  const loadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError(`"${file.name}" isn't an image`);
      return;
    }
    try {
      const bmp = await createImageBitmap(file);
      const src = prepareSource(bmp, bmp.width, bmp.height);
      bmp.close();
      setSource(src);
      setFileName(file.name);
      setError(null);
      setRevealKey((k) => k + 1);
    } catch {
      setError(`couldn't read "${file.name}"`);
    }
  }, []);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) =>
        x.type.startsWith("image/"),
      );
      if (f) void loadFile(f);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [loadFile]);

  const ramp = Array.from(custom).length >= 2 ? custom : CHARSETS[charset];

  const result = useMemo(
    () =>
      source
        ? convert(source, {
            cols,
            ramp,
            invert,
            contrast,
            brightness,
            cellAspect: metrics.aspect,
          })
        : null,
    [source, cols, ramp, invert, contrast, brightness, metrics.aspect],
  );

  const base = fileName.replace(/\.[^.]+$/, "") || "ascii";

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setError("clipboard access was blocked by the browser");
    }
  };

  const saveTxt = () => {
    if (result) downloadBlob(new Blob([result.text + "\n"], { type: "text/plain" }), `${base}.txt`);
  };

  const savePng = () => {
    canvasRef.current?.toBlob((b) => b && downloadBlob(b, `${base}-ascii.png`), "image/png");
  };

  return (
    <div
      className="relative grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]"
      onDragEnter={(e) => {
        e.preventDefault();
        dragDepth.current++;
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) void loadFile(f);
      }}
    >
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-bg/80 backdrop-blur-sm">
          <div className="border border-dashed border-accent px-10 py-8 text-accent">
            <Scramble text="[ release to convert ]" duration={400} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
        <Panel title="input">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="group w-full border border-dashed border-line px-4 py-6 text-center transition-colors hover:border-accent"
          >
            <div className="text-sm text-fg group-hover:text-accent">[ drop an image ]</div>
            <div className="mt-1 text-xs text-dim">click to browse · or paste with ctrl+v</div>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void loadFile(f);
              e.target.value = "";
            }}
          />
          <div className="mt-3 truncate text-xs text-dim">
            <span className="text-accent">$</span> {fileName}
          </div>
          {error && <div className="mt-2 text-xs text-red-400">! {error}</div>}
        </Panel>

        <Panel title="settings">
          <div className="flex flex-col gap-5">
            <Slider label="width" value={cols} min={20} max={240} step={1} onChange={setCols} format={(v) => `${v} col`} />
            <Slider label="contrast" value={contrast} min={0.5} max={3} step={0.05} onChange={setContrast} format={(v) => v.toFixed(2)} />
            <Slider label="brightness" value={brightness} min={0.4} max={2} step={0.05} onChange={setBrightness} format={(v) => v.toFixed(2)} />
            <Segmented label="charset" options={CHARSET_NAMES} value={charset} onChange={(v) => { setCharset(v); setCustom(""); }} />
            <label className="block">
              <div className="mb-1.5 text-xs text-dim">custom ramp (dense → light)</div>
              <input
                type="text"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder={CHARSETS[charset]}
                spellCheck={false}
                className="w-full border border-line bg-bg/60 px-2 py-1.5 text-xs text-fg outline-none placeholder:text-dim/60 focus:border-accent"
              />
            </label>
            <Segmented label="color" options={COLOR_MODES} value={colorMode} onChange={setColorMode} />
            <button
              type="button"
              aria-pressed={invert}
              onClick={() => setInvert((v) => !v)}
              className="self-start text-xs text-dim hover:text-fg"
            >
              <span className={invert ? "text-accent" : ""}>{invert ? "[x]" : "[ ]"}</span> invert
              <span className="text-dim/70"> (for light backgrounds)</span>
            </button>
          </div>
        </Panel>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <Panel
          title="output"
          aside={result && <span className="tabular-nums">{result.cols}×{result.rows}</span>}
        >
          <div className="overflow-hidden border border-line" style={{ background: "#0a0d12" }}>
            {result ? (
              <AsciiCanvas
                result={result}
                metrics={metrics}
                mode={colorMode}
                revealKey={revealKey}
                canvasRef={canvasRef}
              />
            ) : (
              <div className="grid aspect-[4/3] place-items-center text-xs text-dim">
                <span>
                  booting<span className="cursor-blink">_</span>
                </span>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn onClick={copy} disabled={!result}>
              {copied ? <Scramble text="copied ✓" duration={250} /> : "copy text"}
            </Btn>
            <Btn onClick={saveTxt} disabled={!result}>download .txt</Btn>
            <Btn onClick={savePng} disabled={!result}>download .png</Btn>
          </div>
          <p className="mt-3 text-[11px] text-dim">
            copy / .txt is plain text: color only exists in the .png.
          </p>
        </Panel>

        <div className="truncate text-[11px] text-dim">
          <span className="text-accent">&gt;</span>{" "}
          {result
            ? `${fileName} → ${result.cols}×${result.rows} (${(result.cols * result.rows).toLocaleString()} chars) · ramp "${ramp}"`
            : "waiting for input"}
          <span className="cursor-blink text-accent"> █</span>
        </div>
      </div>
    </div>
  );
}
