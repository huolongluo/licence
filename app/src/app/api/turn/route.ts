import { createTurnStream } from "@/lib/trueforge";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as { sessionId?: string; input?: unknown[] };
  if (!body.sessionId || !body.input) {
    return new Response(JSON.stringify({ error: "sessionId and input required" }), { status: 400 });
  }

  const upstream = await createTurnStream(body.sessionId, body.input);
  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    return new Response(text || "TrueForge turn failed", { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
