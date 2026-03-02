import { boundaryToDimensionKey } from "@/lib/boundary-mapping";
import { DOUGHNUT_DIMENSIONS } from "@/lib/doughnut-dimensions";

export interface ParsedImpact {
  axis: string;
  boundary: string;
  dimensionKey: string | null;
  impactAttribute: string;
  yearValues: Record<string, number>;
  percentChange: number;
  normalizedScore: number;
}

function resolveDimensionKey(axis: string, boundary: string): string | null {
  let key = boundaryToDimensionKey(boundary);
  if (key) return key;
  const isSocial = /social|foundation/i.test(axis);
  const isEcological = /ecological|ceiling/i.test(axis);
  const search = boundary.toLowerCase().replace(/&/g, " and ");
  for (const d of DOUGHNUT_DIMENSIONS) {
    if (isSocial && d.domain !== "social_foundation") continue;
    if (isEcological && d.domain !== "ecological_ceiling") continue;
    if (d.name.toLowerCase().replace(/&/g, " and ").includes(search)) return d.key;
    if (search.includes(d.name.toLowerCase().replace(/&/g, " and "))) return d.key;
  }
  return null;
}

export interface ParsedDataset {
  years: string[];
  impacts: ParsedImpact[];
}

function parseNumber(value: string): number {
  const cleaned = String(value || "").replace(/,/g, "").trim();
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

export function parseDatasetCsv(csvText: string): ParsedDataset {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return { years: [], impacts: [] };

  const header = lines[0];
  const headers = parseCsvLine(header).map((h) => h.replace(/^"|"$/g, "").trim());

  const axisIdx = headers.findIndex((h) => /axis/i.test(h));
  const boundaryIdx = headers.findIndex((h) => /nature of impact|boundary/i.test(h));
  const impactAttrIdx = headers.findIndex((h) => /impact attribute/i.test(h));
  const percentChangeIdx = headers.findIndex((h) => /percent change/i.test(h));
  const normalizedIdx = headers.findIndex((h) => /normalized/i.test(h));

  const yearHeaders = headers.filter(
    (h, i) =>
      i !== axisIdx &&
      i !== boundaryIdx &&
      i !== impactAttrIdx &&
      i !== percentChangeIdx &&
      i !== normalizedIdx &&
      /^\d{4}$/.test(h)
  );

  const impacts: ParsedImpact[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cells = parseCsvLine(line);

    const axis = axisIdx >= 0 ? (cells[axisIdx] ?? "").replace(/^"|"$/g, "").trim() : "";
    const boundary = boundaryIdx >= 0 ? (cells[boundaryIdx] ?? "").replace(/^"|"$/g, "").trim() : "";
    const impactAttribute = impactAttrIdx >= 0 ? (cells[impactAttrIdx] ?? "").replace(/^"|"$/g, "").trim() : "";
    const percentChange = percentChangeIdx >= 0 ? parseNumber(cells[percentChangeIdx]) : 0;
    const normalizedScore = normalizedIdx >= 0 ? parseNumber(cells[normalizedIdx]) : 0;

    const yearValues: Record<string, number> = {};
    for (const year of yearHeaders) {
      const colIdx = headers.indexOf(year);
      if (colIdx >= 0) yearValues[year] = parseNumber(cells[colIdx]);
    }

    const dimensionKey = resolveDimensionKey(axis, boundary);

    impacts.push({
      axis,
      boundary,
      dimensionKey,
      impactAttribute,
      yearValues,
      percentChange,
      normalizedScore
    });
  }

  return {
    years: yearHeaders,
    impacts
  };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      current += c;
    } else if (c === ",") {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}
