"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

export interface TrendPoint {
  bucketStart: string;
  dimensionKey: string;
  dimensionName: string;
  impactType: "positive" | "negative";
  averageScore: number;
}

export function TrendChart({ points }: { points: TrendPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const height = 420;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const width = svg.clientWidth || 600;
    const margin = { top: 20, right: 20, bottom: 60, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    d3.select(svg).selectAll("*").remove();

    if (!points.length) {
      d3.select(svg)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 16)
        .attr("fill", "#666")
        .text("No trend data for this period");
      return;
    }

    const seriesMap = new Map<string, Array<{ date: string; value: number }>>();
    for (const p of points) {
      const key = `${p.dimensionName} (${p.impactType})`;
      if (!seriesMap.has(key)) seriesMap.set(key, []);
      seriesMap.get(key)!.push({
        date: p.bucketStart.slice(0, 10),
        value: p.averageScore
      });
    }
    seriesMap.forEach((arr) => arr.sort((a, b) => a.date.localeCompare(b.date)));

    const allDates = [...new Set(points.map((p) => p.bucketStart.slice(0, 10)))].sort();
    const xScale = d3.scalePoint().domain(allDates).range([0, innerWidth]).padding(0.1);
    const yScale = d3.scaleLinear().domain([-100, 100]).range([innerHeight, 0]);

    const line = d3
      .line<{ date: string; value: number }>()
      .x((d) => (xScale(d.date) ?? 0) + margin.left)
      .y((d) => yScale(d.value) + margin.top)
      .curve(d3.curveMonotoneX);

    const g = d3
      .select(svg)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    g.append("g").call(d3.axisLeft(yScale));

    let idx = 0;
    seriesMap.forEach((data, name) => {
      g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", colorScale(String(idx++)))
        .attr("stroke-width", 2)
        .attr("d", line);
    });

    const legend = g
      .append("g")
      .attr("transform", `translate(0,${innerHeight + 40})`)
      .selectAll("g")
      .data(Array.from(seriesMap.keys()))
      .join("g")
      .attr("transform", (_, i) => `translate(${i * 120},0)`);

    legend
      .append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", (_, i) => colorScale(String(i)));

    legend
      .append("text")
      .attr("x", 16)
      .attr("y", 10)
      .attr("font-size", 11)
      .text((d) => d);
  }, [points]);

  return <svg ref={svgRef} width="100%" height={height} style={{ maxWidth: "100%" }} />;
}
