"use client";

import { motion } from "framer-motion";
import { Building2, Flame, Trees, Volume2, Waves } from "lucide-react";
import type { ReactNode } from "react";
import type { Soundscape } from "@/components/use-bedtime-audio";

const soundscapeMeta: Record<
  Soundscape,
  {
    label: string;
    icon: ReactNode;
    blurb: string;
    detail: string;
    gradient: string;
  }
> = {
  forest: {
    label: "Forest",
    icon: <Trees className="h-4 w-4" />,
    blurb: "canopy air",
    detail: "Leaves, distance, and slow green hush.",
    gradient:
      "linear-gradient(145deg, rgba(42,92,72,0.82), rgba(9,26,22,0.94)), radial-gradient(circle at top right, rgba(181,255,212,0.22), transparent 40%)",
  },
  sea: {
    label: "Sea",
    icon: <Waves className="h-4 w-4" />,
    blurb: "slow surf",
    detail: "Moonlit water and long, low shore wash.",
    gradient:
      "linear-gradient(145deg, rgba(38,89,130,0.84), rgba(6,20,35,0.95)), radial-gradient(circle at top right, rgba(174,233,255,0.22), transparent 42%)",
  },
  city: {
    label: "City",
    icon: <Building2 className="h-4 w-4" />,
    blurb: "night hush",
    detail: "A distant skyline with softened night motion.",
    gradient:
      "linear-gradient(145deg, rgba(72,73,106,0.84), rgba(10,14,28,0.96)), radial-gradient(circle at top right, rgba(255,199,153,0.18), transparent 42%)",
  },
  fire: {
    label: "Fire",
    icon: <Flame className="h-4 w-4" />,
    blurb: "soft crackle",
    detail: "Warm glow, gentle sparks, and fireplace calm.",
    gradient:
      "linear-gradient(145deg, rgba(132,63,26,0.86), rgba(22,12,8,0.96)), radial-gradient(circle at top right, rgba(255,214,155,0.26), transparent 44%)",
  },
};

export function SoundDock({
  activeSoundscape,
  onSelectSoundscape,
  compact = false,
}: {
  activeSoundscape: Soundscape | null;
  onSelectSoundscape: (soundscape: Soundscape) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-[1.8rem] border border-white/14 bg-[#09111f]/84 p-4 shadow-[0_22px_70px_rgba(2,6,23,0.42)] ${
        compact ? "" : "sm:p-5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[#a5c2ff]">
            <Volume2 className="h-3.5 w-3.5" />
            Night sounds
          </div>
          <p className="mt-3 max-w-[34rem] text-sm leading-6 text-white/80">
            Pick a room tone the way you would pick a featured title. Sound starts after your first tap,
            then stays with you through setup, story creation, and reading.
          </p>
        </div>
        <div className="rounded-full border border-white/12 bg-white/6 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/78">
          {activeSoundscape ? `${soundscapeMeta[activeSoundscape].label} on` : "Silence"}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(soundscapeMeta) as Soundscape[]).map((soundscape) => {
          const item = soundscapeMeta[soundscape];
          const selected = activeSoundscape === soundscape;

          return (
            <motion.button
              key={soundscape}
              type="button"
              onClick={() => onSelectSoundscape(soundscape)}
              whileTap={{ scale: 0.98 }}
              className={`group relative overflow-hidden rounded-[1.45rem] border p-4 text-left transition ${
                selected
                  ? "border-[#ffd59c]/36 text-[#fff2dc] shadow-[0_18px_38px_rgba(255,194,138,0.14)]"
                  : "border-white/12 text-white/90 hover:border-white/18"
              }`}
              style={{
                background: item.gradient,
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0)_35%,rgba(2,6,23,0.34)_100%)]" />
              <div className="relative flex min-h-[126px] flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${
                      selected
                        ? "border-[#ffe0b4]/36 bg-[#ffe0b4]/16"
                        : "border-white/14 bg-[#081120]/34"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="rounded-full border border-white/12 bg-[#081120]/36 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/72">
                    {selected ? "Now playing" : item.blurb}
                  </span>
                </div>

                <div className="mt-6">
                  <div className="text-lg font-medium text-white">{item.label}</div>
                  <div className="mt-2 text-sm leading-6 text-white/74">{item.detail}</div>
                </div>

                <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/76">
                  <span>{selected ? "Tap again for silence" : "Tap to enter"}</span>
                  <span className="opacity-0 transition group-hover:opacity-100 sm:block">
                    ambience
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
