import { z } from "zod";
import { GRANULARITIES } from "@/lib/constants";

export const impactTypeSchema = z.enum(["positive", "negative"]);
export const reviewStatusSchema = z.enum(["pending", "accepted", "rejected"]);

export const createCompanySchema = z.object({
  name: z.string().trim().min(2).max(120)
});

export const createManualImpactSchema = z.object({
  companyId: z.string().cuid(),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(2).max(2000),
  impactType: impactTypeSchema,
  doughnutDimension: z.string().trim().min(2).max(120),
  score: z.number().int().min(-100).max(100),
  observedAt: z.string().datetime(),
  evidenceUrl: z.string().url().optional()
});

export const createExtractionJobSchema = z.object({
  companyId: z.string().cuid(),
  sourceText: z.string().trim().min(30).max(120000).optional(),
  fileId: z.string().trim().min(2).max(120).optional()
}).refine((value) => Boolean(value.sourceText || value.fileId), {
  message: "Either sourceText or fileId is required"
});

export const reviewDecisionInputSchema = z.object({
  candidateId: z.string().cuid(),
  status: z.enum(["accepted", "rejected"]),
  edits: z.object({
    title: z.string().trim().min(2).max(160).optional(),
    description: z.string().trim().min(2).max(2000).optional(),
    dimensionKey: z.string().trim().min(2).max(120).optional(),
    impactType: impactTypeSchema.optional(),
    score: z.number().int().min(-100).max(100).optional(),
    observedAt: z.string().datetime().optional()
  }).optional()
});

export const reviewExtractionSchema = z.object({
  jobId: z.string().cuid(),
  decisions: z.array(reviewDecisionInputSchema).min(1)
});

export const doughnutQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime()
});

export const trendQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  granularity: z.enum(GRANULARITIES)
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type CreateManualImpactInput = z.infer<typeof createManualImpactSchema>;
export type CreateExtractionJobInput = z.infer<typeof createExtractionJobSchema>;
export type ReviewExtractionInput = z.infer<typeof reviewExtractionSchema>;
