"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

export type SetupProfile = {
  childName: string;
  age: string;
  language: string;
  culture: string;
};

export function SetupWizard({
  onComplete,
}: {
  onComplete: (profile: SetupProfile) => void;
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
    enter: { x: 36, opacity: 0, filter: "blur(5px)" },
    center: { x: 0, opacity: 1 },
    exit: { x: -36, opacity: 0, filter: "blur(5px)" },
  };

  return (
    <div className="relative min-h-dvh w-full overflow-y-auto bg-[#0e1429] font-sans text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.36),_rgba(15,23,42,0.94)_45%,_#070b17_100%)]" />
      <div className="absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-full bg-sky-400/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="safe-top safe-bottom-lg safe-left safe-right relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-5 sm:px-6 sm:py-8">
        <div className="overflow-hidden rounded-[2rem] border border-white/14 bg-white/8 px-5 py-6 shadow-[0_28px_90px_rgba(4,8,24,0.52)] backdrop-blur-xl sm:px-6 sm:py-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-indigo-200/80">
                bedtime setup
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-[2.15rem]">
                Set the mood for the first story.
              </h1>
              <p className="mt-3 max-w-[28ch] text-sm leading-6 text-white/72 sm:text-[0.95rem]">
                A few quiet details help Mono make the experience feel personal, cozy, and easy to begin.
              </p>
            </div>
            <div className="shrink-0 rounded-full border border-white/14 bg-white/10 px-3 py-2 text-right">
              <div className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-white/50">
                progress
              </div>
              <div className="mt-1 text-sm font-medium text-white/88">
                {step}/3
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            {[1, 2, 3].map((index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  step >= index ? "w-10 bg-indigo-200" : "w-3 bg-white/15"
                }`}
              />
            ))}
          </div>

          <div className="mt-6 min-h-[260px] sm:min-h-[272px]">
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
                    <h2 className="text-[1.95rem] font-light leading-tight text-white sm:text-[2.1rem]">
                      {activeStep.title}
                    </h2>
                    <p className="max-w-[26ch] text-sm leading-6 text-white/70">
                      {activeStep.description}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-white/80" htmlFor="child-name">
                      Child name
                    </label>
                    <input
                      id="child-name"
                      type="text"
                      autoFocus
                      value={formData.childName}
                      onChange={(event) => updateForm("childName", event.target.value)}
                      placeholder="For example, Luna"
                      className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-4 text-[1.4rem] text-white placeholder:text-white/38 outline-none transition focus:border-indigo-200/60 focus:bg-white/10 focus:ring-2 focus:ring-indigo-300/20"
                    />
                    <p className="text-xs leading-5 text-white/52">{activeStep.helper}</p>
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
                    <h2 className="text-[1.75rem] font-light leading-tight text-white sm:text-[1.95rem]">
                      {activeStep.title}
                    </h2>
                    <p className="max-w-[28ch] text-sm leading-6 text-white/70">
                      {activeStep.description}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-white/80" htmlFor="child-age">
                        Age
                      </label>
                      <input
                        id="child-age"
                        type="text"
                        autoFocus
                        value={formData.age}
                        onChange={(event) => updateForm("age", event.target.value)}
                        placeholder="2 months old"
                        className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-4 text-lg text-white placeholder:text-white/38 outline-none transition focus:border-indigo-200/60 focus:bg-white/10 focus:ring-2 focus:ring-indigo-300/20"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-white/80" htmlFor="language">
                        Language
                      </label>
                      <input
                        id="language"
                        type="text"
                        value={formData.language}
                        onChange={(event) => updateForm("language", event.target.value)}
                        placeholder="Spanish and English"
                        className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-4 text-lg text-white placeholder:text-white/38 outline-none transition focus:border-indigo-200/60 focus:bg-white/10 focus:ring-2 focus:ring-indigo-300/20"
                      />
                    </div>
                  </div>

                  <p className="text-xs leading-5 text-white/52">{activeStep.helper}</p>
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
                    <h2 className="text-[1.7rem] font-light leading-tight text-white sm:text-[1.9rem]">
                      {activeStep.title}
                    </h2>
                    <p className="max-w-[29ch] text-sm leading-6 text-white/70">
                      {activeStep.description}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-white/80" htmlFor="culture">
                      Family roots or places
                    </label>
                    <input
                      id="culture"
                      type="text"
                      autoFocus
                      value={formData.culture}
                      onChange={(event) => updateForm("culture", event.target.value)}
                      placeholder="Optional: Panama City, Colombian heritage"
                      className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-4 text-lg text-white placeholder:text-white/38 outline-none transition focus:border-indigo-200/60 focus:bg-white/10 focus:ring-2 focus:ring-indigo-300/20"
                    />
                    <p className="text-xs leading-5 text-white/52">{activeStep.helper}</p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            onClick={handleNext}
            disabled={!canContinue}
            className="group mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))] px-5 py-4 text-white shadow-[0_12px_34px_rgba(9,14,32,0.34)] transition hover:border-white/24 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.1))] disabled:cursor-not-allowed disabled:opacity-45 sm:mt-8"
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
        </div>
      </div>
    </div>
  );
}
