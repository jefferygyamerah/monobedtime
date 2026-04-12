import Image from "next/image";
import type { ReactNode } from "react";
import type { sceneTypeSchema } from "@/lib/story-contract";
import type { z } from "zod";

type SceneType = z.infer<typeof sceneTypeSchema>;
type PosterVariant = "card" | "hero" | "reader";

const paletteByScene: Record<
  SceneType,
  {
    from: string;
    via: string;
    to: string;
    accent: string;
  }
> = {
  moon: {
    from: "#07101f",
    via: "#15284f",
    to: "#304d86",
    accent: "#d8e4ff",
  },
  clouds: {
    from: "#0a1324",
    via: "#243c70",
    to: "#5675b0",
    accent: "#edf4ff",
  },
  village: {
    from: "#091223",
    via: "#43305a",
    to: "#ad6c4b",
    accent: "#ffe5bc",
  },
  forest: {
    from: "#061118",
    via: "#16382f",
    to: "#2f6c59",
    accent: "#d9f6d8",
  },
  jungle: {
    from: "#071017",
    via: "#134737",
    to: "#2e8d69",
    accent: "#d6ffec",
  },
  ocean: {
    from: "#07131e",
    via: "#11436a",
    to: "#2a78a8",
    accent: "#d7f1ff",
  },
  mountains: {
    from: "#0b1221",
    via: "#3d3f71",
    to: "#7769a7",
    accent: "#efe6ff",
  },
  city: {
    from: "#09111d",
    via: "#2b375d",
    to: "#9c5c4d",
    accent: "#ffe4c4",
  },
};

const foregroundByScene: Record<SceneType, ReactNode> = {
  moon: (
    <>
      <circle cx="296" cy="62" r="28" fill="#0b0b0b" />
      <circle cx="308" cy="62" r="26" fill="#fffaf3" />
      <path
        d="M0 180C45 150 86 146 128 160C164 172 196 196 244 194C302 192 331 167 400 141V240H0Z"
        fill="rgba(223,233,255,0.14)"
      />
      <path
        d="M0 198C61 170 102 176 155 191C204 205 255 205 312 183C352 168 376 154 400 146V240H0Z"
        fill="rgba(255,122,0,0.18)"
      />
    </>
  ),
  clouds: (
    <>
      <g fill="rgba(255,255,255,0.95)">
        <ellipse cx="102" cy="92" rx="34" ry="18" />
        <ellipse cx="132" cy="90" rx="25" ry="15" />
        <ellipse cx="258" cy="72" rx="41" ry="20" />
        <ellipse cx="294" cy="76" rx="28" ry="16" />
      </g>
      <path
        d="M0 184C56 169 104 170 145 178C204 190 250 206 313 194C348 188 376 176 400 165V240H0Z"
        fill="rgba(255,122,0,0.22)"
      />
    </>
  ),
  village: (
    <>
      <rect x="48" y="126" width="74" height="54" rx="8" fill="rgba(255,255,255,0.9)" />
      <path d="M40 128L85 92L130 128Z" fill="#FF7A00" />
      <rect x="168" y="118" width="96" height="62" rx="8" fill="rgba(230,236,255,0.34)" />
      <path d="M158 122L216 84L276 122Z" fill="rgba(255,122,0,0.82)" />
      <rect x="290" y="134" width="58" height="46" rx="8" fill="rgba(255,255,255,0.72)" />
    </>
  ),
  forest: (
    <>
      {[44, 92, 150, 212, 268, 322].map((x) => (
        <g key={x}>
          <rect x={x} y="146" width="10" height="46" rx="4" fill="rgba(223,245,232,0.28)" />
          <path d={`M${x - 18} 154L${x + 5} 106L${x + 28} 154Z`} fill="rgba(20,73,59,0.7)" />
          <path d={`M${x - 14} 138L${x + 5} 96L${x + 24} 138Z`} fill="rgba(219,255,226,0.42)" />
        </g>
      ))}
    </>
  ),
  jungle: (
    <>
      {[52, 106, 164, 224, 286, 344].map((x) => (
        <g key={x}>
          <path
            d={`M${x} 198C${x - 18} 156 ${x - 10} 120 ${x + 6} 82`}
            stroke="rgba(213,255,236,0.24)"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
          <ellipse cx={x + 16} cy="110" rx="28" ry="12" fill="rgba(255,122,0,0.55)" />
          <ellipse cx={x - 2} cy="136" rx="26" ry="11" fill="rgba(255,255,255,0.42)" />
        </g>
      ))}
    </>
  ),
  ocean: (
    <>
      <path
        d="M0 142C34 128 69 127 102 142C136 158 165 160 198 146C232 132 261 131 294 146C330 161 362 162 400 145V240H0Z"
        fill="rgba(219,241,255,0.16)"
      />
      <path
        d="M0 168C30 156 62 156 92 169C132 186 170 188 208 170C244 154 282 152 318 168C346 180 372 181 400 172V240H0Z"
        fill="rgba(255,122,0,0.22)"
      />
      <circle cx="320" cy="60" r="26" fill="rgba(255,255,255,0.94)" />
    </>
  ),
  mountains: (
    <>
      <path d="M18 190L88 96L158 190Z" fill="rgba(255,255,255,0.9)" />
      <path d="M120 190L214 74L308 190Z" fill="rgba(255,122,0,0.78)" />
      <path d="M232 190L318 102L392 190Z" fill="rgba(222,214,255,0.28)" />
    </>
  ),
  city: (
    <>
      {[44, 94, 142, 192, 244, 292, 340].map((x, index) => (
        <g key={x}>
          <rect
            x={x}
            y={116 - (index % 3) * 18}
            width="32"
            height={76 + (index % 3) * 18}
            rx="5"
              fill={index % 2 === 0 ? "rgba(214,227,255,0.34)" : "rgba(255,160,108,0.76)"}
          />
          {[0, 12, 24].map((offset) => (
            <rect
              key={offset}
              x={x + 8}
              y={128 - (index % 3) * 18 + offset}
              width="6"
              height="8"
              rx="2"
              fill="rgba(255,255,255,0.55)"
            />
          ))}
        </g>
      ))}
    </>
  ),
};

