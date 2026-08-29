"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AFTER_APPROVE,
  AFTER_DENY,
  AFTER_NOTE,
  INVESTIGATE_PROMPT,
  REPLAY,
  type DeskEvent,
  type ReplayBeat,
} from "@/lib/replay";
import { licencesFromForge, normalizeForgeEvent, type PendingLicence } from "@/lib/normalize";

type Health = { live: boolean; forge: boolean; agent: boolean; replay: boolean };
type Phase = "idle" | "running" | "holding" | "recovering" | "held";

function playBeats(beats: ReplayBeat[], onEvent: (event: DeskEvent) => void) {
  const timers: number[] = [];
  for (const beat of beats) {
    timers.push(window.setTimeout(() => onEvent(beat.event), beat.at));
  }
  return () => timers.forEach(clearTimeout);
}

async function readSse(
  res: Response,
  onEvent: (raw: unknown) => void,
) {
  if (!res.body) throw new Error("no SSE body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    for (const part of parts) {
      const dataLines = part
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");
      if (!dataLines || dataLines === "[DONE]") continue;
      try {
        onEvent(JSON.parse(dataLines));
      } catch {
        // ignore malformed chunks
      }
    }
  }
}

export function Desk() {
  const params = useSearchParams();
  const autoplay = params.get("play") === "1";
  const [health, setHealth] = useState<Health | null>(null);
  const [events, setEvents] = useState<DeskEvent[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<"replay" | "live">("replay");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingLicence[]>([]);
  const [error, setError] = useState<string | null>(null);
  const rawRef = useRef<unknown[]>([]);
  const started = useRef(false);
  const pendingRef = useRef<PendingLicence[]>([]);
  const phaseRef = useRef<Phase>("idle");
  const modeRef = useRef<"replay" | "live">("replay");
  const sessionRef = useRef<string | null>(null);
  pendingRef.current = pending;
  phaseRef.current = phase;
  modeRef.current = mode;
  sessionRef.current = sessionId;

  const lastMessage = useMemo(
    () => [...events].reverse().find((e) => e.kind === "message" && e.content)?.content,
    [events],
  );

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ live: false, forge: false, agent: false, replay: true }));
  }, []);

  function push(event: DeskEvent) {
    setEvents((prev) => {
      if (event.type === "model.message.delta") {
        const idx = prev.findIndex((row) => row.id === event.id && row.kind === "message");
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], content: `${next[idx].content || ""}${event.content || ""}` };
          return next;
        }
      }
      return [...prev, event];
    });
    if (event.type === "tool.approval_required") setPhase("holding");
  }

  function startReplay() {
    setMode("replay");
    setPhase("running");
    setEvents([]);
    setPending([]);
    return playBeats(REPLAY, (event) => {
      push(event);
      if (event.id === "e14") {
        setPending([
          {
            toolCallId: "call-rollback",
            threadId: "main",
            toolName: "rollback_deploy",
            args: '{"deploy_id":"4c21","reason":"Deploy 4c21 doubled checkout timeouts"}',
          },
        ]);
      }
    });
  }

  async function startLive() {
    setMode("live");
    setPhase("running");
    setEvents([]);
    setPending([]);
    setError(null);
    rawRef.current = [];
    const created = await fetch("/api/session", { method: "POST" }).then((r) => {
      if (!r.ok) throw new Error("Could not open a TrueForge session");
      return r.json();
    });
    const id = created.data?.id as string;
    setSessionId(id);
    window.localStorage.setItem("licence-session", id);
    const turn = await fetch("/api/turn", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: id,
        input: [{ type: "user.message", content: INVESTIGATE_PROMPT }],
      }),
    });
    await readSse(turn, (raw) => {
      rawRef.current.push(raw);
      const normalized = normalizeForgeEvent(raw, rawRef.current.length);
      if (normalized) push(normalized);
      const licences = licencesFromForge(rawRef.current, (raw as { state?: { required_actions?: unknown } }).state?.required_actions);
      if (licences.length) {
        setPending(licences);
        setPhase("holding");
      }
    });
  }

  async function decide(allow: boolean) {
    const current = pendingRef.current;
    if (phaseRef.current !== "holding" || current.length === 0) return;
    if (modeRef.current === "replay") {
      setPending([]);
      const beats = allow ? AFTER_APPROVE : AFTER_DENY;
      playBeats(beats, (event) => {
        push(event);
        if (event.toolName === "post_incident_note" && event.status === "blocked") {
          setPending([
            {
              toolCallId: "call-note",
              threadId: "main",
              toolName: "post_incident_note",
              args: '{"body":"4c21 rolled back. Checkout recovering."}',
            },
          ]);
          setPhase("holding");
        }
        if (event.id === "e20") setPhase("recovering");
        if (event.id === "e16d") setPhase("held");
      });
      if (allow) setPhase("running");
      else setPhase("held");
      return;
    }

    if (!sessionRef.current || current.length === 0) return;
    setPhase("running");
    const input = current.map((row) => ({
      type: "user.tool_approval",
      thread_id: row.threadId,
      tool_call_id: row.toolCallId,
      approval: allow ? { status: "allow" } : { status: "deny", reason: "Operator withheld the licence." },
    }));
    setPending([]);
    const turn = await fetch("/api/turn", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: sessionRef.current, input }),
    });
    await readSse(turn, (raw) => {
      rawRef.current.push(raw);
      const normalized = normalizeForgeEvent(raw, rawRef.current.length);
      if (normalized) push(normalized);
      const licences = licencesFromForge(rawRef.current, (raw as { state?: { required_actions?: unknown } }).state?.required_actions);
      if (licences.length) {
        setPending(licences);
        setPhase("holding");
      }
    });
    if (!allow) setPhase("held");
    else setPhase("recovering");
  }

  useEffect(() => {
    if (!autoplay || started.current) return;
    started.current = true;
    const stop = startReplay();
    const grant = window.setTimeout(() => decide(true), 14000);
    return () => {
      stop();
      clearTimeout(grant);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay]);

  useEffect(() => {
    if (mode !== "replay" || pending[0]?.toolName !== "post_incident_note") return;
    const t = window.setTimeout(() => {
      setPending([]);
      playBeats(AFTER_NOTE, (event) => {
        push(event);
        if (event.id === "e20") setPhase("recovering");
      });
    }, autoplay ? 1600 : 0);
    if (!autoplay) return undefined;
    return () => clearTimeout(t);
  }, [pending, mode, autoplay]);

  const stamp =
    phase === "holding" ? "hold" : phase === "recovering" ? "granted" : phase === "held" ? "denied" : "";
  const stampLabel =
    phase === "holding" ? "Hold" : phase === "recovering" ? "Licensed" : phase === "held" ? "Denied" : "Idle";

  return (
    <>
      <div className="row" style={{ marginTop: 0, marginBottom: "1rem" }}>
        <button className="btn gold" disabled={phase === "running"} onClick={() => startReplay()}>
          Replay Harbor Pay
        </button>
        <button
          className="btn teal"
          disabled={!health?.live || phase === "running"}
          onClick={() => startLive().catch((err) => setError(String(err)))}
        >
          Live TrueForge
        </button>
        <span className="pill">{mode === "live" ? "harness live" : "recorded harness events"}</span>
        {sessionId ? <span className="pill">{sessionId.slice(0, 14)}</span> : null}
      </div>
      {error ? <p className="muted">{error}</p> : null}
      {!health?.live ? (
        <p className="muted">
          Live path needs TrueForge on :8790, the Harbor Pay MCP, and a model key. Replay does not.
        </p>
      ) : null}

      <section className="desk-grid">
        <aside className="desk-col">
          <p className="kicker">Alert</p>
          <p className="alert-id">PAGER-4419 · SEV-1</p>
          <h3>Checkout timeouts doubled</h3>
          <p className="muted">Harbor Pay · checkout-api · fired 14:28 UTC</p>
          <div className="stat">
            <span>Baseline</span>
            <b>0.4%</b>
          </div>
          <div className="stat">
            <span>Now</span>
            <b>{phase === "recovering" ? "0.5% recovering" : "8.1% failing"}</b>
          </div>
          <div className="stat">
            <span>Suspect</span>
            <b>deploy 4c21</b>
          </div>
          <p className="muted" style={{ marginTop: "0.8rem" }}>
            {lastMessage || "Investigate the payment-failures alert. Roll back if a deploy caused it."}
          </p>
        </aside>

        <section className="desk-col">
          <p className="kicker">Harness</p>
          <h3>What TrueForge is doing</h3>
          <div className="timeline">
            {events.length === 0 ? (
              <p className="muted">Waiting. The desk stays empty until the harness moves.</p>
            ) : null}
            {events
              .filter((event) => event.type !== "model.message.delta")
              .map((event) => (
                <article key={event.id + event.title} className={`beat kind-${event.kind}`}>
                  <span className="pill">{event.kind}</span>
                  <b>{event.title}</b>
                  <p className="muted">{event.detail || event.content}</p>
                </article>
              ))}
          </div>
        </section>

        <aside className="desk-col">
          <p className="kicker">Licence</p>
          <div className={`stamp ${stamp} ${phase === "holding" ? "hold" : ""}`}>{stampLabel}</div>
          <h3>
            {pending[0]?.toolName === "rollback_deploy"
              ? "Rollback 4c21"
              : pending[0]?.toolName === "post_incident_note"
                ? "Post the closeout"
                : phase === "recovering"
                  ? "Production licensed"
                  : phase === "held"
                    ? "Nothing ran"
                    : "No irreversible step yet"}
          </h3>
          <p className="muted">
            {pending[0]
              ? pending[0].args
              : phase === "recovering"
                ? "4c21 is out. Checkout is recovering. The session stays on TrueForge."
                : phase === "held"
                  ? "Rollback did not run. Nothing irreversible happened."
                  : "Read tools run on their own. Writes wait here. This pause is TrueForge, not a prompt."}
          </p>
          {phase === "holding" && pending.length > 0 ? (
            <div className="row">
              <button className="btn gold" onClick={() => decide(true)}>
                Grant licence
              </button>
              <button className="btn danger" onClick={() => decide(false)}>
                Deny
              </button>
            </div>
          ) : null}
        </aside>
      </section>
    </>
  );
}
