import { prisma } from "@/lib/prisma";
import { createExtractionJobSchema } from "@/lib/schemas";
import { ok, serverError } from "@/lib/http";
import { inngest } from "@/lib/inngest";
import { processExtractionJob } from "@/lib/extraction-service";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const data = createExtractionJobSchema.parse(json);

    const job = await prisma.extractionJob.create({
      data: {
        companyId: data.companyId,
        sourceText: data.sourceText,
        fileId: data.fileId,
        status: "queued"
      }
    });

    try {
      await inngest.send({
        name: "impact/extraction.requested",
        data: { jobId: job.id }
      });
    } catch {
      await processExtractionJob(job.id);
    }

    return ok({ jobId: job.id }, 201);
  } catch (error) {
    return serverError(error);
  }
}
