import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bobby Zhang — Apple + Google Portfolio Study",
  description:
    "A local portfolio redesign study combining Apple Human Interface Guidelines with Google Material Design 3.",
};

export default function Home() {
  return (
    <main className="portfolio-shell" aria-label="Bobby Zhang portfolio">
      <iframe
        className="portfolio-frame"
        src="/portfolio/index.html"
        title="Bobby Zhang portfolio"
      />
    </main>
  );
}
