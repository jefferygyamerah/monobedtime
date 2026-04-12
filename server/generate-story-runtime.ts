import "server-only";

import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import {
  bedtimeRequestSchema,
  bedtimeResponseSchema,
  sceneTypeSchema,
  type BedtimeRequest,
  type BedtimeResponse,
} from "@/lib/story-contract";
import { z } from "zod";

let deepseekProvider: ReturnType<typeof createDeepSeek> | null = null;
let googleProvider: ReturnType<typeof createGoogleGenerativeAI> | null = null;

const TARGET_STORY_WORD_COUNT = 600;
const MIN_QUALITY_SCORE = 7;
const MAX_TITLE_CHARS = 100;
const MAX_LANGUAGE_LABEL_CHARS = 40;
const MAX_SUMMARY_CHARS = 220;
const MAX_MORAL_CHARS = 180;
const MAX_CAREGIVER_TIP_CHARS = 200;
const MAX_HEADING_CHARS = 80;
const MAX_IMAGE_PROMPT_CHARS = 240;
const MAX_TAG_CHARS = 24;
const MIN_TAGS = 3;
const MAX_TAGS = 6;

const storySceneDraftSchema = z
  .object({
    heading: z.string().min(1).max(200),
    text: z.string().min(1).max(2400),
    imagePrompt: z.string().min(1).max(800),
    sceneType: sceneTypeSchema,
  })
  .strict();

const bedtimeResponseDraftSchema = z
  .object({
    title: z.string().min(1).max(200),
    languageLabel: z.string().min(1).max(80),
    readingTimeMinutes: z.number().int().min(2).max(12),
    summary: z.string().min(1).max(1200),
    moral: z.string().min(1).max(800),
    caregiverTip: z.string().min(1).max(800),
    coverScene: storySceneDraftSchema,
    storyBlocks: z.array(storySceneDraftSchema).min(3).max(4),
    tags: z.array(z.string().min(1).max(60)).min(3).max(10),
  })
  .strict();

type BedtimeResponseDraft = z.infer<typeof bedtimeResponseDraftSchema>;

function getDeepseek() {
  if (!deepseekProvider) {
    deepseekProvider = createDeepSeek({
      apiKey: process.env.DEEPSEEK_API_KEY ?? "",
    });
  }

  return deepseekProvider;
}

