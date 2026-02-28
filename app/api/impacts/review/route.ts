import { prisma } from "@/lib/prisma";
import { reviewExtractionSchema } from "@/lib/schemas";
import { ok, badRequest, serverError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const data = reviewExtractionSchema.parse(json);
    const reviewerId = request.headers.get("x-user-id") ?? undefined;

    const job = await prisma.extractionJob.findUnique({ where: { id: data.jobId } });
    if (!job) {
      return badRequest("Extraction job not found");
    }

    let accepted = 0;
    let rejected = 0;

    await prisma.$transaction(async (tx) => {
      for (const decision of data.decisions) {
        const candidate = await tx.extractionCandidate.findUnique({
          where: { id: decision.candidateId }
        });

        if (!candidate || candidate.extractionJobId !== data.jobId) {
          throw new Error(`Candidate not found in job: ${decision.candidateId}`);
        }

        const status = decision.status;
        await tx.extractionCandidate.update({
          where: { id: candidate.id },
          data: { status }
        });

        if (status === "accepted") {
          accepted += 1;
          const dimensionKey = decision.edits?.dimensionKey ?? candidate.dimensionKey;
          const dimension = await tx.impactDimension.findUnique({ where: { key: dimensionKey } });
          if (!dimension) {
            throw new Error(`Unknown doughnut dimension: ${dimensionKey}`);
          }

          const impact = await tx.impact.create({
            data: {
              companyId: job.companyId,
              dimensionId: dimension.id,
              impactType: decision.edits?.impactType ?? candidate.impactType,
              title: decision.edits?.title ?? candidate.title,
              description: decision.edits?.description ?? candidate.description,
              events: {
                create: {
                  score: decision.edits?.score ?? candidate.score,
                  observedAt: new Date(decision.edits?.observedAt ?? candidate.observedAt.toISOString())
                }
              },
              sources: {
                create: {
                  type: job.fileId ? "file" : "text",
                  fileId: job.fileId,
                  sourceText: job.sourceText
                }
              }
            }
          });

          await tx.reviewDecision.create({
            data: {
              candidateId: candidate.id,
              impactId: impact.id,
              status,
              reviewerId,
              editedTitle: decision.edits?.title,
              editedDescription: decision.edits?.description,
              editedDimensionKey: decision.edits?.dimensionKey,
              editedImpactType: decision.edits?.impactType,
              editedScore: decision.edits?.score,
              editedObservedAt: decision.edits?.observedAt ? new Date(decision.edits.observedAt) : undefined
            }
          });
        } else {
          rejected += 1;
          await tx.reviewDecision.create({
            data: {
              candidateId: candidate.id,
              status,
              reviewerId,
              editedTitle: decision.edits?.title,
              editedDescription: decision.edits?.description,
              editedDimensionKey: decision.edits?.dimensionKey,
              editedImpactType: decision.edits?.impactType,
              editedScore: decision.edits?.score,
              editedObservedAt: decision.edits?.observedAt ? new Date(decision.edits.observedAt) : undefined
            }
          });
        }
      }
    });

    return ok({ accepted, rejected });
  } catch (error) {
    return serverError(error);
  }
}
