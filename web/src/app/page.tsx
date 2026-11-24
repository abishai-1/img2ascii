import AsciiField from "@/components/AsciiField";
import Banner from "@/components/Banner";
import Converter from "@/components/Converter";
import Scramble from "@/components/Scramble";

export default function Home() {
  return (
    <>
      <AsciiField />
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-12">
          <h1 className="sr-only">ASCII: image to text art converter</h1>
          <Banner />
          <p className="mt-6 text-sm text-dim">
            <span className="text-accent">~/ascii $</span>{" "}
            <Scramble
              text="turn any image into text art. runs in your browser, nothing is uploaded."
              delay={700}
              duration={900}
              blankBefore
            />
            <span className="cursor-blink text-accent">█</span>
          </p>
        </header>

        <Converter />

        <footer className="mt-16 text-[11px] text-dim">
          <span className="text-accent">//</span> move your cursor · click the background
        </footer>
      </main>
    </>
  );
}
