import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/http";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const impacts = await prisma.impact.findMany({
      where: { companyId: params.id },
      include: {
        dimension: true,
        events: { orderBy: { observedAt: "desc" }, take: 1 }
      },
      orderBy: { updatedAt: "desc" },
      take: 100
    });

    return ok({
      impacts: impacts.map((impact) => ({
        id: impact.id,
        title: impact.title,
        description: impact.description,
        impactType: impact.impactType,
        doughnutDimension: impact.dimension.key,
        dimensionName: impact.dimension.name,
        score: impact.events[0]?.score ?? 0,
        observedAt: impact.events[0]?.observedAt ?? null
      }))
    });
  } catch (error) {
    return serverError(error);
  }
}
