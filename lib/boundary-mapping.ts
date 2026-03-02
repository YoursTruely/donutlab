import { DIMENSION_BY_KEY } from "@/lib/doughnut-dimensions";

/** Maps CSV Boundary column values to our dimension keys */
const BOUNDARY_TO_KEY: Record<string, string> = {
  "Chemical Pollution": "chemical_pollution",
  "Air Pollution": "air_pollution",
  "Biodiversity Loss": "biodiversity_loss",
  "Ocean Acidification": "ocean_acidification",
  "Climate Change": "climate_change",
  "Freshwater": "freshwater_withdrawals",
  "Freshwater Withdrawals": "freshwater_withdrawals",
  "Ozone Layer": "ozone_layer_depletion",
  "Ozone Layer Depletion": "ozone_layer_depletion",
  "Nitrogen & Phosphorus Loading": "nitrogen_phosphorus",
  "Land Conversion": "land_conversion",
  "Income & Work": "income_work",
  "Energy": "energy",
  "Water": "water",
  "Political Voice": "political_voice",
  "Networks": "networks",
  "Gender Equality": "gender_equality",
  "Health": "health",
  "Peace & Justice": "peace_justice",
  "Education": "education",
  "Social Equity": "social_equity",
  "Food": "food",
  "Housing": "housing"
};

export function boundaryToDimensionKey(boundary: string): string | null {
  const normalized = boundary.trim();
  const key =
    BOUNDARY_TO_KEY[normalized] ??
    Object.entries(BOUNDARY_TO_KEY).find(([k]) => k.toLowerCase() === normalized.toLowerCase())?.[1] ??
    null;
  return key && DIMENSION_BY_KEY.has(key) ? key : null;
}
