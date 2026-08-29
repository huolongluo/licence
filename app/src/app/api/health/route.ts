import { NextResponse } from "next/server";
import { forgeHealth, listAgents } from "@/lib/trueforge";

export const runtime = "nodejs";

export async function GET() {
  const forge = await forgeHealth();
  let agent = false;
  if (forge) {
    try {
      const agents = await listAgents();
      agent = agents.some((row) => row.name === "licence-harbor-pay");
    } catch {
      agent = false;
    }
  }
  return NextResponse.json({
    forge,
    agent,
    live: forge && agent,
    replay: true,
  });
}
