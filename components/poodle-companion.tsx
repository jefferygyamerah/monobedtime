"use client";

import { motion } from "framer-motion";
import { MoonStar } from "lucide-react";
import { useEffect, useState } from "react";

export function PoodleCompanion({
  cueKey,
  visible,
}: {
  cueKey: number;
  visible: boolean;
}) {
  const [cueing, setCueing] = useState(false);

  useEffect(() => {
    if (cueKey === 0) {
      return;
    }

    setCueing(true);
    const timeoutId = window.setTimeout(() => {
      setCueing(false);
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [cueKey]);

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-5 right-4 z-20 sm:bottom-7 sm:right-6"
      animate={{
        opacity: visible ? 0.98 : 0.74,
        y: visible ? 0 : 8,
      }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <motion.div
        className="glass-panel relative flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/12 bg-white/8 sm:h-28 sm:w-28"
        animate={{ y: [0, -4, 0] }}
        transition={{
          duration: 4.8,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        <motion.div
          className="absolute -top-3 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-[#f4e3ba]"
          animate={{ rotate: [0, 10, 0], scale: [1, 1.08, 1] }}
          transition={{
            duration: 3.4,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
          }}
        >
          <MoonStar className="h-4 w-4" />
        </motion.div>

        <motion.svg
          viewBox="0 0 120 120"
          className="h-[78px] w-[78px] sm:h-[88px] sm:w-[88px]"
          animate={
            cueing
              ? {
                  rotate: [0, -7, 4, 0],
                  y: [0, 5, 1, 0],
                  scaleY: [1, 0.92, 1.02, 1],
                }
              : {
                  rotate: 0,
                  y: 0,
                  scaleY: 1,
                }
          }
          transition={{ duration: 1.8, ease: "easeInOut" }}
        >
          <ellipse cx="60" cy="82" rx="34" ry="25" fill="#ebe3db" />
          <ellipse cx="40" cy="52" rx="16" ry="24" fill="#ece6df" />
          <ellipse cx="80" cy="52" rx="16" ry="24" fill="#ece6df" />
          <ellipse cx="60" cy="54" rx="28" ry="26" fill="#f8f2ea" />
          <circle cx="49" cy="50" r="8" fill="#fbf7f1" />
          <circle cx="71" cy="50" r="8" fill="#fbf7f1" />
          <ellipse cx="60" cy="63" rx="11" ry="8" fill="#ddc8b9" />
          <circle cx="55" cy="57" r="2.7" fill="#5a5560" />
          <circle cx="65" cy="57" r="2.7" fill="#5a5560" />
          <motion.path
            d="M52 67C56 72 64 72 68 67"
            fill="none"
            stroke="#7b6574"
            strokeLinecap="round"
            strokeWidth="3.2"
            animate={
              cueing
                ? {
                    scaleY: [1, 1.35, 1],
                    y: [0, 1.5, 0],
                  }
                : undefined
            }
            style={{ originX: "50%", originY: "50%" }}
            transition={{ duration: 1.6, ease: "easeInOut" }}
          />
          <ellipse cx="60" cy="86" rx="18" ry="14" fill="#f5eee7" />
        </motion.svg>
      </motion.div>
    </motion.div>
  );
}
