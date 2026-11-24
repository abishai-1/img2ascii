import type { ReactNode } from "react";
import Scramble from "./Scramble";

/** A terminal-style box with its title cut into the top border. */
export default function Panel({
  title,
  aside,
  children,
  className = "",
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative border border-line bg-panel/75 p-4 pt-6 backdrop-blur-sm ${className}`}
    >
      <h2 className="absolute -top-2.5 left-3 bg-bg px-1.5 text-[11px] uppercase tracking-[0.2em] text-dim">
        <span className="text-accent">┌ </span>
        <Scramble text={title} replayOnHover />
        <span className="text-accent"> ┐</span>
      </h2>
      {aside && (
        <div className="absolute -top-2.5 right-3 bg-bg px-1.5 text-[11px] text-dim">
          {aside}
        </div>
      )}
      {(["-left-px -top-px", "-right-px -top-px", "-left-px -bottom-px", "-right-px -bottom-px"] as const).map(
        (pos) => (
          <span
            key={pos}
            aria-hidden="true"
            className={`absolute ${pos} size-1.5 bg-accent/70`}
          />
        ),
      )}
      {children}
    </section>
  );
}
