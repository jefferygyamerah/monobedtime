"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  MoonStar,
  SlidersVertical,
  Sparkles,
  Volume2,
  Waves,
} from "lucide-react";
import type { ReactNode } from "react";

function IconButton({
  ariaLabel,
  children,
  disabled = false,
  onClick,
}: {
  ariaLabel: string;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="glass-button inline-flex h-12 w-12 items-center justify-center rounded-full text-[#f4ead7] transition disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function AnalogToggle({
  label,
  description,
  enabled,
  icon,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  icon: ReactNode;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onChange}
      className="glass-panel flex w-full items-center justify-between gap-4 rounded-[1.5rem] px-4 py-4 text-left"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/8 text-[#f4ead7]">
          {icon}
        </div>
        <div>
          <div className="text-sm font-semibold tracking-[0.02em] text-[#f6ead8]">
            {label}
          </div>
          <div className="mt-1 text-xs text-[#cad6ff]/82">{description}</div>
        </div>
      </div>

      <motion.span
        className={`relative flex h-8 w-16 items-center rounded-full border px-1 ${
          enabled
            ? "border-[#ffca91]/50 bg-[#ffca91]/22"
            : "border-white/12 bg-white/8"
        }`}
        animate={{
          boxShadow: enabled
            ? "0 0 20px rgba(255, 202, 145, 0.18)"
            : "0 0 0 rgba(0, 0, 0, 0)",
        }}
        transition={{ duration: 0.35 }}
      >
        <motion.span
          className="block h-6 w-6 rounded-full bg-[#f7eedf] shadow-[0_6px_18px_rgba(10,12,25,0.35)]"
          animate={{ x: enabled ? 30 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
        />
      </motion.span>
    </button>
  );
}

export function GlassMenu({
  audioDrawerOpen,
  canGoNext,
  canGoPrev,
  currentPage,
  guitarEnabled,
  onAudioToggle,
  onNext,
  onPrev,
  onToggleGuitar,
  onToggleVinyl,
  totalPages,
  visible,
  vinylEnabled,
}: {
  audioDrawerOpen: boolean;
  canGoNext: boolean;
  canGoPrev: boolean;
  currentPage: number;
  guitarEnabled: boolean;
  onAudioToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleGuitar: () => void;
  onToggleVinyl: () => void;
  totalPages: number;
  visible: boolean;
  vinylEnabled: boolean;
}) {
  const controlsVisible = visible || audioDrawerOpen;

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-20"
      animate={{ opacity: controlsVisible ? 1 : 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <motion.div
        className="pointer-events-auto absolute left-4 right-4 top-4 flex items-center justify-between gap-4 sm:left-6 sm:right-6 sm:top-6"
        animate={{ y: controlsVisible ? 0 : -14 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="glass-panel inline-flex items-center gap-3 rounded-full px-4 py-2.5 text-xs uppercase tracking-[0.28em] text-[#f7ebcf]/82">
          <MoonStar className="h-4 w-4" />
          monobedtime
        </div>

        <div className="glass-panel inline-flex items-center gap-2 rounded-full px-2 py-2">
          <div className="hidden rounded-full border border-white/12 bg-white/8 px-3 py-2 text-[11px] uppercase tracking-[0.24em] text-[#cad6ff]/80 sm:block">
            Page {currentPage + 1} / {totalPages}
          </div>
          <IconButton ariaLabel="Open audio ambiance drawer" onClick={onAudioToggle}>
            <SlidersVertical className="h-5 w-5" />
          </IconButton>
        </div>
      </motion.div>

      <motion.div
        className="pointer-events-auto absolute left-3 top-1/2 -translate-y-1/2 sm:left-6"
        animate={{ x: controlsVisible ? 0 : -10 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <IconButton ariaLabel="Previous story page" disabled={!canGoPrev} onClick={onPrev}>
          <ChevronLeft className="h-5 w-5" />
        </IconButton>
      </motion.div>

      <motion.div
        className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 sm:right-6"
        animate={{ x: controlsVisible ? 0 : 10 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <IconButton ariaLabel="Next story page" disabled={!canGoNext} onClick={onNext}>
          <ChevronRight className="h-5 w-5" />
        </IconButton>
      </motion.div>

      <motion.div
        className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 sm:bottom-6"
        animate={{ y: controlsVisible ? 0 : 12 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="glass-panel inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[11px] uppercase tracking-[0.22em] text-[#f7ebcf]/80">
          <Sparkles className="h-4 w-4" />
          tap edges or swipe slowly
        </div>
      </motion.div>

      <AnimatePresence>
        {audioDrawerOpen ? (
          <motion.section
            key="audio-drawer"
            className="pointer-events-auto absolute bottom-4 left-1/2 w-[min(32rem,calc(100vw-1.5rem))] -translate-x-1/2 sm:bottom-6"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.96 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div className="glass-panel rounded-[2rem] p-5 shadow-[0_26px_80px_rgba(7,10,24,0.42)]">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.26em] text-[#cad6ff]/82">
                    ambiance drawer
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-[#f6ead8]">
                    Soft audio textures
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Close audio ambiance drawer"
                  onClick={onAudioToggle}
                  className="glass-button inline-flex h-11 w-11 items-center justify-center rounded-full text-[#f6ead8]"
                >
                  <Volume2 className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                <AnalogToggle
                  label="Acoustic Guitar Lullaby"
                  description="A brushed, mellow line that feels like rocking in place."
                  enabled={guitarEnabled}
                  icon={<Volume2 className="h-5 w-5" />}
                  onChange={onToggleGuitar}
                />
                <AnalogToggle
                  label="Vinyl Crackle"
                  description="A tiny analog hiss to make the room feel tucked in."
                  enabled={vinylEnabled}
                  icon={<Waves className="h-5 w-5" />}
                  onChange={onToggleVinyl}
                />
              </div>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
