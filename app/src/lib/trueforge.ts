const base = process.env.TRUEFORGE_BASE_URL || "http://127.0.0.1:8790";

export async function tf<T = unknown>(path: string, init: RequestInit = {}) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${init.method || "GET"} ${path} ${res.status}: ${text}`);
  }
  if (res.headers.get("content-type")?.includes("text/event-stream")) {
    return res as unknown as T;
  }
  return (await res.json()) as T;
}

export async function forgeHealth() {
  try {
    const res = await fetch(`${base}/api/v1/capabilities`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listAgents() {
  const json = await tf<{ data?: { id: string; name: string }[] }>("/api/v1/agents");
  return json.data ?? [];
}

export async function createSession() {
  return tf<{ data: { id: string } }>("/api/v1/sessions", {
    method: "POST",
    body: JSON.stringify({ agent: { name: "licence-harbor-pay" } }),
  });
}

export async function getSession(id: string) {
  return tf<{ data: { id: string } }>(`/api/v1/sessions/${id}`);
}

export function createTurnStream(sessionId: string, input: unknown[]) {
  return fetch(`${base}/api/v1/sessions/${sessionId}/turns`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
    },
    body: JSON.stringify({ input, stream: true }),
    cache: "no-store",
  });
}

export async function listSessionEvents(sessionId: string) {
  return tf<{ data?: unknown[] }>(`/api/v1/sessions/${sessionId}/events`);
}
