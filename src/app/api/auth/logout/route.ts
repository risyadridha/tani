import { NextResponse } from "next/server";
import { destroySession } from "@/lib/server/session";

export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  await destroySession();
  return NextResponse.json({ data: { ok: true } });
}
