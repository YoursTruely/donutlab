import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/http";

export async function GET() {
  try {
    const dimensions = await prisma.impactDimension.findMany({ orderBy: [{ domain: "asc" }, { name: "asc" }] });
    return ok({ dimensions });
  } catch (error) {
    return serverError(error);
  }
}
