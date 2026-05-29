import { NextResponse } from "next/server";
import { addAudit, getConsoleState } from "@/features/clinical-console/server/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { message?: unknown } | null;

  if (typeof body?.message !== "string" || body.message.trim().length < 4 || body.message.length > 240) {
    return NextResponse.json({ code: "BAD_REQUEST", message: "Audit message is invalid." }, { status: 400 });
  }

  const event = addAudit(body.message.trim());

  return NextResponse.json({ event, auditEvents: getConsoleState().auditEvents });
}
