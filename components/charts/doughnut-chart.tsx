"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { DOUGHNUT_DIMENSIONS } from "@/lib/doughnut-dimensions";
import { SEGMENT_RANGES } from "@/lib/segment-ranges";

export interface DoughnutChartDimension {
  dimensionKey: string;
  dimensionName: string;
  domain: "social_foundation" | "ecological_ceiling";
  positiveScore: number;
  negativeScore: number;
}

export interface ImpactPoint {
  dimensionKey: string;
  impactAttribute: string;
  normalizedScore: number;
  value?: number;
  boundary?: string;
  percentChange?: number;
}

function formatDimensionLabel(value: string): string[] {
  const normalized = value.replace(/&/g, "and");
  const parts = normalized.split(" ");
  if (parts.length === 1) return [normalized];
  const midpoint = Math.ceil(parts.length / 2);
  return [
    parts.slice(0, midpoint).join(" "),
    parts.slice(midpoint).join(" ")
  ];
}

/** Truncate text to fit arc length L = θ × r; ~0.55em per character. */
function truncateForArcLength(text: string, arcLengthPx: number, fontSizePx: number): string {
  const approxCharWidth = fontSizePx * 0.55;
  const maxChars = Math.max(3, Math.floor(arcLengthPx / approxCharWidth));
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 3).trim() + "…";
}

function scoreToSocialColor(score: number): string {
  if (Math.abs(score) < 0.1) return "rgba(255,255,255,0.05)";
  const alpha = Math.min(0.75, 0.2 + (Math.abs(score) / 100) * 0.6);
  return score > 0 ? `rgba(34, 139, 94, ${alpha})` : `rgba(217, 124, 73, ${alpha})`;
}

