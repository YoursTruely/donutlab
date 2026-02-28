"use client";

import { FormEvent, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DoughnutChart } from "@/components/charts/doughnut-chart";
import { type CompanyAnalysis } from "@/lib/company-analysis";
import { DIMENSION_BY_KEY, DOUGHNUT_DIMENSIONS } from "@/lib/doughnut-dimensions";

export function MvpDashboard() {
  const [companyName, setCompanyName] = useState("");
  const [analysis, setAnalysis] = useState<CompanyAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyName.trim()) {
      setError("Please enter a company name.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/company-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: companyName.trim() })
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Could not analyze company");
      }

      setAnalysis(json.analysis as CompanyAnalysis);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unknown error");
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }

  const chartDimensions = useMemo(() => {
    const aggregate = new Map<string, { positiveScore: number; negativeScore: number }>();

    if (analysis) {
      for (const impact of analysis.impacts) {
        if (!aggregate.has(impact.dimensionKey)) {
          aggregate.set(impact.dimensionKey, { positiveScore: 0, negativeScore: 0 });
        }

        const bucket = aggregate.get(impact.dimensionKey)!;
        if (impact.impactType === "positive") {
          bucket.positiveScore += Math.abs(impact.score);
        } else {
          bucket.negativeScore += Math.abs(impact.score);
        }
      }
    }

    return DOUGHNUT_DIMENSIONS.map((dimension) => {
      const scores = aggregate.get(dimension.key) ?? { positiveScore: 0, negativeScore: 0 };
      return {
        dimensionKey: dimension.key,
        dimensionName: dimension.name,
        domain: dimension.domain,
        positiveScore: scores.positiveScore,
        negativeScore: scores.negativeScore
      };
    });
  }, [analysis]);

  return (
    <main className="mx-auto min-h-screen max-w-7xl p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-emerald-950">Doughnut Company Mapper (MVP)</h1>
        <p className="mt-1 text-sm text-emerald-900/80">
          Enter a company name. The app uses OpenAI to identify key impacts and map them onto Doughnut dimensions.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-300 bg-zinc-200/60 p-4 md:p-6">
        <form className="mb-4 rounded-lg bg-white p-4" onSubmit={onSubmit}>
          <label className="mb-2 block text-sm font-semibold text-zinc-900">Company name</label>
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="e.g. Patagonia, Unilever, Tesla"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
            />
            <Button type="submit" disabled={loading} className="md:w-48">
              {loading ? "Analyzing..." : "Analyze Company"}
            </Button>
          </div>
          {error ? <p className="mt-2 text-sm font-medium text-rose-700">{error}</p> : null}
        </form>

        <div className="rounded-lg border border-zinc-300 bg-white p-3">
          <DoughnutChart dimensions={chartDimensions} height={620} />
        </div>
      </section>

      <section className="mt-4">
        <Card title="Analysis Summary">
          {analysis ? (
            <>
              <p className="text-sm font-semibold text-emerald-900">{analysis.companyName}</p>
              <p className="mt-1 text-xs text-emerald-900/70">Snapshot: {new Date(analysis.snapshotDate).toLocaleString()}</p>
              <p className="mt-3 text-sm text-emerald-900/90">{analysis.summary}</p>
              <p className="mt-3 text-xs text-emerald-900/70">{analysis.notes}</p>
            </>
          ) : (
            <p className="text-sm text-emerald-900/70">No analysis yet.</p>
          )}
        </Card>
      </section>

      <section className="mt-4">
        <Card title="Impacts Extracted">
          {analysis?.impacts?.length ? (
            <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
              {analysis.impacts.map((impact, index) => {
                const dimension = DIMENSION_BY_KEY.get(impact.dimensionKey);
                return (
                  <article key={`${impact.title}-${index}`} className="rounded-md border border-emerald-100 bg-emerald-50/30 p-3">
                    <p className="text-sm font-semibold text-emerald-950">{impact.title}</p>
                    <p className="mt-1 text-xs text-emerald-900/80">{impact.description}</p>
                    <p className="mt-2 text-xs text-emerald-900/70">
                      {impact.impactType.toUpperCase()} | {dimension?.name ?? impact.dimensionKey} | score {impact.score} | confidence {impact.confidence.toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-emerald-900/60">Evidence: {impact.evidence}</p>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-emerald-900/70">No impacts extracted yet.</p>
          )}
        </Card>
      </section>
    </main>
  );
}
