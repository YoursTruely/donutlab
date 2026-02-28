import { PrismaClient, DoughnutDomain } from "@prisma/client";

const prisma = new PrismaClient();

const dimensions: Array<{ key: string; name: string; domain: DoughnutDomain }> = [
  { key: "water", name: "Water", domain: "social_foundation" },
  { key: "food", name: "Food", domain: "social_foundation" },
  { key: "health", name: "Health", domain: "social_foundation" },
  { key: "education", name: "Education", domain: "social_foundation" },
  { key: "income_work", name: "Income & Work", domain: "social_foundation" },
  { key: "peace_justice", name: "Peace & Justice", domain: "social_foundation" },
  { key: "political_voice", name: "Political Voice", domain: "social_foundation" },
  { key: "social_equity", name: "Social Equity", domain: "social_foundation" },
  { key: "gender_equality", name: "Gender Equality", domain: "social_foundation" },
  { key: "housing", name: "Housing", domain: "social_foundation" },
  { key: "networks", name: "Networks", domain: "social_foundation" },
  { key: "energy", name: "Energy", domain: "social_foundation" },
  { key: "climate_change", name: "Climate Change", domain: "ecological_ceiling" },
  { key: "ocean_acidification", name: "Ocean Acidification", domain: "ecological_ceiling" },
  { key: "chemical_pollution", name: "Chemical Pollution", domain: "ecological_ceiling" },
  { key: "nitrogen_phosphorus", name: "Nitrogen & Phosphorus Loading", domain: "ecological_ceiling" },
  { key: "freshwater_withdrawals", name: "Freshwater Withdrawals", domain: "ecological_ceiling" },
  { key: "land_conversion", name: "Land Conversion", domain: "ecological_ceiling" },
  { key: "biodiversity_loss", name: "Biodiversity Loss", domain: "ecological_ceiling" },
  { key: "air_pollution", name: "Air Pollution", domain: "ecological_ceiling" },
  { key: "ozone_layer_depletion", name: "Ozone Layer Depletion", domain: "ecological_ceiling" }
];

async function main() {
  for (const dimension of dimensions) {
    await prisma.impactDimension.upsert({
      where: { key: dimension.key },
      create: dimension,
      update: {
        name: dimension.name,
        domain: dimension.domain
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