function scoreToEcologicalColor(score: number): string {
  if (Math.abs(score) < 0.1) return "rgba(255,255,255,0)";
  const alpha = Math.min(0.75, 0.18 + (Math.abs(score) / 100) * 0.6);
  return score > 0 ? `rgba(217, 124, 73, ${alpha})` : `rgba(34, 139, 94, ${alpha})`;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Radial mapping: dots within their ring segments only.
 * Social: between innermost circles = within social ring (innerRadius..outerRadius).
 * Ecological: between outermost circles = within ecological ring (innerRadius..outerRadius).
 */
function computeImpactPositions(
  impactPoints: ImpactPoint[],
  scale: (r: number) => number,
  angleLookup: Map<string, number>
): Array<{ x: number; y: number; impact: ImpactPoint }> {
  const byDimension = new Map<string, ImpactPoint[]>();
  for (const p of impactPoints) {
    if (!p.dimensionKey) continue;
    const list = byDimension.get(p.dimensionKey) ?? [];
    list.push(p);
    byDimension.set(p.dimensionKey, list);
  }
  const result: Array<{ x: number; y: number; impact: ImpactPoint }> = [];
  const socialByKey = new Map(SEGMENT_RANGES.social.map((s) => [s.key, s]));
  const ecologicalByKey = new Map(SEGMENT_RANGES.ecological.map((s) => [s.key, s]));

  const tryLookup = (key: string): number | undefined => {
    const k = key.toLowerCase();
    return angleLookup.get(k) ?? angleLookup.get(k.replace(/_/g, " "));
  };

  for (const [dimKey, points] of byDimension) {
    const midAngle = tryLookup(dimKey);
    if (midAngle === undefined) continue;

    const socialSeg = socialByKey.get(dimKey);
    const ecoSeg = ecologicalByKey.get(dimKey);
    const n = points.length;

    if (socialSeg) {
      const innerEdge = socialSeg.innerRadius;
      const outerEdge = socialSeg.outerRadius;
      const bandWidth = outerEdge - innerEdge;
      points.forEach((p, i) => {
        const score = Math.max(0, Math.min(100, p.normalizedScore));
        let rPct = innerEdge + (score / 100) * bandWidth;
        if (n > 1) {
          const spread = ((i / (n - 1)) - 0.5) * bandWidth * 0.12;
          rPct = Math.max(innerEdge, Math.min(outerEdge, rPct + spread));
        } else {
          rPct = Math.max(innerEdge, Math.min(outerEdge, rPct));
        }
        const radius = scale(rPct);
        const angleJitter = n > 1 ? ((i / (n - 1)) - 0.5) * 0.035 : 0;
        const x = radius * Math.sin(midAngle + angleJitter);
        const y = -radius * Math.cos(midAngle + angleJitter);
        result.push({ x, y, impact: p });
      });
    } else if (ecoSeg) {
      const innerEdge = ecoSeg.innerRadius;
      const outerEdge = ecoSeg.outerRadius;
      const bandWidth = outerEdge - innerEdge;
      points.forEach((p, i) => {
        const overshoot = Math.max(0, Math.min(100, p.normalizedScore));
        let rPct = innerEdge + (overshoot / 100) * bandWidth;
        if (n > 1) {
          const spread = ((i / (n - 1)) - 0.5) * bandWidth * 0.1;
          rPct = Math.max(innerEdge, Math.min(outerEdge, rPct + spread));
        } else {
          rPct = Math.max(innerEdge, Math.min(outerEdge, rPct));
        }
        const radius = scale(rPct);
        const angleJitter = n > 1 ? ((i / (n - 1)) - 0.5) * 0.03 : 0;
        const x = radius * Math.sin(midAngle + angleJitter);
        const y = -radius * Math.cos(midAngle + angleJitter);
        result.push({ x, y, impact: p });
      });
    }
  }
  return result;
}

export function DoughnutChart({
  dimensions,
  impactPoints = [],
  height = 420
}: {
  dimensions: DoughnutChartDimension[];
  impactPoints?: ImpactPoint[];
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [segmentModal, setSegmentModal] = useState<{
    dimensionKey: string;
    dimensionName: string;
  } | null>(null);
  const [size, setSize] = useState({ width: 600, height });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height: h } = entries[0]?.contentRect ?? { width: 600, height };
      if (width > 0 && h > 0) setSize({ width, height: h });
    });
    ro.observe(el);
    const { width: w, height: h } = el.getBoundingClientRect();
    if (w > 0 && h > 0) setSize({ width: w, height: h });
    return () => ro.disconnect();
  }, [height]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || size.width <= 0 || size.height <= 0) return;

    const width = size.width;
    const h = size.height;
    const center: [number, number] = [width / 2, h / 2];
    const maxR = Math.min(width, h) * 0.40;
    const scale = (pct: number) => (pct / 100) * maxR;

    d3.select(svg).selectAll("*").remove();

    const g = d3
      .select(svg)
      .attr("viewBox", `0 0 ${width} ${h}`)
      .append("g")
      .attr("class", "centered-pie-group")
      .attr("transform", `translate(${center[0]}, ${center[1]})`);

    const byKey = new Map(dimensions.map((d) => [d.dimensionKey, d]));
    const social = DOUGHNUT_DIMENSIONS.filter((d) => d.domain === "social_foundation").map((d) => {
      const cur = byKey.get(d.key);
      return {
        ...d,
        positiveScore: cur?.positiveScore ?? 0,
        negativeScore: cur?.negativeScore ?? 0
      };
    });
    const ecological = DOUGHNUT_DIMENSIONS.filter((d) => d.domain === "ecological_ceiling").map(
      (d) => {
        const cur = byKey.get(d.key);
        return {
          ...d,
          positiveScore: cur?.positiveScore ?? 0,
          negativeScore: cur?.negativeScore ?? 0
        };
      }
    );

    const pie = d3
      .pie<{ name: string; key?: string; value: number; fill: string }>()
      .value((d) => d.value)
      .sort(null)
      .startAngle(degToRad(-90))
      .endAngle(degToRad(270));

    const defs = g.append("defs");

    const addArcTextPath = (id: string, radiusPx: number, hemisphere: "top" | "bottom") => {
      const r = radiusPx;
      // Top: left -> right along the top arc
      // Bottom: right -> left along the bottom arc (keeps text upright)
      const d =
        hemisphere === "top"
          ? `M ${-r},0 A ${r},${r} 0 0,1 ${r},0`
          : `M ${r},0 A ${r},${r} 0 0,1 ${-r},0`;

      defs.append("path").attr("id", id).attr("d", d).attr("fill", "none");
    };

    const addTextOnPath = (
      pathId: string,
      text: string,
      style: { fill: string; fontSize: number; fontWeight: number; dy?: number }
    ) => {
      const t = g
        .append("text")
        .style("pointer-events", "none")
        .attr("fill", style.fill)
        .attr("font-size", style.fontSize)
        .attr("font-weight", style.fontWeight);
      if (style.dy != null) t.attr("dy", style.dy);

      t.append("textPath")
        .attr("href", `#${pathId}`)
        .attr("startOffset", "50%")
        .attr("text-anchor", "middle")
        .text(text);
    };

    const renderRing = (
      data: Array<{ name: string; value: number; fill: string }>,
      innerPct: number,
      outerPct: number,
      showLabels: boolean,
      labelOutside: boolean,
      labelFontSize = 10
    ) => {
      const arc = d3
        .arc<d3.PieArcDatum<{ name: string; value: number; fill: string }>>()
        .innerRadius(scale(innerPct))
        .outerRadius(scale(outerPct));
      const arcs = pie(data);
      g.selectAll(`.ring-${innerPct}`)
        .data(arcs)
        .join("path")
        .attr("class", `ring-${innerPct}`)
        .attr("d", arc)
        .attr("fill", (d) => d.data.fill)
        .style("stroke", "#003366")
        .style("stroke-width", "2.5px")
        .style("stroke-linejoin", "round")
        .style("stroke-linecap", "round")
        .style("cursor", "pointer")
        .on("click", function (_event, d) {
          const key = (d.data as { key?: string }).key;
          if (key) setSegmentModal({ dimensionKey: key, dimensionName: d.data.name });
        });
      if (showLabels) {
        // Keep labels inside the chart radius to avoid viewBox clipping.
        const labelRadius = labelOutside ? Math.min(outerPct + 4, 94) : Math.max(innerPct + 2, outerPct - 6);
        const labelArc = d3
          .arc<d3.PieArcDatum<{ name: string; value: number; fill: string }>>()
          .innerRadius(scale(labelRadius))
          .outerRadius(scale(labelRadius));
        const labelRadiusPx = scale(labelRadius);
        const arcLength = (d: d3.PieArcDatum<{ name: string; value: number; fill: string }>) =>
          (d.endAngle - d.startAngle) * labelRadiusPx;

        g.selectAll(`.label-${innerPct}`)
          .data(arcs)
          .join("text")
          .attr("class", `label-${innerPct}`)
          .style("pointer-events", "none")
          .attr("dominant-baseline", "middle")
          .attr("font-size", labelFontSize)
          .attr("fill", "#003366")
          .each(function (d) {
            const midAngle = (d.startAngle + d.endAngle) / 2;
            const angDeg = midAngle * (180 / Math.PI);
            const flip = angDeg > 180;
            const rot = angDeg - 90;

            // Special handling for inner social-foundation labels:
            // keep them centered, upright, and not overly truncated.
            const isInnerSocialRing = innerPct === 14;
            const radiusPxForInner = scale((innerPct + outerPct) / 2);

            const anchor = isInnerSocialRing ? "middle" : flip ? "end" : "start";
            const transform = isInnerSocialRing
              ? // Centered along a fixed radius just outside the inner white circle.
                `rotate(${rot}) translate(${radiusPxForInner},0)${flip ? " rotate(180)" : ""}`
              : // Default: along the ring radius with arc-length-based truncation.
                `rotate(${rot}) translate(${labelRadiusPx},0)${flip ? " rotate(180)" : ""}`;

            const rawLines = formatDimensionLabel(d.data.name).map((line) => line.toUpperCase());
            const L = arcLength(d);
            const lines = isInnerSocialRing
              ? rawLines
              : rawLines.map((line) => truncateForArcLength(line, L / rawLines.length, labelFontSize));

            const sel = d3.select(this).attr("text-anchor", anchor).attr("transform", transform);
            sel.selectAll("tspan").remove();
            const firstDyEm = -((lines.length - 1) * 0.55);
            lines.forEach((line, i) => {
              sel
                .append("tspan")
                .attr("x", 0)
                .attr("dy", i === 0 ? `${firstDyEm}em` : "1.1em")
                .text(line);
            });
          });
      }
    };

    const socialData = social.map((d) => ({
      name: d.name,
      key: d.key,
      value: 1,
      fill: scoreToSocialColor(d.positiveScore - d.negativeScore)
    }));
    const ecologicalData = ecological.map((d) => ({
      name: d.name,
      key: d.key,
      value: 1,
      fill: scoreToEcologicalColor(d.negativeScore - d.positiveScore)
    }));

    const pieWithKey = d3
      .pie<{ name: string; key: string; value: number; fill: string }>()
      .value((d) => d.value)
      .sort(null)
      .startAngle(degToRad(-90))
      .endAngle(degToRad(270));

    const socialArcs = pieWithKey(socialData);
    const ecoArcs = pieWithKey(ecologicalData);
    const angleLookup = new Map<string, number>();
    [...socialArcs, ...ecoArcs].forEach((arc) => {
      const key = (arc.data as { key?: string }).key ?? "";
      if (key) {
        const midAngle = (arc.startAngle + arc.endAngle) / 2;
        angleLookup.set(key.toLowerCase(), midAngle);
      }
    });

    const ecologicalOvershootValues = ecological.map((d) =>
      Math.max(0, Math.min(100, d.negativeScore - d.positiveScore))
    );
    const overshootPie = d3
      .pie<{ value: number; overshoot: number }>()
      .value((d) => d.value)
      .sort(null)
      .startAngle(degToRad(-90))
      .endAngle(degToRad(270));

    const renderOvershoot = (values: number[], innerPct: number, outerPct: number) => {
      const data = values.map((v) => ({
        value: 1,
        overshoot: v
      }));

      const arcs = overshootPie(data);

      const overshootArc = d3
        .arc<d3.PieArcDatum<{ value: number; overshoot: number }>>()
        .innerRadius(scale(innerPct))
        .outerRadius((d) => {
          const clamped = Math.max(0, Math.min(100, d.data.overshoot));
          const delta = ((outerPct - innerPct) * clamped) / 100;
          return scale(innerPct + delta);
        });

      g.selectAll(".overshoot-ring")
        .data(arcs)
        .join("path")
        .attr("class", "overshoot-ring")
        .attr("d", overshootArc)
        .attr("fill", "#b10026")
        .attr("fill-opacity", 0.55)
        .style("stroke", "none");
    };

    renderRing(socialData, 14, 42, true, false, 10);
    // Dark green transition band
    renderRing([{ name: "", value: 1, fill: "#1D6B41" }], 42, 48, false, false);
    // Safe and just space band
    renderRing([{ name: "", value: 1, fill: "#78BD43" }], 48, 66, false, false);
    // Dark green transition band
    renderRing([{ name: "", value: 1, fill: "#1D6B41" }], 66, 72, false, false);
    renderRing(ecologicalData, 72, 92, true, true, 12);

    // Ecological overshoot shading (outside the ceiling ring, 92–100% radius).
    renderOvershoot(ecologicalOvershootValues, 92, 100);

    // Curved titles (template-style): use textPath instead of per-letter rotation.
    addArcTextPath("title-social-bottom", scale(45), "bottom");
    addTextOnPath("title-social-bottom", "SOCIAL FOUNDATION", {
      fill: "#f2fff1",
      fontSize: 12,
      fontWeight: 700,
      dy: -2
    });

    addArcTextPath("title-safe-top", scale(57), "top");
    addTextOnPath("title-safe-top", "the safe and just space for humanity", {
      fill: "#ffffff",
      fontSize: 18,
      fontWeight: 700,
      dy: -2
    });

    addArcTextPath("title-eco-top", scale(69), "top");
    addTextOnPath("title-eco-top", "ECOLOGICAL CEILING", {
      fill: "#f2fff1",
      fontSize: 12,
      fontWeight: 700,
      dy: -2
    });

    const impactPositions = computeImpactPositions(impactPoints, scale, angleLookup);
    impactPositions.forEach(({ x, y, impact }) => {
      g.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 6)
        .attr("fill", "#1f2937")
        .style("fill-opacity", 0.5)
        .attr("stroke", "#003366")
        .attr("stroke-width", 1.5)
        .style("cursor", "pointer")
        .on("mouseover", function (event) {
          const lines: string[] = [
            impact.boundary != null && impact.boundary !== "" ? `Boundary: ${impact.boundary}` : null,
            `Impact Attribute: ${impact.impactAttribute}`,
            impact.boundary != null && impact.boundary !== "" ? `Nature of Impact: ${impact.boundary}` : null,
            `Normalized score: ${impact.normalizedScore}`,
            impact.value != null ? `Value: ${impact.value}` : null,
            impact.percentChange != null ? `Percentage change: ${impact.percentChange}` : null
          ].filter(Boolean) as string[];
          const e = event as MouseEvent;
          setTooltip({ x: e.clientX, y: e.clientY, text: lines.join("\n") });
          const updatePos = (ev: MouseEvent) =>
            setTooltip((prev) => prev && { ...prev, x: ev.clientX, y: ev.clientY });
          d3.select(this).on("mousemove.tooltip", updatePos);
        })
        .on("mouseout", function () {
          d3.select(this).on("mousemove.tooltip", null);
          setTooltip(null);
        });
    });

    return () => {
      setTooltip(null);
    };
  }, [dimensions, impactPoints, size]);

  const segmentImpacts = segmentModal
    ? impactPoints.filter((p) => p.dimensionKey === segmentModal.dimensionKey)
    : [];

  return (
    <div ref={containerRef} className="relative w-full" style={{ minHeight: height }}>
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
      />
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg"
          style={{ left: tooltip.x + 10, top: tooltip.y + 10 }}
        >
          {tooltip.text.split("\n").map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {segmentModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSegmentModal(null)}
          onKeyDown={(e) => e.key === "Escape" && setSegmentModal(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="segment-modal-title"
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3">
              <h2 id="segment-modal-title" className="text-lg font-semibold text-emerald-900">
                {segmentModal.dimensionName}
              </h2>
              <p className="mt-0.5 text-sm text-emerald-700">
                {segmentImpacts.length} impact{segmentImpacts.length !== 1 ? "s" : ""} in this segment
              </p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {segmentImpacts.length === 0 ? (
                <p className="text-sm text-zinc-500">No impact attributes in this segment.</p>
              ) : (
                <ul className="space-y-4">
                  {segmentImpacts.map((imp, idx) => (
                    <li
                      key={`${imp.impactAttribute}-${idx}`}
                      className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4"
                    >
                      <p className="font-medium text-emerald-950">{imp.impactAttribute}</p>
                      <dl className="mt-3 grid gap-1.5 text-sm">
                        {imp.boundary != null && imp.boundary !== "" && (
                          <>
                            <dt className="text-emerald-700">Boundary</dt>
                            <dd className="text-zinc-800">{imp.boundary}</dd>
                          </>
                        )}
                        <dt className="text-emerald-700">Nature of impact</dt>
                        <dd className="text-zinc-800">{imp.boundary ?? "—"}</dd>
                        <dt className="text-emerald-700">Normalized score</dt>
                        <dd className="text-zinc-800">{imp.normalizedScore}</dd>
                        {imp.value != null && (
                          <>
                            <dt className="text-emerald-700">Value</dt>
                            <dd className="text-zinc-800">{imp.value}</dd>
                          </>
                        )}
                        {imp.percentChange != null && (
                          <>
                            <dt className="text-emerald-700">Percentage change</dt>
                            <dd className="text-zinc-800">{imp.percentChange}</dd>
                          </>
                        )}
                      </dl>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-emerald-200 bg-emerald-50/80 px-4 py-3">
              <button
                type="button"
                onClick={() => setSegmentModal(null)}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