function getGoogle() {
  if (!googleProvider) {
    googleProvider = createGoogleGenerativeAI({
      apiKey:
        process.env.GEMINI_API_KEY ??
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
        "",
    });
  }

  return googleProvider;
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

function splitWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function joinWords(words: string[]) {
  return words.join(" ").replace(/\s+([,.;:!?])/g, "$1").trim();
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function trimToMaxChars(value: string, maxChars: number) {
  const normalized = normalizeWhitespace(value);

  if (normalized.length <= maxChars) {
    return normalized;
  }

  return normalized.slice(0, maxChars).trimEnd();
}

function sanitizeTags(tags: string[]) {
  const cleaned = tags
    .map((tag) => trimToMaxChars(tag, MAX_TAG_CHARS).toLowerCase())
    .filter(Boolean)
    .slice(0, MAX_TAGS);

  const fallbackTags = ["mono", "bedtime", "calm"];

  for (const fallbackTag of fallbackTags) {
    if (cleaned.length >= MIN_TAGS) {
      break;
    }

    if (!cleaned.includes(fallbackTag)) {
      cleaned.push(fallbackTag);
    }
  }

  return cleaned;
}

function sanitizeStoryMetadata(story: BedtimeResponseDraft | BedtimeResponse): BedtimeResponse {
  return {
    ...story,
    title: trimToMaxChars(story.title, MAX_TITLE_CHARS),
    languageLabel: trimToMaxChars(story.languageLabel, MAX_LANGUAGE_LABEL_CHARS),
    summary: trimToMaxChars(story.summary, MAX_SUMMARY_CHARS),
    moral: trimToMaxChars(story.moral, MAX_MORAL_CHARS),
    caregiverTip: trimToMaxChars(story.caregiverTip, MAX_CAREGIVER_TIP_CHARS),
    coverScene: {
      ...story.coverScene,
      heading: trimToMaxChars(story.coverScene.heading, MAX_HEADING_CHARS),
      imagePrompt: trimToMaxChars(story.coverScene.imagePrompt, MAX_IMAGE_PROMPT_CHARS),
    },
    storyBlocks: story.storyBlocks.slice(0, 4).map((block) => ({
      ...block,
      heading: trimToMaxChars(block.heading, MAX_HEADING_CHARS),
      imagePrompt: trimToMaxChars(block.imagePrompt, MAX_IMAGE_PROMPT_CHARS),
    })),
    tags: sanitizeTags(story.tags),
  };
}

function countStoryWords(story: BedtimeResponse) {
  return (
    splitWords(story.coverScene.text).length +
    story.storyBlocks.reduce((total, block) => total + splitWords(block.text).length, 0)
  );
}

function isGeminiReviewerConfigured() {
  return Boolean(
    (process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY)?.trim(),
  );
}

function fillerWordStream(input: BedtimeRequest) {
  const chunks = [
    `${input.kidName} breathes slowly while Mono keeps a warm, steady watch near the blanket.`,
    `The room stays gentle and safe, with soft moonlight and quiet comfort all around.`,
    `Every small breath feels calmer, and bedtime feels easier with Mono close by.`,
  ];

  return splitWords(chunks.join(" "));
}

function buildCanonicalWordPool() {
  return splitWords(
    [
      "Mono stays near.",
      "The room is calm.",
      "Soft moon light glows.",
      "Slow breath in.",
      "Slow breath out.",
      "Warm bed and safe night.",
      "A kind guide waits close.",
      "Small eyes grow heavy.",
      "Quiet hands rest now.",
      "Sleep comes with care.",
    ].join(" "),
  );
}

function chunkArray(words: string[], chunkSize: number) {
  const chunks: string[][] = [];

  for (let index = 0; index < words.length; index += chunkSize) {
    chunks.push(words.slice(index, index + chunkSize));
  }

  return chunks;
}

function splitIntoEvenChunks(words: string[], chunkCount: number) {
  const chunks: string[][] = [];
  const base = Math.floor(words.length / chunkCount);
  let remainder = words.length % chunkCount;
  let cursor = 0;

  for (let index = 0; index < chunkCount; index += 1) {
    const size = base + (remainder > 0 ? 1 : 0);
    chunks.push(words.slice(cursor, cursor + size));
    cursor += size;
    if (remainder > 0) {
      remainder -= 1;
    }
  }

  return chunks;
}

function ensureExactWordCount(story: BedtimeResponseDraft | BedtimeResponse, input: BedtimeRequest) {
  let adjusted = bedtimeResponseSchema.parse(
    sanitizeStoryMetadata(enforceStoryWordCount(story, input)),
  );
  let guard = 0;

  while (countStoryWords(adjusted) !== TARGET_STORY_WORD_COUNT && guard < 3) {
    adjusted = bedtimeResponseSchema.parse(
      sanitizeStoryMetadata(enforceStoryWordCount(adjusted, input)),
    );
    guard += 1;
  }

  return adjusted;
}

function enforceStoryWordCount(story: BedtimeResponseDraft | BedtimeResponse, input: BedtimeRequest) {
  const MAX_BLOCK_CHARS = 900;
  const MIN_BLOCK_WORDS = 24;
  const TARGET_BLOCKS = 4;
  const MAX_COVER_WORDS = 130;

  const nextStory: BedtimeResponse = {
    ...story,
    readingTimeMinutes: 10,
    coverScene: { ...story.coverScene },
    storyBlocks: story.storyBlocks.map((block) => ({ ...block })),
  };

  let coverWords = splitWords(nextStory.coverScene.text);

  while (
    coverWords.length > MAX_COVER_WORDS ||
    joinWords(coverWords).length > MAX_BLOCK_CHARS
  ) {
    coverWords = coverWords.slice(0, Math.max(20, coverWords.length - 1));
  }

  nextStory.coverScene = {
    ...nextStory.coverScene,
    text: joinWords(coverWords),
  };

  while (nextStory.storyBlocks.length < TARGET_BLOCKS) {
    const source = nextStory.storyBlocks[nextStory.storyBlocks.length - 1] ?? nextStory.coverScene;
    nextStory.storyBlocks.push({
      heading: `Night step ${nextStory.storyBlocks.length + 1}`,
      text: source.text,
      imagePrompt: source.imagePrompt,
      sceneType: source.sceneType,
    });
  }

  const blockWords = nextStory.storyBlocks.map((block) => splitWords(block.text));
  const targetBlockWordCount = Math.max(
    MIN_BLOCK_WORDS * TARGET_BLOCKS,
    TARGET_STORY_WORD_COUNT - coverWords.length,
  );

  for (let index = 0; index < blockWords.length; index += 1) {
    while (
      blockWords[index].length > MIN_BLOCK_WORDS &&
      joinWords(blockWords[index]).length > MAX_BLOCK_CHARS
    ) {
      blockWords[index].pop();
    }
  }

  let currentTotal = blockWords.reduce((total, words) => total + words.length, 0);

  // Trim overflow by removing words from the end, distributed from later pages first.
  if (currentTotal > targetBlockWordCount) {
    let overflow = currentTotal - targetBlockWordCount;

    for (let index = blockWords.length - 1; index >= 0 && overflow > 0; index -= 1) {
      const removable = Math.max(0, blockWords[index].length - MIN_BLOCK_WORDS);
      const toRemove = Math.min(removable, overflow);

      if (toRemove > 0) {
        blockWords[index] = blockWords[index].slice(0, blockWords[index].length - toRemove);
        overflow -= toRemove;
      }
    }

    currentTotal = blockWords.reduce((total, words) => total + words.length, 0);
  }

  // Fill deficit with calming filler words while respecting 900-char limit per block.
  if (currentTotal < targetBlockWordCount) {
    const filler = fillerWordStream(input);
    let fillerIndex = 0;
    let deficit = targetBlockWordCount - currentTotal;
    let blockCursor = blockWords.length - 1;

    while (deficit > 0) {
      const word = filler[fillerIndex % filler.length];
      const nextWords = [...blockWords[blockCursor], word];
      const nextText = joinWords(nextWords);

      if (nextText.length <= MAX_BLOCK_CHARS) {
        blockWords[blockCursor] = nextWords;
        deficit -= 1;
      }

      fillerIndex += 1;
      blockCursor = (blockCursor - 1 + blockWords.length) % blockWords.length;

      if (fillerIndex > TARGET_STORY_WORD_COUNT * 20) {
        break;
      }
    }
  }

  const finalWordCount = blockWords.reduce((total, words) => total + words.length, 0);

  if (finalWordCount !== targetBlockWordCount) {
    const canonicalPool = buildCanonicalWordPool();
    const canonicalWords: string[] = [];

    while (canonicalWords.length < targetBlockWordCount) {
      canonicalWords.push(...canonicalPool);
    }

    const exactWords = canonicalWords.slice(0, targetBlockWordCount);
    const chunks = splitIntoEvenChunks(exactWords, TARGET_BLOCKS);

    for (let index = 0; index < TARGET_BLOCKS; index += 1) {
      blockWords[index] = chunks[index] ?? [];
    }
  }

  for (let index = 0; index < blockWords.length; index += 1) {
    while (
      blockWords[index].length > MIN_BLOCK_WORDS &&
      joinWords(blockWords[index]).length > MAX_BLOCK_CHARS
    ) {
      blockWords[index].pop();
    }
  }

  nextStory.storyBlocks = nextStory.storyBlocks.map((block, index) => ({
    ...block,
    text: joinWords(blockWords[index]),
  }));

  return nextStory;
}

const qualityReviewSchema = z
  .object({
    coherenceScore: z.number().int().min(1).max(10),
    engagementScore: z.number().int().min(1).max(10),
    soothingScore: z.number().int().min(1).max(10),
    needsRevision: z.boolean(),
    reason: z.string().min(1).max(220),
  })
  .strict();

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

  const baseStory = bedtimeResponseSchema.parse({
    title: trimToMaxChars(fallback.title, MAX_TITLE_CHARS),
    languageLabel: trimToMaxChars(
      languageLabel(input.language),
      MAX_LANGUAGE_LABEL_CHARS,
    ),
    readingTimeMinutes: 10,
    summary: trimToMaxChars(fallback.summary, MAX_SUMMARY_CHARS),
    moral: trimToMaxChars(fallback.moral, MAX_MORAL_CHARS),
    caregiverTip: trimToMaxChars(fallback.caregiverTip, MAX_CAREGIVER_TIP_CHARS),
    coverScene: {
      heading: trimToMaxChars(
        input.language === "en" ? "Tonight with Mono" : "Esta noche con Mono",
        MAX_HEADING_CHARS,
      ),
      text: fallback.summary,
      imagePrompt: trimToMaxChars(
        fallback.blocks[0]?.imagePrompt ??
          "Soft bedtime picture-book cover with Mono the monkey guide",
        MAX_IMAGE_PROMPT_CHARS,
      ),
      sceneType: "moon",
    },
    storyBlocks: fallback.blocks.map((block, index) => ({
      heading: trimToMaxChars(block.heading, MAX_HEADING_CHARS),
      text: block.text,
      imagePrompt: trimToMaxChars(block.imagePrompt, MAX_IMAGE_PROMPT_CHARS),
      sceneType: sceneTypeAt(index),
    })),
    tags: sanitizeTags(fallback.tags),
  });

  return ensureExactWordCount(baseStory, input);
}

function buildSystemPrompt(input: BedtimeRequest) {
  return [
    "You create premium bedtime stories for families.",
    "Return only data that matches the schema exactly.",
    "Mono is the central recurring monkey guide in the Monobedtime universe.",
    "Unless the user clearly asks otherwise, Mono must appear as a gentle, emotionally safe companion in the cover scene and at least two story blocks.",
    "The tone must be sleepy, gentle, emotionally safe, and age-appropriate.",
    `The child's name is ${input.kidName} and the child is ${input.age} years old.`,
    input.age <= 1
      ? "This story is being read aloud to an infant by a caregiver. Use very gentle imagery, simple soothing language, and no school-age assumptions."
      : "This story may be read to or with a young child. Keep it gentle and calming.",
    `The requested language mode is ${input.language}.`,
    input.language === "es"
      ? "Every string must be in natural Spanish."
      : input.language === "en"
        ? "Every string must be in natural English."
        : "Every string must be bilingual: Spanish first, then English on a new line prefixed with 'EN:'.",
    "Avoid scary conflict, loud endings, or fast pacing.",
    "readingTimeMinutes must be exactly 10.",
    "Total words across coverScene.text and storyBlocks.text combined must be exactly 600.",
    "Hard limits: summary must stay under 220 characters, moral under 180 characters, caregiverTip under 200 characters, headings under 80 characters, and imagePrompt under 240 characters.",
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
    "Set readingTimeMinutes to exactly 10.",
    "Set the total word count across coverScene.text and storyBlocks.text combined to exactly 600.",
  ].join("\n");
}

function buildGeminiReviewPrompt(story: BedtimeResponse, input: BedtimeRequest) {
  return [
    "Review this bedtime story draft for quality.",
    `Target age: ${input.age}`,
    `Language mode: ${input.language}`,
    `Required story word count across coverScene.text and storyBlocks.text combined: ${TARGET_STORY_WORD_COUNT}`,
    "Score coherence, engagement, and soothing tone from 1 to 10.",
    "Set needsRevision true if any score is below 7 or if the word count is not exactly 600.",
    "Reason must be one short sentence explaining the main issue.",
    "",
    "Story draft JSON:",
    JSON.stringify(story),
  ].join("\n");
}

function buildGeminiRewritePrompt(
  story: BedtimeResponse,
  input: BedtimeRequest,
  reviewReason: string,
) {
  return [
    "Rewrite this bedtime story draft to improve coherence and engagement while staying emotionally safe and sleepy.",
    `Child: ${input.kidName}, age ${input.age}`,
    `Language mode: ${input.language}`,
    "Mono must remain the central guide character.",
    "Preserve structure and schema shape.",
    "Hard requirements:",
    `1) readingTimeMinutes must be exactly 10`,
    `2) Total words across coverScene.text and storyBlocks.text combined must be exactly ${TARGET_STORY_WORD_COUNT}`,
    "3) Keep summary <=220 chars, moral <=180 chars, caregiverTip <=200 chars, each heading <=80 chars, each imagePrompt <=240 chars",
    `Main issue found by reviewer: ${reviewReason}`,
    "",
    "Draft JSON to improve:",
    JSON.stringify(story),
  ].join("\n");
}

async function reviewStoryWithGemini(story: BedtimeResponse, input: BedtimeRequest) {
  const { output } = await generateText({
    model: getGoogle()("gemini-2.5-flash"),
    temperature: 0.2,
    prompt: buildGeminiReviewPrompt(story, input),
    output: Output.object({
      schema: qualityReviewSchema,
    }),
  });

  return qualityReviewSchema.parse(output);
}

async function rewriteStoryWithGemini(
  story: BedtimeResponse,
  input: BedtimeRequest,
  reviewReason: string,
) {
  const { output } = await generateText({
    model: getGoogle()("gemini-2.5-flash"),
    temperature: 0.7,
    prompt: buildGeminiRewritePrompt(story, input, reviewReason),
    output: Output.object({
      schema: bedtimeResponseDraftSchema,
    }),
  });

  return ensureExactWordCount(bedtimeResponseDraftSchema.parse(output), input);
}

async function applyGeminiQualityPass(story: BedtimeResponse, input: BedtimeRequest) {
  const reviewed = await reviewStoryWithGemini(story, input);
  const storyWordCount = countStoryWords(story);
  const lowScore =
    reviewed.coherenceScore < MIN_QUALITY_SCORE ||
    reviewed.engagementScore < MIN_QUALITY_SCORE ||
    reviewed.soothingScore < MIN_QUALITY_SCORE;

  if (!reviewed.needsRevision && !lowScore && storyWordCount === TARGET_STORY_WORD_COUNT) {
    return story;
  }

  const rewritten = await rewriteStoryWithGemini(story, input, reviewed.reason);
  return rewritten;
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
        schema: bedtimeResponseDraftSchema,
      }),
    });
    let story = ensureExactWordCount(bedtimeResponseDraftSchema.parse(output), input);

    if (isGeminiReviewerConfigured()) {
      try {
        story = await applyGeminiQualityPass(story, input);
      } catch (geminiError) {
        console.error("Gemini quality pass failed, keeping DeepSeek story:", geminiError);
      }
    }

    return story;
  } catch (error) {
    console.error("Monobedtime story generation fell back to local template:", error);
    return buildFallbackStory(input);
  }
}
