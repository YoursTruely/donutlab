import { prisma } from "@/lib/prisma";
import { createCompanySchema } from "@/lib/schemas";
import { ok, serverError } from "@/lib/http";

export async function GET() {
  try {
    const companies = await prisma.company.findMany({ orderBy: { createdAt: "desc" } });
    return ok({ companies });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const data = createCompanySchema.parse(json);

    const company = await prisma.company.create({
      data: { name: data.name }
    });

    return ok({ company }, 201);
  } catch (error) {
    return serverError(error);
  }
}
