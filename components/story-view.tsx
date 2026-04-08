"use client";

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

      <div className="relative z-10 min-h-screen px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
        <section id="story-studio" className="mx-auto max-w-6xl">
          <StoryStudio />
        </section>
      </div>

      <PoodleCompanion cueKey={cueKey} visible />
    </div>
  );
}
