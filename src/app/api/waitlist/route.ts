import { NextResponse } from "next/server";
import { submitWaitlistEmail } from "@/lib/waitlist";

export async function POST(request: Request) {
  let input: { email?: unknown; website?: unknown; source?: unknown };

  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await submitWaitlistEmail({
    email: String(input.email || ""),
    website: String(input.website || ""),
    source: String(input.source || "waitlist"),
  });

  return result.ok
    ? NextResponse.json(result)
    : NextResponse.json({ error: result.error }, { status: result.status });
}