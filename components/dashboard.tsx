"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { createCompanySchema, createManualImpactSchema } from "@/lib/schemas";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DoughnutChart } from "@/components/charts/doughnut-chart";
import { TrendChart } from "@/components/charts/trend-chart";

type Company = { id: string; name: string };
type Dimension = { key: string; name: string; domain: "social_foundation" | "ecological_ceiling" };
type Candidate = {
  id: string;
  title: string;
  description: string;
  dimensionKey: string;
  impactType: "positive" | "negative";
  score: number;
  observedAt: string;
};

const extractionInputSchema = z.object({
  sourceText: z.string().min(30).max(120000)
});

type CompanyInput = z.infer<typeof createCompanySchema>;
type ManualImpactInput = z.infer<typeof createManualImpactSchema>;
type ExtractionInput = z.infer<typeof extractionInputSchema>;

export function Dashboard() {
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [companyFeedback, setCompanyFeedback] = useState<string>("");
  const [from, setFrom] = useState(() => new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [granularity, setGranularity] = useState<"week" | "month">("month");

  const companiesQuery = useQuery({
    queryKey: ["companies"],
    queryFn: () => apiFetch<{ companies: Company[] }>("/api/companies")
  });

  const dimensionsQuery = useQuery({
    queryKey: ["dimensions"],
    queryFn: () => apiFetch<{ dimensions: Dimension[] }>("/api/dimensions")
  });

  const candidatesQuery = useQuery({
    queryKey: ["candidates", selectedCompanyId],
    enabled: Boolean(selectedCompanyId),
    queryFn: () => apiFetch<{ jobId: string | null; status: string | null; candidates: Candidate[] }>(`/api/companies/${selectedCompanyId}/candidates`)
  });

  const doughnutQuery = useQuery({
    queryKey: ["doughnut", selectedCompanyId, from, to],
    enabled: Boolean(selectedCompanyId),
    queryFn: () =>
      apiFetch<{ dimensions: Array<{ dimensionKey: string; dimensionName: string; domain: "social_foundation" | "ecological_ceiling"; positiveScore: number; negativeScore: number }> }>(
        `/api/companies/${selectedCompanyId}/doughnut?from=${new Date(from).toISOString()}&to=${new Date(to).toISOString()}`
      )
  });

  const trendQuery = useQuery({
    queryKey: ["trends", selectedCompanyId, from, to, granularity],
    enabled: Boolean(selectedCompanyId),
    queryFn: () =>
      apiFetch<{ points: Array<{ bucketStart: string; dimensionKey: string; dimensionName: string; impactType: "positive" | "negative"; averageScore: number }> }>(
        `/api/companies/${selectedCompanyId}/trends?from=${new Date(from).toISOString()}&to=${new Date(to).toISOString()}&granularity=${granularity}`
      )
  });

  const companyForm = useForm<CompanyInput>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: { name: "" }
  });

  const manualImpactForm = useForm<ManualImpactInput>({
    resolver: zodResolver(createManualImpactSchema),
    defaultValues: {
      companyId: selectedCompanyId,
      title: "",
      description: "",
      impactType: "positive",
      doughnutDimension: "climate_change",
      score: 0,
      observedAt: new Date().toISOString(),
      evidenceUrl: ""
    }
  });

  const extractionForm = useForm<ExtractionInput>({
    resolver: zodResolver(extractionInputSchema),
    defaultValues: { sourceText: "" }
  });

  const createCompany = useMutation({
    mutationFn: (payload: CompanyInput) => apiFetch<{ company: Company }>("/api/companies", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: async (result) => {
      const newCompany = result.company;
      queryClient.setQueryData<{ companies: Company[] }>(["companies"], (old) => {
        const previous = old?.companies ?? [];
        const withoutDuplicate = previous.filter((company) => company.id !== newCompany.id);
        return { companies: [newCompany, ...withoutDuplicate] };
      });
      setSelectedCompanyId(newCompany.id);
      manualImpactForm.setValue("companyId", newCompany.id);
      setCompanyFeedback(`Added company: ${newCompany.name}`);
      companyForm.reset();
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
    }
  });

  const createManualImpact = useMutation({
    mutationFn: (payload: ManualImpactInput) =>
      apiFetch<{ impactEventId: string }>("/api/impacts/manual", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["doughnut"] }),
        queryClient.invalidateQueries({ queryKey: ["trends"] })
      ]);
      manualImpactForm.reset({
        ...manualImpactForm.getValues(),
        title: "",
        description: "",
        score: 0,
        observedAt: new Date().toISOString(),
        evidenceUrl: ""
      });
    }
  });

  const runExtraction = useMutation({
    mutationFn: (payload: ExtractionInput) =>
      apiFetch<{ jobId: string }>("/api/impacts/extract", {
        method: "POST",
        body: JSON.stringify({
          companyId: selectedCompanyId,
          sourceText: payload.sourceText
        })
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["candidates", selectedCompanyId] });
      extractionForm.reset();
    }
  });

  const reviewMutation = useMutation({
    mutationFn: ({ candidateId, status }: { candidateId: string; status: "accepted" | "rejected" }) =>
      apiFetch<{ accepted: number; rejected: number }>("/api/impacts/review", {
        method: "POST",
        body: JSON.stringify({
          jobId: candidatesQuery.data?.jobId,
          decisions: [{ candidateId, status }]
        })
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["candidates", selectedCompanyId] }),
        queryClient.invalidateQueries({ queryKey: ["doughnut"] }),
        queryClient.invalidateQueries({ queryKey: ["trends"] })
      ]);
    }
  });

  const companyOptions = companiesQuery.data?.companies ?? [];
  const selectedCompany = companyOptions.find((company) => company.id === selectedCompanyId);
  const dimensions = dimensionsQuery.data?.dimensions ?? [];

  const dimensionOptions = useMemo(
    () => dimensions.map((dimension) => ({ value: dimension.key, label: `${dimension.name} (${dimension.domain})` })),
    [dimensions]
  );

  return (
    <main className="mx-auto min-h-screen max-w-7xl p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-emerald-950">Doughnut Impact Dashboard</h1>
        <p className="mt-1 text-sm text-emerald-900/80">
          Capture company impacts, map them to Doughnut dimensions, score them, and track trends over time.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Card title="1) Company">
          <form
            className="space-y-3"
            onSubmit={companyForm.handleSubmit((values) => {
              setCompanyFeedback("");
              createCompany.mutate(values);
            })}
          >
            <Input placeholder="Company name" {...companyForm.register("name")} />
            <Button type="submit" disabled={createCompany.isPending}>Create company</Button>
          </form>
          {companyFeedback ? (
            <p className="mt-2 text-sm font-medium text-emerald-800">{companyFeedback}</p>
          ) : null}
          {createCompany.isError ? (
            <p className="mt-2 text-sm font-medium text-rose-700">
              Could not create company: {createCompany.error instanceof Error ? createCompany.error.message : "unknown error"}
            </p>
          ) : null}

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium">Selected company</label>
            <select
              className="w-full rounded-md border border-emerald-200 px-3 py-2 text-sm"
              value={selectedCompanyId}
              onChange={(event) => {
                const id = event.target.value;
                setSelectedCompanyId(id);
                manualImpactForm.setValue("companyId", id);
              }}
            >
              <option value="">Select company...</option>
              {companyOptions.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            {selectedCompany ? (
              <p className="mt-2 text-xs text-emerald-900/70">Current selection: {selectedCompany.name}</p>
            ) : (
              <p className="mt-2 text-xs text-emerald-900/70">No company selected.</p>
            )}
          </div>
        </Card>

        <Card title="Date Range">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm">From</label>
              <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm">To</label>
              <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm">Granularity</label>
              <select
                className="w-full rounded-md border border-emerald-200 px-3 py-2 text-sm"
                value={granularity}
                onChange={(event) => setGranularity(event.target.value as "week" | "month")}
              >
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card title="2) Manual Impact Entry">
          <form className="space-y-3" onSubmit={manualImpactForm.handleSubmit((values) => createManualImpact.mutate(values))}>
            <Input placeholder="Impact title" {...manualImpactForm.register("title")} />
            <Input placeholder="Description" {...manualImpactForm.register("description")} />
            <div className="grid grid-cols-2 gap-3">
              <select className="rounded-md border border-emerald-200 px-3 py-2 text-sm" {...manualImpactForm.register("impactType")}>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
              </select>
              <Input type="number" min={-100} max={100} placeholder="Score" {...manualImpactForm.register("score", { valueAsNumber: true })} />
            </div>
            <select className="w-full rounded-md border border-emerald-200 px-3 py-2 text-sm" {...manualImpactForm.register("doughnutDimension")}>
              {dimensionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Input type="datetime-local" {...manualImpactForm.register("observedAt", {
              setValueAs: (value) => (value ? new Date(value).toISOString() : new Date().toISOString())
            })} />
            <Input placeholder="Evidence URL (optional)" {...manualImpactForm.register("evidenceUrl")} />
            <Button type="submit" disabled={!selectedCompanyId || createManualImpact.isPending}>Save impact</Button>
          </form>
        </Card>

        <Card title="3) AI-Assisted Extraction + Review">
          <form className="space-y-3" onSubmit={extractionForm.handleSubmit((values) => runExtraction.mutate(values))}>
            <textarea
              rows={6}
              placeholder="Paste source text for AI extraction"
              className="w-full rounded-md border border-emerald-200 px-3 py-2 text-sm"
              {...extractionForm.register("sourceText")}
            />
            <Button type="submit" disabled={!selectedCompanyId || runExtraction.isPending}>Extract impacts</Button>
          </form>

          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold">Pending review</p>
            {candidatesQuery.data?.candidates?.length ? (
              candidatesQuery.data.candidates.map((candidate) => (
                <div key={candidate.id} className="rounded-md border border-emerald-100 bg-emerald-50/40 p-3 text-sm">
                  <p className="font-semibold">{candidate.title}</p>
                  <p className="text-emerald-900/80">{candidate.description}</p>
                  <p className="mt-1 text-xs text-emerald-900/70">
                    {candidate.dimensionKey} | {candidate.impactType} | score {candidate.score}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      className="bg-emerald-700"
                      onClick={() => reviewMutation.mutate({ candidateId: candidate.id, status: "accepted" })}
                    >
                      Accept
                    </Button>
                    <Button
                      type="button"
                      className="bg-rose-700 hover:bg-rose-800"
                      onClick={() => reviewMutation.mutate({ candidateId: candidate.id, status: "rejected" })}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-emerald-900/70">No pending AI candidates.</p>
            )}
          </div>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card title="4) Doughnut Impact Map">
          <DoughnutChart dimensions={doughnutQuery.data?.dimensions ?? []} />
        </Card>
        <Card title="5) Impact Trends Over Time">
          <TrendChart points={trendQuery.data?.points ?? []} />
        </Card>
      </section>
    </main>
  );
}
