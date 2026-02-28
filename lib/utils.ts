export function clampScore(value: number): number {
  if (value > 100) {
    return 100;
  }
  if (value < -100) {
    return -100;
  }
  return Math.round(value);
}

export function parseDateOrThrow(value: string | null, label: string): Date {
  if (!value) {
    throw new Error(`${label} is required`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be an ISO date`);
  }
  return date;
}

export function toStartOfBucket(date: Date, granularity: "week" | "month"): string {
  const d = new Date(date);
  if (granularity === "month") {
    d.setUTCDate(1);
  } else {
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
  }
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}
