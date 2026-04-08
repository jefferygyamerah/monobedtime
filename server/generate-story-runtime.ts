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
    return "Español";
  }

  if (language === "en") {
    return "English";
  }

  return "Español + English";
}

function fallbackCopy(input: BedtimeRequest) {
  if (input.language === "en") {
    return {
      title: `${input.kidName} and the Little Lantern of ${input.location}`,
      summary: `${input.kidName} follows a gentle glowing lantern through ${input.location} and discovers that bedtime can feel safe, soft, and full of wonder.`,
      moral: "Rest grows easier when a child feels seen, safe, and connected to home.",
      caregiverTip: "Read slowly, pause after each paragraph, and let your child repeat the softest line before sleep.",
      blocks: [
        {
          heading: "A quiet beginning",
          text: `${input.kidName} looked out over ${input.location} while the evening settled in. The air felt ${input.bedtimeMood === "adventurous" ? "exciting but calm enough for a last little adventure" : "soft and slow, like a blanket made of stars"}.`,
          imagePrompt: `A cozy bedtime illustration in ${input.location} with a child named ${input.kidName}, glowing lantern light, premium picture-book composition`,
        },
        {
          heading: "The lantern listens",
          text: `A tiny lantern floated beside ${input.kidName} and whispered stories from ${input.culturalBackground}. It reminded ${input.kidName} that brave hearts can still love quiet moments.`,
          imagePrompt: `Bedtime story scene with a floating lantern, child from ${input.culturalBackground}, warm moonlight, gentle wonder`,
        },
        {
          heading: "Home in the heart",
          text: `Before the moon climbed too high, ${input.kidName} thought about ${input.theme}. The lantern glowed brighter, as if to say that home can travel inside a child wherever love goes.`,
          imagePrompt: `Moonlit bedtime scene about ${input.theme}, child feeling safe, orange glow, cinematic children's book style`,
        },
        {
          heading: "The softest goodnight",
          text: `${input.kidName} tucked the lantern into a pocket of dreams and crawled into bed. Soon the room was full of peaceful breaths, gentle hope, and the promise of tomorrow.`,
          imagePrompt: `Peaceful child falling asleep, cozy room, glowing stars, bedtime picture-book art`,
        },
      ],
      tags: ["bedtime", "comfort", "family", input.location.toLowerCase()],
    };
  }

  if (input.language === "bilingual") {
    return {
      title: `${input.kidName} y la Linterna de ${input.location} / ${input.kidName} and the Lantern of ${input.location}`,
      summary: `${input.kidName} sigue una linterna tranquila por ${input.location} y descubre una forma suave de quedarse dormido.\nEN: ${input.kidName} follows a gentle lantern through ${input.location} and discovers a softer way to fall asleep.`,
      moral: "Dormir mejor empieza cuando el niño se siente seguro, querido y cerca de su historia.\nEN: Better sleep starts when a child feels safe, loved, and close to their story.",
      caregiverTip: "Lee primero la parte en español y luego la parte en inglés con una voz más lenta.\nEN: Read the Spanish line first, then the English line in an even slower voice.",
      blocks: [
        {
          heading: "La noche comienza / Night begins",
          text: `${input.kidName} miró el cielo sobre ${input.location} y sintió que la noche se acomodaba despacito.\nEN: ${input.kidName} looked up at the sky over ${input.location} and felt the night settling in very gently.`,
          imagePrompt: `Bilingual bedtime illustration in ${input.location}, child named ${input.kidName}, soft glowing moon, premium picture book`,
        },
        {
          heading: "La linterna escucha / The lantern listens",
          text: `Una pequeña linterna dorada contó historias de ${input.culturalBackground} y dejó una calma bonita en el pecho de ${input.kidName}.\nEN: A little golden lantern shared stories from ${input.culturalBackground} and left a peaceful calm in ${input.kidName}'s chest.`,
          imagePrompt: `Child listening to cultural bedtime stories, glowing lantern, warm orange accents, children's book style`,
        },
        {
          heading: "Un sueño con propósito / A dream with purpose",
          text: `${input.kidName} pensó en ${input.theme} y la noche pareció sonreír.\nEN: ${input.kidName} thought about ${input.theme}, and the night seemed to smile back.`,
          imagePrompt: `Dreamy bedtime art about ${input.theme}, moonlight, calm child, soft premium illustration`,
        },
      ],
      tags: ["bilingual", "bedtime", "calm", input.location.toLowerCase()],
    };
  }

  return {
    title: `${input.kidName} y la Linterna de ${input.location}`,
    summary: `${input.kidName} sigue una linterna tranquila por ${input.location} y descubre que dormir también puede sentirse como volver a casa.`,
    moral: "Dormir mejor empieza cuando el niño se siente seguro, querido y orgulloso de su historia.",
    caregiverTip: "Lee con un ritmo lento y repite la última frase dos veces para que el cierre se sienta más relajante.",
    blocks: [
      {
        heading: "La noche se acomoda",
        text: `${input.kidName} miró la ventana y vio cómo ${input.location} se llenaba de sombras suaves. La noche no daba miedo; parecía una manta oscura con puntitos de luz.`,
        imagePrompt: `Ilustración infantil nocturna en ${input.location}, niño llamado ${input.kidName}, luna suave, libro infantil premium`,
      },
      {
        heading: "La linterna de la familia",
        text: `Una linterna pequeña salió a saludar y contó historias de ${input.culturalBackground}. Cada palabra sonaba conocida, como una canción que vive dentro del corazón.`,
        imagePrompt: `Linterna mágica contando historias familiares de ${input.culturalBackground}, calidez naranja, estética de cuento para dormir`,
      },
      {
        heading: "Un deseo tranquilo",
        text: `${input.kidName} pensó en ${input.theme} y dejó que el sueño caminara despacito hasta la cama. Nadie tenía prisa; la noche sabía exactamente cómo abrazarlo.`,
        imagePrompt: `Escena de cuento antes de dormir sobre ${input.theme}, niño sintiéndose seguro, luna y estrellas, ilustración premium`,
      },
      {
        heading: "Buenas noches, corazón",
        text: `Cuando la linterna se apagó, ${input.kidName} ya tenía los ojos pesados. Quedó dormido con una sonrisa pequeña y un pecho lleno de calma.`,
        imagePrompt: `Niño durmiendo plácidamente, cuarto acogedor, estrellas suaves, ilustración cálida`,
      },
    ],
    tags: ["cuentos", "dormir", "familia", input.location.toLowerCase()],
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
      heading: input.language === "en" ? "Tonight's cover" : "Portada de esta noche",
      text: fallback.summary,
      imagePrompt: fallback.blocks[0]?.imagePrompt ?? "Soft bedtime picture-book cover",
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
    input.premium
      ? "Premium mode is on. Use the optional details naturally and make the story feel more tailored and collectible."
      : "Keep the story simple, soothing, and elegant.",
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
