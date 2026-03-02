"use client";

import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DoughnutChart } from "@/components/charts/doughnut-chart";
import type { ImpactPoint } from "@/components/charts/doughnut-chart";
import { parseDatasetCsv } from "@/lib/dataset-parser";
import { DOUGHNUT_DIMENSIONS } from "@/lib/doughnut-dimensions";

export function DatasetDashboard() {
  const [csvText, setCsvText] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [loadError, setLoadError] = useState("");

  const { data: parsed, error: parseError } = useMemo(() => {
    if (!csvText) return { data: null as ReturnType<typeof parseDatasetCsv> | null, error: "" };
    try {
      return { data: parseDatasetCsv(csvText), error: "" };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : "Failed to parse CSV" };
    }
  }, [csvText]);

  const years = parsed?.years ?? [];
  const year = selectedYear || years[0] || "";

  const chartDimensions = useMemo(
    () =>
      DOUGHNUT_DIMENSIONS.map((d) => ({
        dimensionKey: d.key,
        dimensionName: d.name,
        domain: d.domain,
        positiveScore: 0,
        negativeScore: 0
      })),
    []
  );

  const impactPoints = useMemo((): ImpactPoint[] => {
    if (!parsed || !year) return [];
    return parsed.impacts
      .filter((imp) => imp.dimensionKey != null)
      .map((imp) => ({
        dimensionKey: imp.dimensionKey!,
        impactAttribute: imp.impactAttribute,
        normalizedScore: imp.normalizedScore,
        value: imp.yearValues[year],
        boundary: imp.boundary
      }));
  }, [parsed, year]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setCsvText(null);
      setSelectedYear("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setCsvText(text);
      const p = parseDatasetCsv(text);
      if (p.years.length > 0 && !p.years.includes(selectedYear)) {
        setSelectedYear(p.years[0]);
      }
    };
    reader.readAsText(file);
  }, [selectedYear]);

  const handleLoadSample = useCallback(async () => {
    setLoadError("");
    try {
      const res = await fetch("/Dataset/Doughnut%20Economy%20-%20Dataset%201.csv");
      const text = await res.text();
      setCsvText(text);
      const p = parseDatasetCsv(text);
      if (p.years.length > 0) setSelectedYear(p.years[0]);
    } catch {
      setLoadError("Could not load sample dataset");
    }
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-7xl p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-emerald-950">Doughnut Economy Dataset</h1>
        <p className="mt-1 text-sm text-emerald-900/80">
          Upload a CSV dataset to visualize impact attributes on the Doughnut chart. Switch years to compare data over time.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-300 bg-zinc-200/60 p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm ring-1 ring-emerald-200 hover:bg-emerald-50">
            <input
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={handleFileChange}
            />
            <span>Choose CSV file</span>
          </label>
          <Button type="button" onClick={handleLoadSample} className="border border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50 sm:w-auto">
            Load sample (Doughnut Economy - Dataset 1)
          </Button>
          {years.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-700">Year:</label>
              <select
                className="rounded-md border border-emerald-200 px-3 py-2 text-sm"
                value={year}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {(parseError || loadError) && (
          <p className="mb-3 text-sm font-medium text-rose-700">{parseError || loadError}</p>
        )}

        <div className="rounded-lg border border-zinc-300 bg-white p-3">
          <DoughnutChart
            dimensions={chartDimensions}
            impactPoints={impactPoints}
            height={620}
          />
        </div>
      </section>

      {parsed && impactPoints.length > 0 && (
        <section className="mt-4">
          <Card title={`Impact attributes (${year})`}>
            <div className="max-h-[320px] space-y-2 overflow-auto pr-1">
              {parsed.impacts
                .filter((i) => i.dimensionKey != null)
                .map((imp, idx) => (
                  <article
                    key={`${imp.impactAttribute}-${idx}`}
                    className="rounded-md border border-emerald-100 bg-emerald-50/30 p-3"
                  >
                    <p className="text-sm font-semibold text-emerald-950">{imp.impactAttribute}</p>
                    <p className="mt-1 text-xs text-emerald-900/80">
                      {imp.boundary} | Normalized: {imp.normalizedScore} | {year}: {imp.yearValues[year] ?? "-"}
                    </p>
                  </article>
                ))}
            </div>
          </Card>
        </section>
      )}

      {csvText && (!parsed?.impacts?.length || impactPoints.length === 0) && !parseError && (
        <p className="mt-4 text-sm text-amber-700">
          No impact attributes could be mapped to chart dimensions. Check that your CSV has Axis, Boundary, and Impact Attribute columns.
        </p>
      )}
    </main>
  );
}