export function ScenePoster({
  title,
  caption,
  sceneType,
  imageDataUrl,
  variant = "card",
}: {
  title: string;
  caption: string;
  sceneType: SceneType;
  imageDataUrl?: string | null;
  variant?: PosterVariant;
}) {
  const palette = paletteByScene[sceneType];
  const wrapperClass =
    variant === "hero"
      ? "rounded-[2.2rem] border border-white/14 bg-[#081120] shadow-[0_38px_110px_rgba(2,6,23,0.55)]"
      : variant === "reader"
        ? "rounded-[1.8rem] border border-white/12 bg-[#081120] shadow-[0_26px_70px_rgba(2,6,23,0.4)]"
        : "rounded-[1.8rem] border border-white/12 bg-[#081120] shadow-[0_24px_70px_rgba(2,6,23,0.38)]";
  const mediaClass =
    variant === "hero"
      ? "aspect-[16/8.8] min-h-[280px]"
      : "aspect-[16/9] min-h-[220px]";
  const badgeText =
    variant === "hero"
      ? "featured tonight"
      : variant === "reader"
        ? "story frame"
        : "scene preview";
  const titleClass =
    variant === "hero"
      ? "text-[1.75rem] font-medium text-white sm:text-[2.3rem]"
      : variant === "reader"
        ? "text-[1.15rem] font-medium text-white sm:text-[1.35rem]"
        : "text-[1.1rem] font-medium text-white sm:text-[1.2rem]";
  const captionClass =
    variant === "hero"
      ? "mt-3 max-w-[34rem] text-sm leading-6 text-white/76 sm:text-base sm:leading-7"
      : "mt-2 max-w-[30rem] text-sm leading-6 text-white/70";

  return (
    <div className={`relative overflow-hidden ${wrapperClass}`}>
      {imageDataUrl ? (
        <div className={`relative w-full ${mediaClass}`}>
          <Image src={imageDataUrl} alt={title} fill unoptimized className="object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0.18)_28%,rgba(2,6,23,0.7)_72%,rgba(2,6,23,0.96)_100%)]" />
        </div>
      ) : (
        <svg viewBox="0 0 400 240" className={`h-full w-full ${mediaClass}`}>
          <defs>
            <linearGradient id={`grad-${sceneType}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={palette.from} />
              <stop offset="55%" stopColor={palette.via} />
              <stop offset="100%" stopColor={palette.to} />
            </linearGradient>
            <radialGradient id={`glow-${sceneType}`} cx="72%" cy="30%" r="68%">
              <stop offset="0%" stopColor={`${palette.accent}66`} />
              <stop offset="40%" stopColor={`${palette.accent}18`} />
              <stop offset="100%" stopColor={`${palette.accent}00`} />
            </radialGradient>
          </defs>
          <rect width="400" height="240" fill={`url(#grad-${sceneType})`} />
          <rect width="400" height="240" fill={`url(#glow-${sceneType})`} />
          <circle cx="58" cy="36" r="2" fill={palette.accent} />
          <circle cx="118" cy="48" r="1.5" fill={palette.accent} />
          <circle cx="214" cy="34" r="1.8" fill={palette.accent} />
          <circle cx="348" cy="42" r="1.5" fill={palette.accent} />
          <circle cx="302" cy="24" r="1.2" fill="#ffcf8b" />
          {foregroundByScene[sceneType]}
          <rect width="400" height="240" fill={`url(#vignette-${sceneType})`} opacity="0.3" />
          <defs>
            <radialGradient id={`vignette-${sceneType}`} cx="50%" cy="42%" r="72%">
              <stop offset="48%" stopColor="#000000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.58" />
            </radialGradient>
          </defs>
        </svg>
      )}

      <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/16 bg-[#081120]/52 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/74 backdrop-blur-md sm:left-5 sm:top-5">
        {badgeText}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#040915] via-[#07111f]/88 to-transparent px-4 pb-4 pt-20 sm:px-5 sm:pb-5">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8fb0ff]">
          {imageDataUrl ? "monobedtime art" : "monobedtime original"}
        </div>
        <div className={titleClass}>{title}</div>
        <p className={captionClass}>{caption}</p>
      </div>
    </div>
  );
}
