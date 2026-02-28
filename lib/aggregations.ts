import { prisma } from "@/lib/prisma";
import { toStartOfBucket } from "@/lib/utils";

export interface DoughnutDimensionAggregate {
  dimensionKey: string;
  dimensionName: string;
  domain: "social_foundation" | "ecological_ceiling";
  positiveScore: number;
  negativeScore: number;
  netScore: number;
  events: number;
}

export interface DoughnutAggregateResult {
  companyId: string;
  from: string;
  to: string;
  dimensions: DoughnutDimensionAggregate[];
}

export interface TrendSeriesPoint {
  bucketStart: string;
  dimensionKey: string;
  dimensionName: string;
  impactType: "positive" | "negative";
  averageScore: number;
  totalScore: number;
  events: number;
}

export async function getDoughnutAggregate(companyId: string, from: Date, to: Date): Promise<DoughnutAggregateResult> {
  const events = await prisma.impactEvent.findMany({
    where: {
      observedAt: { gte: from, lte: to },
      impact: { companyId }
    },
    include: {
      impact: {
        include: {
          dimension: true
        }
      }
    }
  });

  const map = new Map<string, DoughnutDimensionAggregate>();
  for (const event of events) {
    const { dimension } = event.impact;
    const key = dimension.key;
    if (!map.has(key)) {
      map.set(key, {
        dimensionKey: key,
        dimensionName: dimension.name,
        domain: dimension.domain,
        positiveScore: 0,
        negativeScore: 0,
        netScore: 0,
        events: 0
      });
    }
    const current = map.get(key)!;
    if (event.impact.impactType === "positive") {
      current.positiveScore += event.score;
    } else {
      current.negativeScore += Math.abs(event.score);
    }
    current.netScore += event.score;
    current.events += 1;
  }

  return {
    companyId,
    from: from.toISOString(),
    to: to.toISOString(),
    dimensions: Array.from(map.values()).sort((a, b) => a.dimensionName.localeCompare(b.dimensionName))
  };
}

export async function getTrendAggregate(
  companyId: string,
  from: Date,
  to: Date,
  granularity: "week" | "month"
): Promise<TrendSeriesPoint[]> {
  const events = await prisma.impactEvent.findMany({
    where: {
      observedAt: { gte: from, lte: to },
      impact: { companyId }
    },
    include: {
      impact: {
        include: {
          dimension: true
        }
      }
    }
  });

  const bucket = new Map<string, { sum: number; count: number; meta: Omit<TrendSeriesPoint, "averageScore" | "totalScore" | "events"> }>();

  for (const event of events) {
    const key = [
      toStartOfBucket(event.observedAt, granularity),
      event.impact.dimension.key,
      event.impact.impactType
    ].join("|");

    if (!bucket.has(key)) {
      bucket.set(key, {
        sum: 0,
        count: 0,
        meta: {
          bucketStart: toStartOfBucket(event.observedAt, granularity),
          dimensionKey: event.impact.dimension.key,
          dimensionName: event.impact.dimension.name,
          impactType: event.impact.impactType
        }
      });
    }

    const current = bucket.get(key)!;
    current.sum += event.score;
    current.count += 1;
  }

  return Array.from(bucket.values())
    .map((item) => ({
      ...item.meta,
      averageScore: Number((item.sum / item.count).toFixed(2)),
      totalScore: item.sum,
      events: item.count
    }))
    .sort((a, b) => a.bucketStart.localeCompare(b.bucketStart));
}
