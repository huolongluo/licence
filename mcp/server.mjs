import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { config as loadEnv } from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createWorld } from "./harbor.mjs";

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(here, "../.env") });
loadEnv({ path: join(here, "../.env.local") });
const port = Number(process.env.MCP_PORT || 8791);
const world = createWorld();

function buildServer() {
  const server = new McpServer({
    name: "harbor-pay",
    version: "0.1.0",
  });

  server.registerTool(
    "get_alert",
    {
      title: "Get active pager alert",
      description: "Read the current Harbor Pay SEV-1. Read-only.",
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => ok(world.getAlert()),
  );

  server.registerTool(
    "query_metrics",
    {
      title: "Query service metrics",
      description: "Error rate and p95 latency points. Optional service filter. Read-only.",
      inputSchema: { service: z.string().optional() },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ service }) => ok(world.queryMetrics(service)),
  );

  server.registerTool(
    "list_deploys",
    {
      title: "List recent deploys",
      description: "The last four Harbor Pay deploys. Read-only.",
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => ok(world.listDeploys()),
  );

  server.registerTool(
    "get_error_logs",
    {
      title: "Get error logs",
      description: "Recent error lines. Optional service filter. Read-only.",
      inputSchema: { service: z.string().optional() },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ service }) => ok(world.getErrorLogs(service)),
  );

  server.registerTool(
    "run_diagnostic",
    {
      title: "Run diagnostic in isolate",
      description:
        "Execute JavaScript against a frozen copy of metrics, deploys, and logs. No network, no filesystem, 8 second timeout. Use console.log to return findings.",
      inputSchema: {
        code: z.string().describe("JavaScript source. Use console.log for output."),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ code }) => ok(world.runDiagnostic(code)),
  );

  server.registerTool(
    "rollback_deploy",
    {
      title: "Rollback a production deploy",
      description:
        "IRREVERSIBLE. Rolls a Harbor Pay deploy out of production. TrueForge must pause for a human licence before this tool runs.",
      inputSchema: {
        deploy_id: z.string(),
        reason: z.string().describe("Why this rollback is justified."),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    },
    async ({ deploy_id, reason }) => ok(world.rollbackDeploy(deploy_id, reason)),
  );

  server.registerTool(
    "post_incident_note",
    {
      title: "Post incident note",
      description: "Write a note onto the incident. A write. Ask before posting.",
      inputSchema: { body: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ body }) => ok(world.postIncidentNote(body)),
  );

  return server;
}

function ok(payload) {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

const app = express();
app.use(express.json({ limit: "2mb" }));

const transports = new Map();

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  try {
    let transport = typeof sessionId === "string" ? transports.get(sessionId) : undefined;

    if (!transport) {
      if (!isInitializeRequest(req.body)) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Missing MCP session" },
          id: null,
        });
        return;
      }
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => transports.set(id, transport),
      });
      transport.onclose = () => {
        if (transport.sessionId) transports.delete(transport.sessionId);
      };
      const server = buildServer();
      await server.connect(transport);
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("mcp post failed", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal MCP error" },
        id: null,
      });
    }
  }
});

app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  const transport = typeof sessionId === "string" ? transports.get(sessionId) : undefined;
  if (!transport) {
    res.status(400).end("Missing MCP session");
    return;
  }
  await transport.handleRequest(req, res);
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  const transport = typeof sessionId === "string" ? transports.get(sessionId) : undefined;
  if (!transport) {
    res.status(400).end("Missing MCP session");
    return;
  }
  await transport.handleRequest(req, res);
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, name: "harbor-pay", alert: world.getAlert().id });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Harbor Pay MCP on http://127.0.0.1:${port}/mcp`);
});
