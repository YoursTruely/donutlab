import { z } from "zod";
import { DIMENSION_KEY_SET } from "@/lib/doughnut-dimensions";

export const companyAnalysisRequestSchema = z.object({
  companyName: z.string().trim().min(2).max(120)
});

export const companyImpactSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(2).max(2000),
  impactType: z.enum(["positive", "negative"]),
  dimensionKey: z.string().trim().refine((value) => DIMENSION_KEY_SET.has(value), {
    message: "Unknown dimension key"
  }),
  domain: z.enum(["social_foundation", "ecological_ceiling"]),
  score: z.number().int().min(-100).max(100),
  confidence: z.number().min(0).max(1),
  evidence: z.string().trim().min(2).max(500)
});

export const companyAnalysisSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  snapshotDate: z.string().datetime(),
  summary: z.string().trim().min(10).max(4000),
  impacts: z.array(companyImpactSchema).min(1).max(40),
  notes: z.string().trim().min(2).max(1000)
});

export type CompanyAnalysis = z.infer<typeof companyAnalysisSchema>;
