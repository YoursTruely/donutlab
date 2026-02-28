import { inngest } from "@/lib/inngest";
import { processExtractionJob } from "@/lib/extraction-service";

export const extractionFunctions = [
  inngest.createFunction(
    { id: "process-extraction-job" },
    { event: "impact/extraction.requested" },
    async ({ event }) => {
      const jobId = event.data.jobId as string;
      await processExtractionJob(jobId);
      return { ok: true, jobId };
    }
  )
];
