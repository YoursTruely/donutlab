import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function badRequest(message: string, details?: unknown): NextResponse {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function serverError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return badRequest("Validation failed", error.flatten());
  }
  const message = error instanceof Error ? error.message : "Internal error";
  return NextResponse.json({ error: message }, { status: 500 });
}
