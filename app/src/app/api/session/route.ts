import { NextResponse } from "next/server";
import { createSession, getSession, listSessionEvents } from "@/lib/trueforge";

export const runtime = "nodejs";

export async function POST() {
  const created = await createSession();
  return NextResponse.json(created);
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const session = await getSession(id);
  const events = await listSessionEvents(id).catch(() => ({ data: [] }));
  return NextResponse.json({ session: session.data, events: events.data ?? [] });
}
