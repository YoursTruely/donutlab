import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/http";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const latestJob = await prisma.extractionJob.findFirst({
      where: { companyId: params.id },
      orderBy: { createdAt: "desc" },
      include: {
        candidates: {
          where: { status: "pending" },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    return ok({
      jobId: latestJob?.id ?? null,
      status: latestJob?.status ?? null,
      candidates: latestJob?.candidates ?? []
    });
  } catch (error) {
    return serverError(error);
  }
}
