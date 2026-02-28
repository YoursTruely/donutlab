import { prisma } from "@/lib/prisma";
import { createManualImpactSchema } from "@/lib/schemas";
import { ok, badRequest, serverError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const data = createManualImpactSchema.parse(json);

    const dimension = await prisma.impactDimension.findUnique({
      where: { key: data.doughnutDimension }
    });

    if (!dimension) {
      return badRequest(`Unknown doughnut dimension: ${data.doughnutDimension}`);
    }

    const created = await prisma.impact.create({
      data: {
        companyId: data.companyId,
        dimensionId: dimension.id,
        impactType: data.impactType,
        title: data.title,
        description: data.description,
        events: {
          create: {
            score: data.score,
            observedAt: new Date(data.observedAt)
          }
        },
        sources: data.evidenceUrl
          ? {
              create: {
                type: "url",
                url: data.evidenceUrl
              }
            }
          : undefined
      },
      include: {
        events: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    const event = created.events[0];
    return ok({ impactEventId: event.id }, 201);
  } catch (error) {
    return serverError(error);
  }
}
