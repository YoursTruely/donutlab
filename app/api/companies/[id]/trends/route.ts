import { getTrendAggregate } from "@/lib/aggregations";
import { trendQuerySchema } from "@/lib/schemas";
import { ok, serverError } from "@/lib/http";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const url = new URL(request.url);
    const parsed = trendQuerySchema.parse({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      granularity: url.searchParams.get("granularity")
    });

    const data = await getTrendAggregate(
      params.id,
      new Date(parsed.from),
      new Date(parsed.to),
      parsed.granularity
    );

    return ok({
      companyId: params.id,
      from: parsed.from,
      to: parsed.to,
      granularity: parsed.granularity,
      points: data
    });
  } catch (error) {
    return serverError(error);
  }
}
