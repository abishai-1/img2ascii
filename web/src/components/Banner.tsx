import Scramble from "./Scramble";

const LINES = [
  " █████╗ ███████╗ ██████╗██╗██╗",
  "██╔══██╗██╔════╝██╔════╝██║██║",
  "███████║███████╗██║     ██║██║",
  "██╔══██║╚════██║██║     ██║██║",
  "██║  ██║███████║╚██████╗██║██║",
  "╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝╚═╝",
];

export default function Banner() {
  return (
    <pre
      aria-hidden="true"
      className="font-banner select-none text-[clamp(8px,2.4vw,16px)] leading-none text-accent [text-shadow:0_0_14px_rgba(92,242,154,0.35)]"
    >
      {LINES.map((line, i) => (
        <Scramble
          key={i}
          text={line}
          delay={150 + i * 90}
          duration={900}
          glyphs="░▒▓█"
          blankBefore
          className="block"
        />
      ))}
    </pre>
  );
}
