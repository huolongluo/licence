#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(here, "../.env") });
loadEnv({ path: join(here, "../.env.local") });
const base = process.env.TRUEFORGE_BASE_URL || "http://127.0.0.1:8790";
const mcpUrl = process.env.MCP_URL || "http://127.0.0.1:8791/mcp";
const instructions = readFileSync(join(here, "instructions.md"), "utf8").trim();

function pickModel() {
  if (process.env.GEMINI_API_KEY) {
    return {
      provider: {
        type: "google-gemini",
        auth: { api_key: process.env.GEMINI_API_KEY },
        models: [
          {
            name: "gemini-2.5-flash",
            model_id: process.env.GEMINI_MODEL_ID || "gemini-2.5-flash",
            properties: { context_length: 1_000_000, max_output_tokens: 8192 },
          },
        ],
      },
      fqn: "google-gemini/gemini-2.5-flash",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: {
        type: "openai",
        auth: { api_key: process.env.OPENAI_API_KEY },
        models: [
          {
            name: "gpt-4.1-mini",
            model_id: "gpt-4.1-mini",
            properties: { context_length: 128000, max_output_tokens: 8192 },
          },
        ],
      },
      fqn: "openai/gpt-4.1-mini",
    };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: {
        type: "anthropic",
        auth: { api_key: process.env.ANTHROPIC_API_KEY },
        models: [
          {
            name: "claude-sonnet-4-6",
            model_id: "claude-sonnet-4-6",
            properties: { context_length: 200000, max_output_tokens: 8192 },
          },
        ],
      },
      fqn: "anthropic/claude-sonnet-4-6",
    };
  }
  return null;
}

async function tf(path, { method = "GET", body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const message = json?.error?.message || text || res.statusText;
    throw new Error(`${method} ${path} ${res.status}: ${message}`);
  }
  return json;
}

async function waitForTrueForge() {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/api/v1/capabilities`);
      if (res.ok) return;
    } catch {
      // still booting
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`TrueForge did not become ready at ${base}`);
}

async function waitForMcp() {
  const deadline = Date.now() + 30_000;
  const health = mcpUrl.replace(/\/mcp$/, "/health");
  while (Date.now() < deadline) {
    try {
      const res = await fetch(health);
      if (res.ok) return;
    } catch {
      // still booting
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Harbor Pay MCP did not become ready at ${health}`);
}

const model = pickModel();
if (!model) {
  console.log("No model API key in the environment.");
  console.log("Replay still works: open http://127.0.0.1:3057/desk?play=1");
  console.log("For the live harness, set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.");
  process.exit(0);
}

await waitForMcp();
await waitForTrueForge();

await tf("/api/v1/settings/model-providers", {
  method: "PUT",
  body: { manifest: model.provider },
});

await tf("/api/v1/settings/mcp-servers", {
  method: "PUT",
  body: {
    manifest: {
      type: "remote",
      name: "harbor-pay",
      url: mcpUrl,
      description: "Harbor Pay pager, metrics, deploys, isolate diagnostics, and gated rollback.",
    },
  },
});

if (process.env.DAYTONA_API_KEY) {
  await tf("/api/v1/settings/sandbox-providers", {
    method: "PUT",
    body: {
      manifest: {
        type: "daytona",
        auth: { api_key: process.env.DAYTONA_API_KEY },
      },
    },
  });
}

const sandboxEnabled = Boolean(process.env.DAYTONA_API_KEY);
const manifest = {
  model: { name: model.fqn, params: { max_tokens: 4096, temperature: 0.2 } },
  instructions,
  mcp_servers: [
    {
      name: "harbor-pay",
      preload: true,
      enable_tools: ["@all"],
      require_approval_for_tools: ["rollback_deploy", "post_incident_note"],
    },
  ],
  config: {
    iteration_limit: 40,
    sandbox: { enabled: sandboxEnabled, file_downloads: true },
    dynamic_sub_agents: { enabled: true },
    ask_user_questions: { enabled: true },
    generative_ui: { enabled: true },
  },
};

try {
  await tf("/api/v1/agents", {
    method: "POST",
    body: { name: "licence-harbor-pay", manifest },
  });
} catch (error) {
  if (!String(error.message).includes("409")) throw error;
  const listed = await tf("/api/v1/agents");
  const rows = Array.isArray(listed.data)
    ? listed.data
    : Array.isArray(listed.data?.items)
      ? listed.data.items
      : Array.isArray(listed)
        ? listed
        : [];
  const found = rows.find((a) => a.name === "licence-harbor-pay");
  if (!found?.id) throw error;
  await tf(`/api/v1/agents/${found.id}`, { method: "PUT", body: { manifest } });
}

console.log("TrueForge agent licence-harbor-pay is registered.");
console.log(`  model     ${model.fqn}`);
console.log(`  mcp       ${mcpUrl}`);
console.log(`  sandbox   ${sandboxEnabled ? "daytona" : "mcp isolate (run_diagnostic)"}`);
console.log("  approval  rollback_deploy, post_incident_note");
