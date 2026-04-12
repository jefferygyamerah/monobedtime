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
  }
> = {
  forest: {
    label: "Forest",
    icon: <Trees className="h-4 w-4" />,
    blurb: "canopy air",
  },
  sea: {
    label: "Sea",
    icon: <Waves className="h-4 w-4" />,
    blurb: "slow surf",
  },
  city: {
    label: "City",
    icon: <Building2 className="h-4 w-4" />,
    blurb: "night hush",
  },
  fire: {
    label: "Fire",
    icon: <Flame className="h-4 w-4" />,
    blurb: "soft crackle",
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
      className={`rounded-[1.6rem] border border-white/18 bg-slate-950/42 p-4 shadow-[0_18px_50px_rgba(7,10,26,0.24)] backdrop-blur-xl ${
        compact ? "" : "sm:p-5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/8 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/76">
            <Volume2 className="h-3.5 w-3.5" />
            Night sounds
          </div>
          <p className="mt-3 text-sm leading-6 text-white/84">
            Tap a scene to start the room tone. Sound only begins after your first tap, by design.
          </p>
        </div>
        <div className="rounded-full border border-white/16 bg-white/8 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/76">
          {activeSoundscape ? `${soundscapeMeta[activeSoundscape].label} on` : "Sound off"}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {(Object.keys(soundscapeMeta) as Soundscape[]).map((soundscape) => {
          const item = soundscapeMeta[soundscape];
          const selected = activeSoundscape === soundscape;

          return (
            <motion.button
              key={soundscape}
              type="button"
              onClick={() => onSelectSoundscape(soundscape)}
              whileTap={{ scale: 0.98 }}
              className={`rounded-[1.3rem] border px-3 py-3 text-left transition ${
                selected
                  ? "border-[#ffd59c]/34 bg-[#ffd59c]/14 text-[#fff2dc]"
                  : "border-white/16 bg-white/8 text-white/88 hover:bg-white/12"
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${
                    selected
                      ? "border-[#ffd59c]/36 bg-[#ffd59c]/16"
                      : "border-white/16 bg-slate-950/38"
                  }`}
                >
                  {item.icon}
                </span>
                {item.label}
              </div>
              <div className="mt-2 text-xs uppercase tracking-[0.16em] text-white/58">
                {selected ? "Tap again for silence" : item.blurb}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
