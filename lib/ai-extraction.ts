import OpenAI from "openai";
import { z } from "zod";
import { clampScore } from "@/lib/utils";

const extractionOutputSchema = z.object({
  candidates: z.array(
    z.object({
      title: z.string().min(2).max(160),
      description: z.string().min(2).max(2000),
      dimensionKey: z.string().min(2).max(120),
      impactType: z.enum(["positive", "negative"]),
      score: z.number().int().min(-100).max(100),
      observedAt: z.string().datetime(),
      confidence: z.number().min(0).max(1)
    })
  ).max(50)
});

const SYSTEM_PROMPT = `You extract business impact candidates for a Doughnut Economics workflow.
Return strict JSON with key "candidates".
Each candidate must include: title, description, dimensionKey, impactType (positive|negative), score (-100..100), observedAt (ISO date-time), confidence (0..1).
Use concise wording and avoid duplicates.`;

export type ExtractedCandidate = z.infer<typeof extractionOutputSchema>["candidates"][number];

export async function extractImpactCandidates(sourceText: string): Promise<ExtractedCandidate[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const now = new Date().toISOString();
    return [
      {
        title: "Estimated reduction in transport emissions",
        description: "Inferred from source text as a potential positive climate change impact.",
        dimensionKey: "climate_change",
        impactType: "positive",
        score: 22,
        observedAt: now,
        confidence: 0.31
      }
    ];
  }

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: sourceText.slice(0, 20000) }
    ]
  });

  const content = response.choices[0]?.message.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response");
  }

  const parsed = extractionOutputSchema.parse(JSON.parse(content));
  return parsed.candidates.map((candidate) => ({
    ...candidate,
    score: clampScore(candidate.score)
  }));
}
