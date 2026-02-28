import { getDoughnutAggregate } from "@/lib/aggregations";
import { doughnutQuerySchema } from "@/lib/schemas";
import { ok, serverError } from "@/lib/http";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const url = new URL(request.url);
    const parsed = doughnutQuerySchema.parse({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to")
    });
    const data = await getDoughnutAggregate(params.id, new Date(parsed.from), new Date(parsed.to));
    return ok(data);
  } catch (error) {
    return serverError(error);
  }
}
