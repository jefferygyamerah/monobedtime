"use client";

import { motion } from "framer-motion";

const starDots = [
  { left: "8%", top: "14%", size: 5 },
  { left: "16%", top: "28%", size: 3 },
  { left: "28%", top: "10%", size: 4 },
  { left: "36%", top: "22%", size: 2 },
  { left: "48%", top: "12%", size: 4 },
  { left: "62%", top: "20%", size: 3 },
  { left: "74%", top: "11%", size: 5 },
  { left: "84%", top: "27%", size: 3 },
  { left: "90%", top: "18%", size: 2 },
  { left: "12%", top: "62%", size: 4 },
  { left: "22%", top: "72%", size: 3 },
  { left: "40%", top: "66%", size: 5 },
  { left: "58%", top: "76%", size: 3 },
  { left: "72%", top: "68%", size: 4 },
  { left: "86%", top: "74%", size: 3 },
];

const gradientPresets = [
  "radial-gradient(circle at 20% 16%, rgba(241, 166, 112, 0.26), transparent 18%), radial-gradient(circle at 78% 18%, rgba(182, 155, 255, 0.22), transparent 24%), linear-gradient(160deg, #0f1730 0%, #1e2447 36%, #3b3157 72%, #5b3f58 100%)",
  "radial-gradient(circle at 18% 18%, rgba(255, 197, 132, 0.24), transparent 18%), radial-gradient(circle at 78% 14%, rgba(139, 174, 255, 0.2), transparent 24%), linear-gradient(160deg, #10182f 0%, #1b2948 34%, #2d355b 68%, #5a4264 100%)",
  "radial-gradient(circle at 22% 14%, rgba(255, 183, 126, 0.24), transparent 18%), radial-gradient(circle at 80% 20%, rgba(214, 167, 255, 0.18), transparent 24%), linear-gradient(160deg, #11172a 0%, #1c2341 36%, #2f3155 66%, #63435d 100%)",
];

const floatingGlows = [
  "left-[12%] top-[18%] h-40 w-40 bg-[#f5b37a]/18",
  "right-[14%] top-[16%] h-56 w-56 bg-[#aab7ff]/14",
  "left-[18%] bottom-[18%] h-60 w-60 bg-[#f0a46f]/12",
  "right-[18%] bottom-[14%] h-72 w-72 bg-[#9f86ff]/10",
];

export function AmbientBackground({
  pageIndex,
}: {
  pageIndex: number;
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0"
        animate={{
          background: gradientPresets[pageIndex % gradientPresets.length],
        }}
        transition={{ duration: 1.8, ease: "easeInOut" }}
      />

      <motion.div
        className="heartbeat-glow absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-[40%] rounded-full bg-[radial-gradient(circle,rgba(255,202,146,0.28),rgba(163,171,255,0.16),transparent_72%)] blur-3xl"
        animate={{
          opacity: [0.36, 0.62, 0.36],
          scale: [0.97, 1.03, 0.97],
        }}
        transition={{
          duration: 1,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      />

      {floatingGlows.map((glow, index) => (
        <motion.div
          key={glow}
          className={`absolute rounded-full blur-3xl ${glow}`}
          animate={{
            y: [0, index % 2 === 0 ? -22 : 18, 0],
            x: [0, index % 2 === 0 ? 14 : -12, 0],
            opacity: [0.2, 0.38, 0.2],
          }}
          transition={{
            duration: 12 + index * 2,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      ))}

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,24,0.04),rgba(8,10,24,0.12)_48%,rgba(8,10,24,0.42))]" />

      {starDots.map((star, index) => (
        <motion.span
          key={`${star.left}-${star.top}`}
          className="absolute rounded-full bg-[#f7ebcf]"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            boxShadow: "0 0 18px rgba(247, 235, 207, 0.42)",
          }}
          animate={{
            opacity: [0.3, 0.78, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2.6 + index * 0.12,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
            delay: index * 0.08,
          }}
        />
      ))}

      <div className="absolute inset-x-[12%] top-[12%] h-24 rounded-full border border-white/10 bg-white/6 blur-3xl" />
      <div className="absolute inset-x-[8%] bottom-[-14%] h-[34vh] rounded-t-[50%] bg-[radial-gradient(circle_at_center,rgba(248,181,120,0.12),transparent_66%)] blur-3xl" />
    </div>
  );
}
