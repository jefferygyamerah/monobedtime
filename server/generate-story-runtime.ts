import "server-only";

import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateText, Output } from "ai";
import {
  bedtimeRequestSchema,
  bedtimeResponseSchema,
  type BedtimeRequest,
  type BedtimeResponse,
} from "@/lib/story-contract";

let deepseekProvider: ReturnType<typeof createDeepSeek> | null = null;

function getDeepseek() {
  if (!deepseekProvider) {
    deepseekProvider = createDeepSeek({
      apiKey: process.env.DEEPSEEK_API_KEY ?? "",
    });
  }

  return deepseekProvider;
}

function normalizeOptional(value?: string) {
  return value?.trim() || "none";
}

function languageLabel(language: BedtimeRequest["language"]) {
  if (language === "es") {
    return "Espanol";
  }

  if (language === "en") {
    return "English";
  }

  return "Espanol + English";
}

function fallbackCopy(input: BedtimeRequest) {
  if (input.language === "en") {
    return {
      title: `${input.kidName}, Mono, and the Little Lantern of ${input.location}`,
      summary: `${input.kidName} follows Mono, a gentle monkey guide, through ${input.location} and discovers that bedtime can feel safe, soft, and full of wonder.`,
      moral:
        "Rest grows easier when a child feels seen, safe, and gently guided toward home.",
      caregiverTip:
        "Read Mono's lines with a softer voice so your child feels accompanied instead of rushed into sleep.",
      blocks: [
        {
          heading: "Mono arrives first",
          text: `${input.kidName} looked out over ${input.location} while the evening settled in. Then Mono, a calm little monkey with a lantern glow, appeared beside the window and made the whole room feel friendlier.`,
          imagePrompt: `A cozy bedtime illustration in ${input.location} with a child named ${input.kidName} and a gentle monkey guide named Mono, glowing lantern light, premium picture-book composition`,
        },
        {
          heading: "Stories that feel like home",
          text: `Mono padded softly beside ${input.kidName} and shared bedtime stories from ${input.culturalBackground}. Every word felt familiar, as if home had quietly sat down beside the bed.`,
          imagePrompt: `Bedtime story scene with Mono the monkey guide, child from ${input.culturalBackground}, warm moonlight, gentle wonder`,
        },
        {
          heading: "A dream with a hand to hold",
          text: `Before the moon climbed too high, ${input.kidName} thought about ${input.theme}. Mono lifted the lantern a little higher, as if to say that brave hearts can still choose calm.`,
          imagePrompt: `Moonlit bedtime scene about ${input.theme}, child and monkey guide Mono feeling safe, orange glow, cinematic children's book style`,
        },
        {
          heading: "The softest goodnight",
          text: `Mono tucked the lantern near the pillow, smiled, and reminded ${input.kidName} that sleep can feel like being carried by kindness. Soon the room was full of peaceful breaths and tomorrow's promise.`,
          imagePrompt: `Peaceful child falling asleep with a gentle monkey guide nearby, cozy room, glowing stars, bedtime picture-book art`,
        },
      ],
      tags: ["mono", "bedtime", "comfort", "family", input.location.toLowerCase()],
    };
  }

  if (input.language === "bilingual") {
    return {
      title: `${input.kidName}, Mono y la Linterna de ${input.location} / ${input.kidName}, Mono, and the Lantern of ${input.location}`,
      summary: `${input.kidName} sigue a Mono, un mono suave y curioso, por ${input.location} y descubre una forma mas tranquila de quedarse dormido.\nEN: ${input.kidName} follows Mono, a gentle curious monkey, through ${input.location} and discovers a calmer way to fall asleep.`,
      moral:
        "Dormir mejor empieza cuando el nino se siente seguro, querido y acompanado.\nEN: Better sleep starts when a child feels safe, loved, and gently accompanied.",
      caregiverTip:
        "Lee las frases de Mono con una voz serena y un poco mas baja.\nEN: Read Mono's lines in a softer, slower voice.",
      blocks: [
        {
          heading: "Mono llega primero / Mono arrives first",
          text: `${input.kidName} miro el cielo sobre ${input.location} y sintio que la noche se acomodaba despacito. Entonces Mono aparecio con una linterna tibia.\nEN: ${input.kidName} looked up at the sky over ${input.location} and felt the night settling in very gently. Then Mono appeared with a warm lantern.`,
          imagePrompt: `Bilingual bedtime illustration in ${input.location}, child named ${input.kidName}, gentle monkey guide Mono, soft moonlight, premium picture book`,
        },
        {
          heading: "Historias cercanas / Stories close to home",
          text: `Mono conto historias de ${input.culturalBackground} y dejo una calma bonita en el pecho de ${input.kidName}.\nEN: Mono shared stories from ${input.culturalBackground} and left a peaceful calm in ${input.kidName}'s chest.`,
          imagePrompt: `Child listening to cultural bedtime stories with Mono the monkey guide, warm orange accents, children's book style`,
        },
        {
          heading: "Un sueno con Mono / A dream with Mono",
          text: `${input.kidName} penso en ${input.theme} y la noche parecio sonreir.\nEN: ${input.kidName} thought about ${input.theme}, and the night seemed to smile back while Mono stayed close.`,
          imagePrompt: `Dreamy bedtime art about ${input.theme}, moonlight, calm child and monkey guide Mono, soft premium illustration`,
        },
      ],
      tags: ["mono", "bilingual", "bedtime", "calm", input.location.toLowerCase()],
    };
  }

  return {
    title: `${input.kidName}, Mono y la Linterna de ${input.location}`,
    summary: `${input.kidName} sigue a Mono, un mono tranquilo con una linterna suave, por ${input.location} y descubre que dormir tambien puede sentirse como volver a casa.`,
    moral:
      "Dormir mejor empieza cuando el nino se siente seguro, querido y guiado con ternura.",
    caregiverTip:
      "Lee las partes de Mono con una voz mas calmada para que el cuento se sienta como compania, no como una instruccion.",
    blocks: [
      {
        heading: "Mono aparece en la ventana",
        text: `${input.kidName} miro la ventana y vio como ${input.location} se llenaba de sombras suaves. Entonces Mono aparecio con una linterna pequena y la noche dejo de sentirse tan grande.`,
        imagePrompt: `Ilustracion infantil nocturna en ${input.location}, nino llamado ${input.kidName}, Mono the monkey guide, luna suave, libro infantil premium`,
      },
      {
        heading: "Mono trae historias de casa",
        text: `Mono se sento al lado de ${input.kidName} y conto historias de ${input.culturalBackground}. Cada palabra sonaba conocida, como una cancion pequena que ya vivia dentro del corazon.`,
        imagePrompt: `Mono the monkey guide contando historias familiares de ${input.culturalBackground}, calidez naranja, estetica de cuento para dormir`,
      },
      {
        heading: "Un deseo tranquilo",
        text: `${input.kidName} penso en ${input.theme} y dejo que el sueno caminara despacito hasta la cama. Mono no apresuro nada; solo acompanaba con calma.`,
        imagePrompt: `Escena de cuento antes de dormir sobre ${input.theme}, nino sintiendose seguro, Mono the monkey guide, luna y estrellas, ilustracion premium`,
      },
      {
        heading: "Buenas noches con Mono",
        text: `Cuando Mono bajo la luz de la linterna, ${input.kidName} ya tenia los ojos pesados. Quedo dormido con una sonrisa pequena y el pecho lleno de calma.`,
        imagePrompt: `Nino durmiendo placidamente con Mono the monkey guide cerca, cuarto acogedor, estrellas suaves, ilustracion calida`,
      },
    ],
    tags: ["mono", "cuentos", "dormir", "familia", input.location.toLowerCase()],
  };
}

