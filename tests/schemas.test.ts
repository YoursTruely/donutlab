import { describe, expect, it } from "vitest";
import { createManualImpactSchema, reviewExtractionSchema } from "../lib/schemas";

describe("schema validation", () => {
  it("accepts valid manual impact payload", () => {
    const payload = {
      companyId: "cm0abcde00000123456789ab",
      title: "Reduced transport emissions",
      description: "Shifted to rail freight for 40% of domestic logistics",
      impactType: "positive",
      doughnutDimension: "climate_change",
      score: 32,
      observedAt: new Date().toISOString()
    };

    const parsed = createManualImpactSchema.parse(payload);
    expect(parsed.score).toBe(32);
  });

  it("rejects empty review decision list", () => {
    const parsed = reviewExtractionSchema.safeParse({
      jobId: "cm0abcde00000123456789ab",
      decisions: []
    });

    expect(parsed.success).toBe(false);
  });
});
