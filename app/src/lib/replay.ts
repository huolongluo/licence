export type DeskEvent = {
  id: string;
  type: string;
  threadId?: string | null;
  title: string;
  detail?: string;
  toolName?: string;
  content?: string;
  status?: "running" | "done" | "blocked" | "approved" | "denied";
  kind: "mcp" | "subagent" | "sandbox" | "tool" | "approval" | "message" | "session";
};

export type ReplayBeat = {
  at: number;
  event: DeskEvent;
};

export const INVESTIGATE_PROMPT =
  "Investigate the payment-failures alert. Roll back if a deploy caused it.";

export const REPLAY: ReplayBeat[] = [
  {
    at: 200,
    event: {
      id: "e1",
      type: "turn.created",
      kind: "session",
      title: "Session opened",
      detail: "TrueForge session sess-harbor-pay · agent licence-harbor-pay",
      status: "running",
      threadId: "main",
    },
  },
  {
    at: 700,
    event: {
      id: "e2",
      type: "mcp.initialize",
      kind: "mcp",
      title: "MCP · harbor-pay",
      detail: "Connector ready. Read tools live; rollback is gated.",
      threadId: "main",
      status: "done",
    },
  },
  {
    at: 1100,
    event: {
      id: "e3",
      type: "tool.response",
      kind: "tool",
      title: "get_alert",
      toolName: "get_alert",
      detail: "PAGER-4419 SEV-1 · checkout-api timeouts doubled",
      threadId: "main",
      status: "done",
    },
  },
  {
    at: 1600,
    event: {
      id: "e4",
      type: "thread.created",
      kind: "subagent",
      title: "Subagent · metrics",
      detail: "Clean context. Error rate by service.",
      threadId: "thr-metrics",
      status: "running",
    },
  },
  {
    at: 1750,
    event: {
      id: "e5",
      type: "thread.created",
      kind: "subagent",
      title: "Subagent · deploys",
      detail: "Clean context. Last four deploys.",
      threadId: "thr-deploys",
      status: "running",
    },
  },
  {
    at: 1900,
    event: {
      id: "e6",
      type: "thread.created",
      kind: "subagent",
      title: "Subagent · logs",
      detail: "Clean context. Checkout errors only.",
      threadId: "thr-logs",
      status: "running",
    },
  },
  {
    at: 2800,
    event: {
      id: "e7",
      type: "tool.response",
      kind: "tool",
      title: "query_metrics",
      toolName: "query_metrics",
      detail: "checkout-api error rate 0.4% → 8.1% after 14:12",
      threadId: "thr-metrics",
      status: "done",
    },
  },
  {
    at: 3200,
    event: {
      id: "e8",
      type: "tool.response",
      kind: "tool",
      title: "list_deploys",
      toolName: "list_deploys",
      detail: "4c21 checkout-api · tune timeout budget + connection pool",
      threadId: "thr-deploys",
      status: "done",
    },
  },
  {
    at: 3600,
    event: {
      id: "e9",
      type: "tool.response",
      kind: "tool",
      title: "get_error_logs",
      toolName: "get_error_logs",
      detail: "pool=8 waiters=41 · timeout budget exceeded 2400ms",
      threadId: "thr-logs",
      status: "done",
    },
  },
  {
    at: 4000,
    event: {
      id: "e10",
      type: "thread.done",
      kind: "subagent",
      title: "Subagents returned",
      detail: "Only summaries reached the root agent. Raw tool noise stayed off the main thread.",
      threadId: "main",
      status: "done",
    },
  },
  {
    at: 4600,
    event: {
      id: "e11",
      type: "sandbox.created",
      kind: "sandbox",
      title: "Isolate provisioned",
      detail: "No network. No filesystem. Frozen copy of metrics, deploys, logs. 8s cap.",
      threadId: "main",
      status: "running",
    },
  },
  {
    at: 5600,
    event: {
      id: "e12",
      type: "tool.response",
      kind: "sandbox",
      title: "run_diagnostic",
      toolName: "run_diagnostic",
      detail: "before 0.37% · after 6.9% · culprit 4c21",
      threadId: "main",
      status: "done",
    },
  },
  {
    at: 6400,
    event: {
      id: "e13",
      type: "model.message",
      kind: "message",
      title: "Cause found",
      content:
        "Deploy 4c21 doubled checkout timeouts. Rollback is irreversible. Holding for your licence.",
      threadId: "main",
      status: "done",
    },
  },
  {
    at: 7000,
    event: {
      id: "e14",
      type: "tool.approval_required",
      kind: "approval",
      title: "Licence required",
      toolName: "rollback_deploy",
      detail: "rollback_deploy · deploy_id=4c21",
      threadId: "main",
      status: "blocked",
    },
  },
];

export const AFTER_APPROVE: ReplayBeat[] = [
  {
    at: 400,
    event: {
      id: "e15",
      type: "user.tool_approval",
      kind: "approval",
      title: "Licence granted",
      detail: "rollback_deploy allowed by the operator",
      status: "approved",
      threadId: "main",
    },
  },
  {
    at: 1200,
    event: {
      id: "e16",
      type: "tool.response",
      kind: "tool",
      title: "rollback_deploy",
      toolName: "rollback_deploy",
      detail: "4c21 rolled back · checkout error rate recovering to 0.5%",
      status: "done",
      threadId: "main",
    },
  },
  {
    at: 1800,
    event: {
      id: "e17",
      type: "tool.approval_required",
      kind: "approval",
      title: "Licence required",
      toolName: "post_incident_note",
      detail: "post_incident_note · closeout on PAGER-4419",
      status: "blocked",
      threadId: "main",
    },
  },
];

export const AFTER_NOTE: ReplayBeat[] = [
  {
    at: 300,
    event: {
      id: "e18",
      type: "user.tool_approval",
      kind: "approval",
      title: "Note licensed",
      detail: "post_incident_note allowed",
      status: "approved",
      threadId: "main",
    },
  },
  {
    at: 900,
    event: {
      id: "e19",
      type: "tool.response",
      kind: "tool",
      title: "post_incident_note",
      toolName: "post_incident_note",
      detail: "Closeout posted. Session remains on the desk after refresh.",
      status: "done",
      threadId: "main",
    },
  },
  {
    at: 1400,
    event: {
      id: "e20",
      type: "turn.done",
      kind: "session",
      title: "Session logged",
      detail: "TrueForge kept the transcript. Refresh does not lose the licence trail.",
      status: "done",
      threadId: "main",
    },
  },
];

export const AFTER_DENY: ReplayBeat[] = [
  {
    at: 400,
    event: {
      id: "e15d",
      type: "user.tool_approval",
      kind: "approval",
      title: "Licence denied",
      detail: "rollback_deploy blocked. Nothing irreversible ran.",
      status: "denied",
      threadId: "main",
    },
  },
  {
    at: 1100,
    event: {
      id: "e16d",
      type: "model.message",
      kind: "message",
      title: "Held",
      content: "Rollback not executed. Checkout remains degraded at 8.1%. Standing by.",
      status: "done",
      threadId: "main",
    },
  },
];