function sceneTypeAt(index: number) {
  const cycle: BedtimeResponse["storyBlocks"][number]["sceneType"][] = [
    "moon",
    "village",
    "forest",
    "clouds",
  ];

  return cycle[index % cycle.length];
}

function buildFallbackStory(input: BedtimeRequest): BedtimeResponse {
  const fallback = fallbackCopy(input);

  return bedtimeResponseSchema.parse({
    title: fallback.title,
    languageLabel: languageLabel(input.language),
    readingTimeMinutes: input.premium ? 7 : 4,
    summary: fallback.summary,
    moral: fallback.moral,
    caregiverTip: fallback.caregiverTip,
    coverScene: {
      heading: input.language === "en" ? "Tonight with Mono" : "Esta noche con Mono",
      text: fallback.summary,
      imagePrompt:
        fallback.blocks[0]?.imagePrompt ??
        "Soft bedtime picture-book cover with Mono the monkey guide",
      sceneType: "moon",
    },
    storyBlocks: fallback.blocks.map((block, index) => ({
      heading: block.heading,
      text: block.text,
      imagePrompt: block.imagePrompt,
      sceneType: sceneTypeAt(index),
    })),
    tags: fallback.tags.slice(0, 6),
  });
}

function buildSystemPrompt(input: BedtimeRequest) {
  return [
    "You create premium bedtime stories for families.",
    "Return only data that matches the schema exactly.",
    "Mono is the central recurring monkey guide in the Monobedtime universe.",
    "Unless the user clearly asks otherwise, Mono must appear as a gentle, emotionally safe companion in the cover scene and at least two story blocks.",
    "The tone must be sleepy, gentle, emotionally safe, and age-appropriate.",
    `The child's name is ${input.kidName} and the child is ${input.age} years old.`,
    `The requested language mode is ${input.language}.`,
    input.language === "es"
      ? "Every string must be in natural Spanish."
      : input.language === "en"
        ? "Every string must be in natural English."
        : "Every string must be bilingual: Spanish first, then English on a new line prefixed with 'EN:'.",
    "Avoid scary conflict, loud endings, or fast pacing.",
    "Each story block should feel visual enough for a future picture-book illustration.",
    "Mono should never feel chaotic or mischievous. Mono is calm, warm, loyal, and softly magical.",
    "Pick sceneType values only from this set: moon, clouds, village, forest, jungle, ocean, mountains, city.",
  ].join("\n");
}

