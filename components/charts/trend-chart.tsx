"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { EChartsOption } from "echarts";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

export interface TrendPoint {
  bucketStart: string;
  dimensionKey: string;
  dimensionName: string;
  impactType: "positive" | "negative";
  averageScore: number;
}

export function TrendChart({ points }: { points: TrendPoint[] }) {
  const option = useMemo<EChartsOption>(() => {
    if (!points.length) {
      return {
        title: {
          text: "No trend data for this period",
          left: "center",
          top: "center",
          textStyle: { fontSize: 16 }
        }
      };
    }

    const seriesMap = new Map<string, Array<[string, number]>>();
    for (const point of points) {
      const seriesKey = `${point.dimensionName} (${point.impactType})`;
      if (!seriesMap.has(seriesKey)) {
        seriesMap.set(seriesKey, []);
      }
      seriesMap.get(seriesKey)!.push([point.bucketStart.slice(0, 10), point.averageScore]);
    }

    return {
      tooltip: { trigger: "axis" },
      legend: { bottom: 0, type: "scroll", textStyle: { fontSize: 11 } },
      xAxis: { type: "category" },
      yAxis: { type: "value", min: -100, max: 100 },
      series: Array.from(seriesMap.entries()).map(([name, data]) => ({
        name,
        type: "line",
        smooth: true,
        showSymbol: false,
        data
      }))
    };
  }, [points]);

  return <ReactECharts option={option} style={{ height: 420 }} />;
}
