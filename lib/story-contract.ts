import { z } from "zod";

export const languageSchema = z.enum(["es", "en", "bilingual"]);
export const moodSchema = z.enum(["calm", "cozy", "adventurous"]);
export const sceneTypeSchema = z.enum([
  "moon",
  "clouds",
  "village",
  "forest",
  "jungle",
  "ocean",
  "mountains",
  "city",
]);

export const bedtimeRequestSchema = z
  .object({
    kidName: z.string().min(1).max(40),
    age: z.number().int().min(2).max(12),
    language: languageSchema,
    culturalBackground: z.string().min(1).max(80),
    location: z.string().min(1).max(80),
    theme: z.string().min(1).max(80),
    bedtimeMood: moodSchema,
    moralLesson: z.string().max(120).optional(),
    favoriteAnimal: z.string().max(40).optional(),
    favoriteColor: z.string().max(30).optional(),
    premium: z.boolean().default(false),
  })
  .strict();

export const storySceneSchema = z
  .object({
    heading: z.string().min(1).max(80),
    text: z.string().min(1).max(900),
    imagePrompt: z.string().min(1).max(240),
    sceneType: sceneTypeSchema,
  })
  .strict();

export const bedtimeResponseSchema = z
  .object({
    title: z.string().min(1).max(100),
    languageLabel: z.string().min(1).max(40),
    readingTimeMinutes: z.number().int().min(2).max(12),
    summary: z.string().min(1).max(220),
    moral: z.string().min(1).max(180),
    caregiverTip: z.string().min(1).max(200),
    coverScene: storySceneSchema,
    storyBlocks: z.array(storySceneSchema).min(3).max(4),
    tags: z.array(z.string().min(1).max(24)).min(3).max(6),
  })
  .strict();

export type BedtimeRequest = z.infer<typeof bedtimeRequestSchema>;
export type BedtimeResponse = z.infer<typeof bedtimeResponseSchema>;
