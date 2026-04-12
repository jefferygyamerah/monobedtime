"use client";

import { motion } from "framer-motion";
import { MoonStar } from "lucide-react";
import { useEffect, useState } from "react";

export function PoodleCompanion({
  cueKey,
  hideOnMobile = false,
  visible,
}: {
  cueKey: number;
  hideOnMobile?: boolean;
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
      className={`pointer-events-none absolute bottom-3 right-3 z-20 safe-bottom safe-right sm:bottom-7 sm:right-6 ${
        hideOnMobile ? "hidden sm:block" : ""
      }`}
      animate={{
        opacity: visible ? 0.98 : 0.74,
        y: visible ? 0 : 8,
      }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <motion.div
        className="glass-panel relative flex h-16 w-16 items-center justify-center rounded-[1.6rem] border border-white/12 bg-white/8 sm:h-28 sm:w-28 sm:rounded-[2rem]"
        animate={{ y: [0, -4, 0] }}
        transition={{
          duration: 4.8,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        <motion.div
          className="absolute -top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/10 text-[#f4e3ba] sm:-top-3 sm:right-4 sm:h-8 sm:w-8"
          animate={{ rotate: [0, 10, 0], scale: [1, 1.08, 1] }}
          transition={{
            duration: 3.4,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
          }}
        >
          <MoonStar className="h-4 w-4" />
        </motion.div>

        <motion.img
          src="/luffy.svg"
          alt=""
          draggable={false}
          className="h-[56px] w-[56px] select-none object-contain sm:h-[92px] sm:w-[92px]"
          animate={
            cueing
              ? {
                  rotate: [0, -7, 4, 0],
                  y: [0, 5, 1, 0],
                  scale: [1, 1.05, 1],
                }
              : {
                  rotate: 0,
                  y: 0,
                  scale: 1,
                }
          }
          transition={{ duration: 1.8, ease: "easeInOut" }}
          style={{ filter: "drop-shadow(0 14px 22px rgba(7,10,26,0.45))" }}
        />
      </motion.div>
    </motion.div>
  );
}
