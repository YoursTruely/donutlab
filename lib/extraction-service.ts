import { prisma } from "@/lib/prisma";
import { extractImpactCandidates } from "@/lib/ai-extraction";

export async function processExtractionJob(jobId: string): Promise<void> {
  const job = await prisma.extractionJob.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new Error(`Extraction job not found: ${jobId}`);
  }

  await prisma.extractionJob.update({
    where: { id: job.id },
    data: { status: "processing", error: null }
  });

  try {
    const source = job.sourceText ?? "";
    const candidates = await extractImpactCandidates(source);

    await prisma.$transaction([
      prisma.extractionCandidate.deleteMany({ where: { extractionJobId: job.id } }),
      prisma.extractionJob.update({
        where: { id: job.id },
        data: {
          status: "completed",
          candidates: {
            create: candidates.map((candidate) => ({
              title: candidate.title,
              description: candidate.description,
              dimensionKey: candidate.dimensionKey,
              impactType: candidate.impactType,
              score: candidate.score,
              observedAt: new Date(candidate.observedAt),
              confidence: candidate.confidence
            }))
          }
        }
      })
    ]);
  } catch (error) {
    await prisma.extractionJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown extraction failure"
      }
    });
    throw error;
  }
}
