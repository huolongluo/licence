import type { DeskEvent } from "./replay";

type Loose = Record<string, unknown>;

function str(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export function normalizeForgeEvent(raw: unknown, index: number): DeskEvent | null {
  const event = raw as Loose;
  const type = str(event.type) || "unknown";
  const id = str(event.id) || `evt-${index}`;
  const threadId = (str(event.threadId) || str(event.thread_id) || "main") as string;

  if (type === "model.message.delta") {
    const content = str(event.content);
    if (!content) return null;
    return {
      id,
      type,
      threadId,
      kind: "message",
      title: "Agent",
      content,
      status: "running",
    };
  }

  if (type === "mcp.initialize") {
    return {
      id,
      type,
      threadId,
      kind: "mcp",
      title: "MCP connected",
      detail: str(event.mcpServerName) || str(event.mcp_server_name) || "harbor-pay",
      status: "done",
    };
  }

  if (type === "sandbox.created") {
    return {
      id,
      type,
      threadId,
      kind: "sandbox",
      title: "Sandbox provisioned",
      detail: "TrueForge isolate — secrets stay in the harness",
      status: "running",
    };
  }

  if (type === "thread.created") {
    return {
      id,
      type,
      threadId,
      kind: "subagent",
      title: `Subagent · ${str(event.title) || threadId}`,
      detail: "Fresh context. Intermediate tool calls stay off the root thread.",
      status: "running",
    };
  }

  if (type === "thread.done") {
    return {
      id,
      type,
      threadId,
      kind: "subagent",
      title: "Subagent returned",
      detail: str((event.state as Loose | undefined)?.status) || "done",
      status: "done",
    };
  }

  if (type === "tool.response") {
    const name = toolName(event);
    const kind = name === "run_diagnostic" ? "sandbox" : "tool";
    return {
      id,
      type,
      threadId,
      kind,
      title: name || "tool",
      toolName: name,
      detail: preview(event.content ?? event.output ?? event.result),
      status: "done",
    };
  }

  if (type === "tool.approval_required") {
    return {
      id,
      type,
      threadId,
      kind: "approval",
      title: "Licence required",
      toolName: pendingTool(event),
      detail: "Irreversible tool is holding for a human.",
      status: "blocked",
    };
  }

  if (type === "turn.created") {
    return {
      id,
      type,
      threadId,
      kind: "session",
      title: "Turn started",
      detail: str(event.turnId) || str(event.turn_id),
      status: "running",
    };
  }

  if (type === "turn.done") {
    const state = (event.state as Loose | undefined) || {};
    const required = state.requiredActions ?? state.required_actions;
    const blocked = Array.isArray(required) && required.length > 0;
    return {
      id,
      type,
      threadId,
      kind: blocked ? "approval" : "session",
      title: blocked ? "Holding for licence" : "Turn complete",
      detail: str(state.status) || "done",
      status: blocked ? "blocked" : "done",
    };
  }

  if (type === "model.message") {
    const content = str(event.content);
    if (!content) return null;
    return {
      id,
      type,
      threadId,
      kind: "message",
      title: "Agent",
      content,
      status: "done",
    };
  }

  return {
    id,
    type,
    threadId,
    kind: "session",
    title: type,
    detail: preview(event),
    status: "done",
  };
}

function toolName(event: Loose) {
  return (
    str(event.toolName) ||
    str(event.name) ||
    str((event.toolInfo as Loose | undefined)?.name) ||
    str((event.tool_info as Loose | undefined)?.name)
  );
}

function pendingTool(event: Loose) {
  const calls = (event.toolCalls || event.tool_calls) as Loose[] | undefined;
  const first = calls?.[0];
  if (!first) return "gated tool";
  return str(first.name) || str((first.toolInfo as Loose | undefined)?.name) || "gated tool";
}

function preview(value: unknown) {
  if (value == null) return undefined;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 180 ? `${text.slice(0, 177)}…` : text;
}

export type PendingLicence = {
  toolCallId: string;
  threadId: string;
  toolName: string;
  args: string;
  sourceEventId?: string;
};

export function licencesFromForge(
  events: unknown[],
  required: unknown,
): PendingLicence[] {
  const found: PendingLicence[] = [];
  const list = Array.isArray(required) ? required : [];
  for (const item of list) {
    const row = item as Loose;
    const type = str(row.type);
    if (type && type !== "tool.approval_required") continue;
    const calls = (row.toolCalls || row.tool_calls || []) as Loose[];
    for (const call of calls) {
      found.push({
        toolCallId: str(call.id) || str(call.toolCallId) || "",
        threadId: str(row.threadId) || str(row.thread_id) || "main",
        toolName: str(call.name) || "gated tool",
        args: typeof call.arguments === "string" ? call.arguments : JSON.stringify(call),
        sourceEventId: str(call.sourceEventId) || str(call.source_event_id),
      });
    }
  }

  if (found.length) return found.filter((row) => row.toolCallId);

  for (const raw of events) {
    const event = raw as Loose;
    if (str(event.type) !== "tool.approval_required") continue;
    const calls = (event.toolCalls || event.tool_calls || []) as Loose[];
    for (const ref of calls) {
      const sourceId = str(ref.sourceEventId) || str(ref.source_event_id);
      const source = events.find((e) => str((e as Loose).id) === sourceId) as Loose | undefined;
      const toolCalls = (source?.toolCalls || source?.tool_calls || []) as Loose[];
      const match = toolCalls.find((tc) => str(tc.id) === str(ref.id));
      const info = (match?.toolInfo || match?.tool_info || {}) as Loose;
      const fn = (match?.function || {}) as Loose;
      found.push({
        toolCallId: str(ref.id) || "",
        threadId: str(event.threadId) || str(event.thread_id) || "main",
        toolName: str(info.name) || str(match?.name) || "gated tool",
        args: str(fn.arguments) || "",
        sourceEventId: sourceId,
      });
    }
  }
  return found.filter((row) => row.toolCallId);
}
