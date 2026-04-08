import Image from "next/image";
import type { ReactNode } from "react";
import type { sceneTypeSchema } from "@/lib/story-contract";
import type { z } from "zod";

type SceneType = z.infer<typeof sceneTypeSchema>;

const foregroundByScene: Record<SceneType, ReactNode> = {
  moon: (
    <>
      <circle cx="296" cy="62" r="28" fill="#0b0b0b" />
      <circle cx="308" cy="62" r="26" fill="#fffaf3" />
      <path
        d="M0 180C45 150 86 146 128 160C164 172 196 196 244 194C302 192 331 167 400 141V240H0Z"
        fill="rgba(11,11,11,0.09)"
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
      <rect x="168" y="118" width="96" height="62" rx="8" fill="rgba(17,17,17,0.78)" />
      <path d="M158 122L216 84L276 122Z" fill="rgba(255,122,0,0.82)" />
      <rect x="290" y="134" width="58" height="46" rx="8" fill="rgba(255,255,255,0.72)" />
    </>
  ),
  forest: (
    <>
      {[44, 92, 150, 212, 268, 322].map((x) => (
        <g key={x}>
          <rect x={x} y="146" width="10" height="46" rx="4" fill="rgba(17,17,17,0.18)" />
          <path d={`M${x - 18} 154L${x + 5} 106L${x + 28} 154Z`} fill="rgba(17,17,17,0.88)" />
          <path d={`M${x - 14} 138L${x + 5} 96L${x + 24} 138Z`} fill="rgba(255,122,0,0.78)" />
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
            stroke="rgba(17,17,17,0.28)"
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
        fill="rgba(17,17,17,0.12)"
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
      <path d="M232 190L318 102L392 190Z" fill="rgba(17,17,17,0.26)" />
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
            fill={index % 2 === 0 ? "rgba(17,17,17,0.76)" : "rgba(255,122,0,0.72)"}
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
}: {
  title: string;
  caption: string;
  sceneType: SceneType;
  imageDataUrl?: string | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-black/8 bg-white/80 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      {imageDataUrl ? (
        <div className="relative aspect-[5/3] min-h-[240px] w-full">
          <Image src={imageDataUrl} alt={title} fill unoptimized className="object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.16)_42%,rgba(255,255,255,0.82)_100%)]" />
        </div>
      ) : (
        <svg viewBox="0 0 400 240" className="h-full w-full">
          <defs>
            <linearGradient id={`grad-${sceneType}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fffdf8" />
              <stop offset="65%" stopColor="#f4efe6" />
              <stop offset="100%" stopColor="#ebe7df" />
            </linearGradient>
          </defs>
          <rect width="400" height="240" fill={`url(#grad-${sceneType})`} />
          <circle cx="58" cy="36" r="2" fill="#111111" />
          <circle cx="118" cy="48" r="1.5" fill="#111111" />
          <circle cx="214" cy="34" r="1.8" fill="#111111" />
          <circle cx="348" cy="42" r="1.5" fill="#111111" />
          <circle cx="302" cy="24" r="1.2" fill="#FF7A00" />
          {foregroundByScene[sceneType]}
        </svg>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/90 to-transparent px-5 pb-5 pt-16">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#FF7A00]">
          {imageDataUrl ? "monobedtime premium art" : "monobedtime scene"}
        </div>
        <div className="font-[family-name:var(--font-geist-sans)] text-xl font-semibold text-black">
          {title}
        </div>
        <p className="mt-2 max-w-[28rem] text-sm leading-6 text-black/62">{caption}</p>
      </div>
    </div>
  );
}