function buildPrompt(input: BedtimeRequest) {
  return [
    `Create a bedtime story for ${input.kidName}.`,
    `Age: ${input.age}`,
    `Cultural background: ${input.culturalBackground}`,
    `Current location: ${input.location}`,
    `Core theme: ${input.theme}`,
    `Bedtime mood: ${input.bedtimeMood}`,
    `Favorite animal: ${normalizeOptional(input.favoriteAnimal)}`,
    `Favorite color: ${normalizeOptional(input.favoriteColor)}`,
    `Moral or lesson: ${normalizeOptional(input.moralLesson)}`,
    "Mono is the signature monkey guide for Monobedtime and should feel central, recognizable, and kind.",
    input.premium
      ? "Premium mode is on. Use the optional details naturally and make the story feel more tailored, collectible, and visually rich."
      : "Keep the story simple, soothing, elegant, and still include Mono naturally.",
    "Return a title, summary, cover scene, 3 or 4 story blocks, a moral, a caregiver tip, and tags.",
  ].join("\n");
}

export async function generateBedtimeStory(rawInput: unknown) {
  const input = bedtimeRequestSchema.parse(rawInput);

  if (!process.env.DEEPSEEK_API_KEY) {
    return buildFallbackStory(input);
  }

  try {
    const { output } = await generateText({
      model: getDeepseek()("deepseek-chat"),
      temperature: 0.8,
      system: buildSystemPrompt(input),
      prompt: buildPrompt(input),
      output: Output.object({
        schema: bedtimeResponseSchema,
      }),
    });

    return bedtimeResponseSchema.parse(output);
  } catch (error) {
    console.error("Monobedtime story generation fell back to local template:", error);
    return buildFallbackStory(input);
  }
}
