import OpenAI from "openai";
import { companyAnalysisRequestSchema, companyAnalysisSchema, type CompanyAnalysis } from "@/lib/company-analysis";
import { DOUGHNUT_DIMENSIONS, DIMENSION_BY_KEY } from "@/lib/doughnut-dimensions";
import { ok, serverError } from "@/lib/http";

const SYSTEM_PROMPT = `You are a business impact analyst using Doughnut Economics framing.
Generate a realistic high-level impact assessment for the company name provided.
Return strict JSON with keys: companyName, snapshotDate, summary, impacts, notes.
Each impact must include: title, description, impactType, dimensionKey, domain, score, confidence, evidence.
Use only the provided dimension keys and domain pairings.
Positive impacts should have positive scores. Negative impacts should have negative scores.
Avoid duplicate impacts.`;

function buildDimensionPrompt(): string {
  return DOUGHNUT_DIMENSIONS.map((dimension) => `${dimension.key} (${dimension.domain})`).join(", ");
}

function normalizeAnalysis(input: CompanyAnalysis): CompanyAnalysis {
  return {
    ...input,
    impacts: input.impacts.map((impact) => {
      const dimension = DIMENSION_BY_KEY.get(impact.dimensionKey);
      if (!dimension) {
        return impact;
      }

      const score = impact.impactType === "positive"
        ? Math.max(1, Math.abs(impact.score))
        : -Math.max(1, Math.abs(impact.score));

      return {
        ...impact,
        domain: dimension.domain,
        score
      };
    })
  };
}

function fallbackAnalysis(companyName: string): CompanyAnalysis {
  const now = new Date().toISOString();
  return {
    companyName,
    snapshotDate: now,
    summary: `${companyName} likely has mixed social and ecological impacts across operations, supply chain, workforce, and product lifecycle.`,
    notes: "Fallback analysis generated because OPENAI_API_KEY is not configured.",
    impacts: [
      {
        title: "Operational energy efficiency programs",
        description: "The company may invest in efficiency upgrades that reduce energy demand per unit output.",
        impactType: "positive",
        dimensionKey: "energy",
        domain: "social_foundation",
        score: 25,
        confidence: 0.45,
        evidence: "Inferred from common corporate sustainability practices."
      },
      {
        title: "Logistics greenhouse gas emissions",
        description: "Distribution and transportation may contribute to fossil fuel emissions.",
        impactType: "negative",
        dimensionKey: "climate_change",
        domain: "ecological_ceiling",
        score: -42,
        confidence: 0.52,
        evidence: "Inferred from likely transport and supply chain activity."
      },
      {
        title: "Employment and wage contribution",
        description: "The business may support local employment and income generation.",
        impactType: "positive",
        dimensionKey: "income_work",
        domain: "social_foundation",
        score: 34,
        confidence: 0.49,
        evidence: "Inferred from standard company labor footprint."
      },
      {
        title: "Supply chain water stress exposure",
        description: "Upstream suppliers may rely on water-intensive production in vulnerable regions.",
        impactType: "negative",
        dimensionKey: "freshwater_withdrawals",
        domain: "ecological_ceiling",
        score: -33,
        confidence: 0.4,
        evidence: "Inferred from typical global sourcing risk patterns."
      },
      {
        title: "Workforce training and skills",
        description: "Training efforts may contribute to employee capability development.",
        impactType: "positive",
        dimensionKey: "education",
        domain: "social_foundation",
        score: 18,
        confidence: 0.36,
        evidence: "Inferred from common internal L&D initiatives."
      },
      {
        title: "Waste and packaging externalities",
        description: "Product packaging and material choices may contribute to downstream pollution.",
        impactType: "negative",
        dimensionKey: "chemical_pollution",
        domain: "ecological_ceiling",
        score: -28,
        confidence: 0.41,
        evidence: "Inferred from typical materials lifecycle impacts."
      }
    ]
  };
}

async function analyzeWithOpenAI(companyName: string): Promise<CompanyAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackAnalysis(companyName);
  }

  const client = new OpenAI({ apiKey });

  const userPrompt = `Company: ${companyName}
Doughnut dimension keys you must use exactly:
${buildDimensionPrompt()}

Output JSON only.`;

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt }
    ]
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty content");
  }

  const parsed = companyAnalysisSchema.parse(JSON.parse(content));
  return normalizeAnalysis(parsed);
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { companyName } = companyAnalysisRequestSchema.parse(json);
    const analysis = await analyzeWithOpenAI(companyName);
    return ok({ analysis });
  } catch (error) {
    return serverError(error);
  }
}
