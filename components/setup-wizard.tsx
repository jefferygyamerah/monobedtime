"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { SoundDock } from "@/components/sound-dock";
import type { Soundscape } from "@/components/use-bedtime-audio";

export type SetupProfile = {
  childName: string;
  age: string;
  language: string;
  culture: string;
};

export function SetupWizard({
  activeSoundscape,
  onComplete,
  onSelectSoundscape,
}: {
  activeSoundscape: Soundscape | null;
  onComplete: (profile: SetupProfile) => void;
  onSelectSoundscape: (soundscape: Soundscape) => void;
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<SetupProfile>({
    childName: "",
    age: "",
    language: "",
    culture: "",
  });

  const canContinue = useMemo(() => {
    if (step === 1) {
      return formData.childName.trim().length > 0;
    }

    if (step === 2) {
      return formData.age.trim().length > 0 && formData.language.trim().length > 0;
    }

    return true;
  }, [formData, step]);

  const stepCopy = [
    {
      eyebrow: "Step 1 of 3",
      title: "Who is this bedtime made for?",
      description:
        "Tell Mono the child's name so every story feels warm, personal, and easy to recognize.",
      helper: "A first name is enough.",
      buttonLabel: "Continue",
    },
    {
      eyebrow: "Step 2 of 3",
      title: "How should the story pace itself?",
      description:
        "Age and language help Mono choose the right rhythm, vocabulary, and bedtime tone.",
      helper: "You can keep this simple or make it specific.",
      buttonLabel: "Continue",
    },
    {
      eyebrow: "Step 3 of 3",
      title: "Any roots, places, or traditions to keep close?",
      description:
        "Optional details help stories carry familiar settings, family language, and little cultural touches.",
      helper: "Leave this blank if you want a more general story.",
      buttonLabel: "Enter Mono",
    },
  ] as const;

  const activeStep = stepCopy[Math.min(step, stepCopy.length) - 1] ?? stepCopy[0];

  function updateForm(field: keyof SetupProfile, value: string) {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleNext() {
    if (!canContinue) {
      return;
    }

    if (step < 3) {
      setStep((current) => current + 1);
      return;
    }

    window.localStorage.setItem("mono_settings", JSON.stringify(formData));
    onComplete(formData);
  }

  const slideVariants = {
    enter: { x: 36, opacity: 0, filter: "blur(10px)" },
    center: { x: 0, opacity: 1, filter: "blur(0px)" },
    exit: { x: -36, opacity: 0, filter: "blur(10px)" },
  };

  return (
    <div className="relative min-h-dvh w-full overflow-y-auto bg-[#0e1429] font-sans text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.36),_rgba(15,23,42,0.94)_45%,_#070b17_100%)]" />
      <div className="absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-full bg-sky-400/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="safe-top safe-bottom-lg safe-left safe-right relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-5 sm:px-6 sm:py-8">
        <div className="overflow-hidden rounded-[2rem] border border-white/16 bg-[#101a33]/88 px-5 py-6 shadow-[0_28px_90px_rgba(4,8,24,0.52)] backdrop-blur-md sm:px-6 sm:py-7">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-indigo-200/80">
                bedtime setup
              </p>
              <p className="max-w-[24ch] text-sm leading-6 text-white/80 sm:text-[0.95rem]">
                Three quick details help Mono make the first story feel personal right away.
              </p>
              <div className="inline-flex items-center gap-3 rounded-full border border-white/14 bg-white/8 px-3 py-2">
                <div className="shrink-0 overflow-hidden rounded-full border border-white/16 bg-white/8">
                  <Image
                    src="/luffy.png"
                    alt="Luffy, the bedtime companion"
                    width={44}
                    height={44}
                    className="h-11 w-11 object-cover"
                    priority
                  />
                </div>
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/58">
                    Tonight&apos;s companion
                  </div>
                  <div className="text-sm text-white/88">Luffy keeps the room gentle.</div>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-full border border-white/18 bg-slate-950/45 px-3 py-2 text-right">
                <div className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-white/50">
                  progress
                </div>
                <div className="mt-1 text-sm font-medium text-white/88">
                  {step}/3
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[1.7rem] border border-white/14 bg-slate-950/38 px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:px-5 sm:py-6">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    step >= index
                      ? "w-12 bg-indigo-200 shadow-[0_0_18px_rgba(191,219,254,0.24)]"
                      : "w-4 bg-white/24"
                  }`}
                />
              ))}
            </div>

            <div className="mt-5 min-h-[248px] sm:min-h-[260px]">
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.div
                    key="step1"
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.38 }}
                    className="space-y-5 sm:space-y-6"
                  >
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-200/70">
                        {activeStep.eyebrow}
                      </p>
                      <h2 className="text-[1.85rem] font-light leading-tight text-white sm:text-[2rem]">
                        {activeStep.title}
                      </h2>
                      <p className="max-w-[26ch] text-sm leading-6 text-white/78">
                        {activeStep.description}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-white/92" htmlFor="child-name">
                        Child name
                      </label>
                      <input
                        id="child-name"
                        type="text"
                        autoFocus
                        value={formData.childName}
                        onChange={(event) => updateForm("childName", event.target.value)}
                        placeholder="For example, Luna"
                        className="w-full rounded-2xl border border-white/20 bg-slate-950/78 px-4 py-4 text-[1.4rem] text-white placeholder:text-white/46 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition focus:border-indigo-200/70 focus:bg-slate-950/90 focus:ring-2 focus:ring-indigo-300/18"
                      />
                      <p className="text-xs leading-5 text-white/64">{activeStep.helper}</p>
                    </div>
                  </motion.div>
                ) : null}

                {step === 2 ? (
                  <motion.div
                    key="step2"
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.38 }}
                    className="space-y-5 sm:space-y-6"
                  >
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-200/70">
                        {activeStep.eyebrow}
                      </p>
                      <h2 className="text-[1.7rem] font-light leading-tight text-white sm:text-[1.9rem]">
                        {activeStep.title}
                      </h2>
                      <p className="max-w-[28ch] text-sm leading-6 text-white/78">
                        {activeStep.description}
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-white/92" htmlFor="child-age">
                          Age
                        </label>
                        <input
                          id="child-age"
                          type="text"
                          autoFocus
                          value={formData.age}
                          onChange={(event) => updateForm("age", event.target.value)}
                          placeholder="2 months old"
                          className="w-full rounded-2xl border border-white/20 bg-slate-950/78 px-4 py-4 text-lg text-white placeholder:text-white/46 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition focus:border-indigo-200/70 focus:bg-slate-950/90 focus:ring-2 focus:ring-indigo-300/18"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium text-white/92" htmlFor="language">
                          Language
                        </label>
                        <input
                          id="language"
                          type="text"
                          value={formData.language}
                          onChange={(event) => updateForm("language", event.target.value)}
                          placeholder="Spanish and English"
                          className="w-full rounded-2xl border border-white/20 bg-slate-950/78 px-4 py-4 text-lg text-white placeholder:text-white/46 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition focus:border-indigo-200/70 focus:bg-slate-950/90 focus:ring-2 focus:ring-indigo-300/18"
                        />
                      </div>
                    </div>

                    <p className="text-xs leading-5 text-white/64">{activeStep.helper}</p>
                  </motion.div>
                ) : null}

                {step === 3 ? (
                  <motion.div
                    key="step3"
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.38 }}
                    className="space-y-5 sm:space-y-6"
                  >
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-200/70">
                        {activeStep.eyebrow}
                      </p>
                      <h2 className="text-[1.65rem] font-light leading-tight text-white sm:text-[1.85rem]">
                        {activeStep.title}
                      </h2>
                      <p className="max-w-[29ch] text-sm leading-6 text-white/78">
                        {activeStep.description}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-white/92" htmlFor="culture">
                        Family roots or places
                      </label>
                      <input
                        id="culture"
                        type="text"
                        autoFocus
                        value={formData.culture}
                        onChange={(event) => updateForm("culture", event.target.value)}
                        placeholder="Optional: Panama City, Colombian heritage"
                        className="w-full rounded-2xl border border-white/20 bg-slate-950/78 px-4 py-4 text-lg text-white placeholder:text-white/46 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition focus:border-indigo-200/70 focus:bg-slate-950/90 focus:ring-2 focus:ring-indigo-300/18"
                      />
                      <p className="text-xs leading-5 text-white/64">{activeStep.helper}</p>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            onClick={handleNext}
            disabled={!canContinue}
            className="group mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-indigo-100/30 bg-[linear-gradient(180deg,rgba(165,180,252,0.36),rgba(79,70,229,0.28))] px-5 py-4 text-white shadow-[0_12px_34px_rgba(9,14,32,0.34)] transition hover:border-indigo-100/42 hover:bg-[linear-gradient(180deg,rgba(191,219,254,0.42),rgba(99,102,241,0.34))] disabled:cursor-not-allowed disabled:opacity-45 sm:mt-8"
          >
            <span className="text-sm font-semibold tracking-[0.18em] uppercase">
              {activeStep.buttonLabel}
            </span>
            {step === 3 ? (
              <Check size={18} className="opacity-75" />
            ) : (
              <ChevronRight
                size={18}
                className="opacity-75 transition-transform group-hover:translate-x-1"
              />
            )}
          </motion.button>

          <div className="mt-4">
            <SoundDock
              activeSoundscape={activeSoundscape}
              onSelectSoundscape={onSelectSoundscape}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  );
}
