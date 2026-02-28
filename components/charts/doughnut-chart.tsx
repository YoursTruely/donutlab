"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { DOUGHNUT_DIMENSIONS } from "@/lib/doughnut-dimensions";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

export interface DoughnutChartDimension {
  dimensionKey: string;
  dimensionName: string;
  domain: "social_foundation" | "ecological_ceiling";
  positiveScore: number;
  negativeScore: number;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function buildArcText(
  text: string,
  radiusPercent: number,
  startAngle: number,
  endAngle: number,
  style: { color: string; fontSize: number; fontWeight?: number }
): NonNullable<EChartsOption["graphic"]> {
  const chars = Array.from(text);
  const step = chars.length > 1 ? (endAngle - startAngle) / (chars.length - 1) : 0;

  return chars
    .map((char, index) => {
      if (char === " ") {
        return null;
      }

      const angle = startAngle + index * step;
      const x = 50 + radiusPercent * Math.cos(toRadians(angle));
      const y = 50 + radiusPercent * Math.sin(toRadians(angle));

      return {
        type: "text",
        silent: true,
        z: 100,
        x: `${x}%`,
        y: `${y}%`,
        rotation: toRadians(angle + 90),
        style: {
          text: char,
          fill: style.color,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight ?? 500,
          textAlign: "center",
          textVerticalAlign: "middle"
        }
      };
    })
    .filter((value): value is Exclude<typeof value, null> => value !== null);
}

function scoreToSocialColor(score: number): string {
  if (Math.abs(score) < 0.1) {
    return "rgba(255,255,255,0.05)";
  }
  const alpha = Math.min(0.75, 0.2 + (Math.abs(score) / 100) * 0.6);
  return score > 0 ? `rgba(34, 139, 94, ${alpha})` : `rgba(217, 124, 73, ${alpha})`;
}

function scoreToEcologicalColor(score: number): string {
  if (Math.abs(score) < 0.1) {
    return "rgba(255,255,255,0)";
  }
  const alpha = Math.min(0.75, 0.18 + (Math.abs(score) / 100) * 0.6);
  return score > 0 ? `rgba(217, 124, 73, ${alpha})` : `rgba(34, 139, 94, ${alpha})`;
}

function formatDimensionLabel(value: string): string {
  const parts = value.split(" ");
  if (parts.length === 1) {
    return value;
  }
  const midpoint = Math.ceil(parts.length / 2);
  return `${parts.slice(0, midpoint).join(" ")}\n${parts.slice(midpoint).join(" ")}`;
}

export function DoughnutChart({
  dimensions,
  height = 420
}: {
  dimensions: DoughnutChartDimension[];
  height?: number;
}) {
  const option = useMemo<EChartsOption>(() => {
    const byKey = new Map(dimensions.map((dimension) => [dimension.dimensionKey, dimension]));
    const social = DOUGHNUT_DIMENSIONS.filter((dimension) => dimension.domain === "social_foundation").map((dimension) => {
      const current = byKey.get(dimension.key);
      return {
        ...dimension,
        positiveScore: current?.positiveScore ?? 0,
        negativeScore: current?.negativeScore ?? 0
      };
    });
    const ecological = DOUGHNUT_DIMENSIONS.filter((dimension) => dimension.domain === "ecological_ceiling").map((dimension) => {
      const current = byKey.get(dimension.key);
      return {
        ...dimension,
        positiveScore: current?.positiveScore ?? 0,
        negativeScore: current?.negativeScore ?? 0
      };
    });

    const socialZoneData = social.map((dimension) => {
      const netScore = dimension.positiveScore - dimension.negativeScore;
      return {
        name: dimension.name,
        value: 1,
        rawScore: netScore,
        itemStyle: {
          color: scoreToSocialColor(netScore),
          borderColor: "#f6f6f6",
          borderWidth: 1
        }
      };
    });

    const outerZoneData = ecological.map((dimension) => {
      const overshootScore = dimension.negativeScore - dimension.positiveScore;
      return {
        name: dimension.name,
        value: 1,
        rawScore: overshootScore,
        itemStyle: {
          color: scoreToEcologicalColor(overshootScore),
          borderColor: "#f2f2f2",
          borderWidth: 1
        }
      };
    });

    const graphics = [
      ...buildArcText("SOCIAL FOUNDATION", 41, 210, -30, {
        color: "#f2fff1",
        fontSize: 12,
        fontWeight: 700
      }),
      ...buildArcText("the safe and just space for humanity", 53, 225, -45, {
        color: "#ebffe4",
        fontSize: 8,
        fontWeight: 600
      }),
      ...buildArcText("ECOLOGICAL CEILING", 67, 210, -30, {
        color: "#f2fff1",
        fontSize: 12,
        fontWeight: 700
      })
    ];

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: (params: unknown) => {
          const item = params as { name: string; seriesName: string; data: { rawScore?: number } };
          const rawScore = item.data?.rawScore ?? 0;
          return `${item.name}<br/>${item.seriesName}: ${rawScore}`;
        }
      },
      graphic: graphics,
      series: [
        {
          name: "Social dimensions",
          type: "pie",
          radius: ["16%", "38%"],
          center: ["50%", "50%"],
          startAngle: 90,
          clockwise: true,
          minAngle: 3,
          itemStyle: { borderColor: "#f6f6f6", borderWidth: 1 },
          label: {
            show: true,
            position: "inside",
            color: "#1f1f1f",
            fontSize: 11,
            lineHeight: 12,
            formatter: (params: unknown) => {
              const item = params as { name: string };
              return formatDimensionLabel(item.name.toLowerCase());
            }
          },
          data: socialZoneData
        },
        {
          name: "Social foundation band",
          type: "pie",
          silent: true,
          radius: ["38%", "44%"],
          center: ["50%", "50%"],
          startAngle: 90,
          label: { show: false },
          tooltip: { show: false },
          data: [{ value: 1, itemStyle: { color: "#156f42" } }]
        },
        {
          name: "Safe and just space",
          type: "pie",
          silent: true,
          radius: ["44%", "64%"],
          center: ["50%", "50%"],
          startAngle: 90,
          label: { show: false },
          tooltip: { show: false },
          data: [{ value: 1, itemStyle: { color: "#79bb44" } }]
        },
        {
          name: "Ecological ceiling band",
          type: "pie",
          silent: true,
          radius: ["64%", "70%"],
          center: ["50%", "50%"],
          startAngle: 90,
          label: { show: false },
          tooltip: { show: false },
          data: [{ value: 1, itemStyle: { color: "#156f42" } }]
        },
        {
          name: "Ecological dimensions",
          type: "pie",
          radius: ["70%", "92%"],
          center: ["50%", "50%"],
          startAngle: 90,
          clockwise: true,
          minAngle: 3,
          itemStyle: { borderColor: "#f2f2f2", borderWidth: 1 },
          label: {
            show: true,
            position: "outside",
            rotate: "tangential",
            color: "#111111",
            fontSize: 11,
            formatter: (params: unknown) => {
              const item = params as { name: string };
              return formatDimensionLabel(item.name.toLowerCase());
            }
          },
          labelLine: {
            show: true,
            length: 8,
            length2: 4,
            lineStyle: { color: "#e6e6e6" }
          },
          data: outerZoneData
        }
      ]
    };
  }, [dimensions]);

  return <ReactECharts option={option} style={{ height }} />;
}
