import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { addAudit, getConsoleState } from "@/features/clinical-console/server/store";

export const dynamic = "force-dynamic";

const sessionCookieName = "thermoeye_mock_session";
const sessionCookieValue = "pilot-doctor";

export async function GET() {
  const sessionCookie = (await cookies()).get(sessionCookieName);

  if (sessionCookie?.value !== sessionCookieValue) {
    return NextResponse.json({ code: "UNAUTHORIZED", message: "Clinical console session is not active." }, { status: 401 });
  }

  return NextResponse.json({ user: getConsoleState().sessionUser });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;

  if (typeof body?.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ code: "BAD_REQUEST", message: "Email and password are required." }, { status: 400 });
  }

  const { sessionUser } = getConsoleState();
  addAudit(`${sessionUser.name} signed in as ${sessionUser.role}`);

  const response = NextResponse.json({ user: sessionUser });
  response.cookies.set(sessionCookieName, sessionCookieValue, {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: "/",
    sameSite: "lax",
  });

  return response;
}

export function DELETE() {
  const { sessionUser } = getConsoleState();
  addAudit(`${sessionUser.name} signed out`);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
