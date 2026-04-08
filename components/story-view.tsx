"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { AmbientBackground } from "@/components/ambient-background";
import { PoodleCompanion } from "@/components/poodle-companion";
import { StoryStudio } from "@/components/story-studio";

export function StoryView() {
  const [cueKey, setCueKey] = useState(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCueKey((current) => current + 1);
    }, 30000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [cueKey]);

  return (
    <div className="relative h-screen overflow-y-auto overflow-x-hidden">
      <AmbientBackground pageIndex={0} />

      <div className="relative z-10 min-h-screen px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        <div className="mx-auto max-w-6xl">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="glass-panel mb-6 rounded-[2rem] p-5 sm:mb-8 sm:p-7"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-[#cad6ff]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Mobile-first bedtime setup
                </div>
                <h1 className="mt-4 text-3xl font-semibold leading-tight text-[#f7eddc] sm:text-5xl">
                  Start here. Tell tonight&apos;s story before anything else.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[#dfe5ff] sm:text-base">
                  The story form is directly below on mobile and desktop. Mono stays
                  center stage in the story, and Luffy stays as the quiet corner cue.
                </p>
              </div>

              <a
                href="#story-studio"
                className="glass-button inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-semibold text-[#f7eddc]"
              >
                Go to story input
              </a>
            </div>
          </motion.section>

          <section id="story-studio" className="relative">
            <StoryStudio />
          </section>
        </div>
      </div>

      <PoodleCompanion cueKey={cueKey} visible />
    </div>
  );
}
