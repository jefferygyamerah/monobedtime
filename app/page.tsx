import { MonkeyMark } from "@/components/monkey-mark";
import { StoryStudio } from "@/components/story-studio";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-[1440px] px-5 pb-20 pt-6 sm:px-8 lg:px-10">
      <section className="mb-10 grid gap-8 rounded-[44px] border border-black/8 bg-white/60 px-6 py-8 shadow-[0_30px_120px_rgba(15,23,42,0.08)] backdrop-blur-2xl lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-4">
            <MonkeyMark className="p-2.5" />
            <div className="inline-flex items-center gap-3 rounded-full border border-black/8 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-black/70 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
              monobedtime
            </div>
          </div>

          <h1 className="mt-6 text-5xl font-semibold leading-[0.94] tracking-tight text-black sm:text-6xl lg:text-7xl">
            Mono is the bedtime universe now, with glass-pane calm around every story.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-black/64">
            Monobedtime now feels lighter, calmer, and more premium. Parents can shape a bilingual bedtime story while Mono, the gentle monkey guide, turns the product into a world kids can recognize night after night.
          </p>
        </div>

        <div className="grid gap-3 self-end md:grid-cols-3 lg:grid-cols-1">
          {[
            "Mono stays central in every bedtime story",
            "Spanish, English, or bilingual stories",
            "Bright glass design with a memorable guide character",
          ].map((item) => (
            <div
              key={item}
              className="rounded-[28px] border border-black/8 bg-white/72 px-5 py-5 text-sm leading-7 text-black/68 shadow-[0_16px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <StoryStudio />
    </main>
  );
}
