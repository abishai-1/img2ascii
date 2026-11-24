"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_GLYPHS = "!<>-_\\/[]{}=+*^?#%@$&";

interface ScrambleProps {
  text: string;
  /** ms before the first character starts resolving */
  delay?: number;
  /** ms for the resolve sweep to travel across the text */
  duration?: number;
  glyphs?: string;
  /** show nothing (instead of noise) before a character's turn */
  blankBefore?: boolean;
  replayOnHover?: boolean;
  className?: string;
}

/** Text that decodes itself from random glyphs, left to right. */
export default function Scramble({
  text,
  delay = 0,
  duration = 600,
  glyphs = DEFAULT_GLYPHS,
  blankBefore = false,
  replayOnHover = false,
  className,
}: ScrambleProps) {
  const [out, setOut] = useState(text);
  const raf = useRef(0);

  const run = useCallback(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cancelAnimationFrame(raf.current);
    const chars = Array.from(text);
    const g = Array.from(glyphs);
    const start = performance.now() + delay;
    const settle = 140; // ms each char flickers before resolving

    const tick = (now: number) => {
      const t = now - start;
      let done = true;
      const s = chars
        .map((c, i) => {
          if (c === " ") return c;
          const at = (i / Math.max(1, chars.length)) * duration;
          if (t >= at + settle) return c;
          done = false;
          if (t < at && blankBefore) return " ";
          return g[(Math.random() * g.length) | 0];
        })
        .join("");
      setOut(s);
      if (!done) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [text, delay, duration, glyphs, blankBefore]);

  useEffect(() => {
    run();
    return () => cancelAnimationFrame(raf.current);
  }, [run]);

  return (
    <span className={className} onMouseEnter={replayOnHover ? run : undefined}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{out}</span>
    </span>
  );
}
