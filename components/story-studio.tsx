"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ScenePoster } from "@/components/scene-poster";
import type {
  BedtimeRequest,
  BedtimeResponse,
  IllustrationResponse,
} from "@/lib/story-contract";

const initialForm: BedtimeRequest = {
  kidName: "Sofia",
  age: 6,
  language: "es",
  culturalBackground: "Panamena con raices afrolatinas",
  location: "Ciudad de Panama",
  theme: "una luna curiosa que guia hacia el sueno",
  bedtimeMood: "calm",
  moralLesson: "",
  favoriteAnimal: "monito titi",
  favoriteColor: "naranja",
  premium: true,
};

function toApiPayload(form: BedtimeRequest) {
  return {
    ...form,
    age: Number(form.age),
  };
}

type IllustrationState = {
  cover: IllustrationResponse | null;
  blocks: Record<number, IllustrationResponse | null>;
  loading: boolean;
  note: string | null;
};

export function StoryStudio() {
  const [form, setForm] = useState<BedtimeRequest>(initialForm);
  const [story, setStory] = useState<BedtimeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [illustrations, setIllustrations] = useState<IllustrationState>({
    cover: null,
    blocks: {},
    loading: false,
    note: null,
  });
  const deferredName = useDeferredValue(form.kidName);

  const previewBadge = useMemo(() => {
    const label =
      form.language === "es"
        ? "Solo espanol"
        : form.language === "en"
          ? "Solo ingles"
          : "Bilingue";

    return `${label} · ${form.age} anos · ${form.location}`;
  }, [form.age, form.language, form.location]);

  function updateField<K extends keyof BedtimeRequest>(
    key: K,
    value: BedtimeRequest[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  useEffect(() => {
    let cancelled = false;

    if (!story || !form.premium) {
      setIllustrations({
        cover: null,
        blocks: {},
        loading: false,
        note: null,
      });
      return;
    }

    const activeStory = story;

    async function fetchIllustrations() {
      setIllustrations({
        cover: null,
        blocks: {},
        loading: true,
        note: "Generando ilustraciones premium con Gemini...",
      });

      const targets = [
        {
          kind: "cover" as const,
          index: -1,
          title: activeStory.title,
          prompt: activeStory.coverScene.imagePrompt,
          sceneType: activeStory.coverScene.sceneType,
        },
        ...activeStory.storyBlocks.slice(0, 2).map((block, index) => ({
          kind: "block" as const,
          index,
          title: block.heading,
          prompt: block.imagePrompt,
          sceneType: block.sceneType,
        })),
      ];

      const results = await Promise.all(
        targets.map(async (target) => {
          try {
            const response = await fetch("/api/generate-illustration", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                title: target.title,
                prompt: target.prompt,
                sceneType: target.sceneType,
                language: form.language,
              }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(
                data.error || "No pudimos crear la ilustracion.",
              );
            }

            return {
              ...target,
              illustration: data as IllustrationResponse,
            };
          } catch {
            return {
              ...target,
              illustration: null,
            };
          }
        }),
      );

      if (cancelled) {
        return;
      }

      const blockIllustrations: Record<number, IllustrationResponse | null> = {};
      let coverIllustration: IllustrationResponse | null = null;
      let successful = 0;

      for (const result of results) {
        if (result.kind === "cover") {
          coverIllustration = result.illustration;
        } else {
          blockIllustrations[result.index] = result.illustration;
        }

        if (result.illustration?.imageDataUrl) {
          successful += 1;
        }
      }

      setIllustrations({
        cover: coverIllustration,
        blocks: blockIllustrations,
        loading: false,
        note:
          successful > 0
            ? "Las ilustraciones premium ya estan listas."
            : "Seguimos mostrando las escenas base mientras Gemini termina o reintenta.",
      });
    }

    void fetchIllustrations();

    return () => {
      cancelled = true;
    };
  }, [form.language, form.premium, story]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setIllustrations({
      cover: null,
      blocks: {},
      loading: false,
      note: null,
    });

    try {
      const response = await fetch("/api/generate-story", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toApiPayload(form)),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No pudimos preparar el cuento.");
      }

      startTransition(() => {
        setStory(data as BedtimeResponse);
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Algo salio mal.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_120px_rgba(0,0,0,0.42)] backdrop-blur lg:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#FF7A00]">
              estudio nocturno
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Crea un cuento que si se sienta personal
            </h2>
          </div>
          <div className="hidden rounded-full border border-[#FF7A00]/40 bg-[#FF7A00]/10 px-4 py-2 text-xs font-medium text-[#FFB170] md:block">
            {previewBadge}
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-white/72">Nombre del nino</span>
              <input
                value={form.kidName}
                onChange={(event) => updateField("kidName", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none transition focus:border-[#FF7A00]"
                placeholder="Luna"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-white/72">Edad</span>
              <input
                value={form.age}
                onChange={(event) =>
                  updateField("age", Number(event.target.value))
                }
                className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none transition focus:border-[#FF7A00]"
                min={2}
                max={12}
                type="number"
                required
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-white/72">Idioma</span>
              <select
                value={form.language}
                onChange={(event) =>
                  updateField(
                    "language",
                    event.target.value as BedtimeRequest["language"],
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none transition focus:border-[#FF7A00]"
              >
                <option value="es">Espanol</option>
                <option value="en">English</option>
                <option value="bilingual">Bilingue</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-white/72">Estado de animo</span>
              <select
                value={form.bedtimeMood}
                onChange={(event) =>
                  updateField(
                    "bedtimeMood",
                    event.target.value as BedtimeRequest["bedtimeMood"],
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none transition focus:border-[#FF7A00]"
              >
                <option value="calm">Muy calmado</option>
                <option value="cozy">Calido y tierno</option>
                <option value="adventurous">Con aventura suave</option>
              </select>
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm text-white/72">Contexto cultural</span>
            <input
              value={form.culturalBackground}
              onChange={(event) =>
                updateField("culturalBackground", event.target.value)
              }
              className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none transition focus:border-[#FF7A00]"
              placeholder="Dominicana, andina, afrolatina, mexicana..."
              required
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-white/72">Lugar</span>
              <input
                value={form.location}
                onChange={(event) => updateField("location", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none transition focus:border-[#FF7A00]"
                placeholder="Quito, Ciudad de Panama, Miami..."
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-white/72">Tema central</span>
              <input
                value={form.theme}
                onChange={(event) => updateField("theme", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none transition focus:border-[#FF7A00]"
                placeholder="un bosque amable, una luna curiosa..."
                required
              />
            </label>
          </div>

          <div className="rounded-[28px] border border-[#FF7A00]/20 bg-[#FF7A00]/8 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">
                  Variables premium
                </p>
                <p className="mt-1 text-sm text-white/65">
                  Ya las dejo activas para este MVP. Luego las bloqueamos detras
                  del plan pago.
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateField("premium", !form.premium)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  form.premium
                    ? "bg-[#FF7A00] text-black"
                    : "border border-white/15 text-white/72"
                }`}
              >
                {form.premium ? "Premium activo" : "Modo simple"}
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm text-white/72">Animal favorito</span>
                <input
                  value={form.favoriteAnimal ?? ""}
                  onChange={(event) =>
                    updateField("favoriteAnimal", event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none transition focus:border-[#FF7A00]"
                  placeholder="conejo, mono, ballena..."
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-white/72">Color favorito</span>
                <input
                  value={form.favoriteColor ?? ""}
                  onChange={(event) =>
                    updateField("favoriteColor", event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none transition focus:border-[#FF7A00]"
                  placeholder="naranja"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-white/72">Leccion o valor</span>
                <input
                  value={form.moralLesson ?? ""}
                  onChange={(event) =>
                    updateField("moralLesson", event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none transition focus:border-[#FF7A00]"
                  placeholder="amabilidad, paciencia..."
                />
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#FF7A00] px-6 text-base font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Hilando el cuento..." : "Crear cuento"}
            </button>
            <p className="text-sm text-white/55">
              Genera historia, moraleja, consejo para el adulto y escenas
              ilustradas listas para demo.
            </p>
          </div>

          {illustrations.note ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70">
              {illustrations.note}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}
        </form>
      </section>

      <section className="space-y-5">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_120px_rgba(0,0,0,0.42)] backdrop-blur lg:p-8">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[#FF7A00]">
            preview vivo
          </div>
          <h3 className="mt-3 text-3xl font-semibold text-white">
            {deferredName || "Tu peque"} suena esta noche con algo mas suyo
          </h3>
          <p className="mt-3 max-w-xl text-base leading-7 text-white/70">
            Monobedtime mezcla identidad, lenguaje y calma. El resultado esta
            pensado para que un adulto lo lea en voz baja y el nino se sienta
            visto.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              "Culturalmente cercano",
              "Bilingue",
              "Listo para premium con Gemini",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-white/72"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        {story ? (
          <div className="space-y-5">
            <ScenePoster
              title={story.title}
              caption={story.summary}
              sceneType={story.coverScene.sceneType}
              imageDataUrl={illustrations.cover?.imageDataUrl}
            />

            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_120px_rgba(0,0,0,0.42)] backdrop-blur lg:p-8">
              <div className="flex flex-wrap gap-2">
                {story.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/60"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                    Idioma
                  </div>
                  <div className="mt-2 text-lg font-medium text-white">
                    {story.languageLabel}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                    Tiempo
                  </div>
                  <div className="mt-2 text-lg font-medium text-white">
                    {story.readingTimeMinutes} min
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                    Moraleja
                  </div>
                  <div className="mt-2 text-sm leading-6 text-white/72">
                    {story.moral}
                  </div>
                </div>
              </div>
            </div>

            {story.storyBlocks.map((block, index) => (
              <div
                key={`${block.heading}-${index}`}
                className="grid gap-4 rounded-[32px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur lg:grid-cols-[0.78fr_1fr]"
              >
                <ScenePoster
                  title={block.heading}
                  caption={block.imagePrompt}
                  sceneType={block.sceneType}
                  imageDataUrl={illustrations.blocks[index]?.imageDataUrl}
                />
                <div className="flex flex-col justify-center">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#FF7A00]">
                    escena {index + 1}
                  </div>
                  <h4 className="mt-3 text-2xl font-semibold text-white">
                    {block.heading}
                  </h4>
                  <p className="mt-4 whitespace-pre-line text-base leading-8 text-white/76">
                    {block.text}
                  </p>
                </div>
              </div>
            ))}

            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_120px_rgba(0,0,0,0.42)] backdrop-blur lg:p-8">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#FF7A00]">
                guia para quien lee
              </div>
              <p className="mt-3 text-2xl font-semibold text-white">
                {story.caregiverTip}
              </p>
              {illustrations.loading ? (
                <p className="mt-3 text-sm text-white/55">
                  Gemini esta ilustrando la portada y las primeras escenas en
                  segundo plano.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-[32px] border border-dashed border-white/15 bg-white/[0.02] p-8 text-white/58">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#FF7A00]">
              resultado
            </p>
            <p className="mt-4 text-lg leading-8">
              Aqui aparecera el cuento listo para leer, con portada, escenas
              ilustradas y un consejo final para cerrar la noche mejor.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
