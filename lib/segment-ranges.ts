/**
 * Segment angle ranges for the doughnut chart.
 * D3 pie: startAngle -90°, 12 social (30° each), 9 ecological (40° each).
 *
 * Social segment i (0-11): angle range [90 - (i+1)*30, 90 - i*30], mid = 90 - (i+0.5)*30
 * Ecological segment i (0-8): angle range [90 - (i+1)*40, 90 - i*40], mid = 90 - (i+0.5)*40
 */
import { DOUGHNUT_DIMENSIONS } from "@/lib/doughnut-dimensions";

const SOCIAL = DOUGHNUT_DIMENSIONS.filter((d) => d.domain === "social_foundation");
const ECOLOGICAL = DOUGHNUT_DIMENSIONS.filter((d) => d.domain === "ecological_ceiling");

export const SEGMENT_RANGES = {
  social: SOCIAL.map((d, i) => ({
    key: d.key,
    name: d.name,
    startAngle: 90 - (i + 1) * 30,
    endAngle: 90 - i * 30,
    midAngle: 90 - (i + 0.5) * 30,
    innerRadius: 14,
    outerRadius: 42
  })),
  ecological: ECOLOGICAL.map((d, i) => ({
    key: d.key,
    name: d.name,
    startAngle: 90 - (i + 1) * 40,
    endAngle: 90 - i * 40,
    midAngle: 90 - (i + 0.5) * 40,
    innerRadius: 72,
    outerRadius: 92
  }))
};
