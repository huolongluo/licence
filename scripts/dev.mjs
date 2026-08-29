#!/usr/bin/env node
import { spawn } from "node:child_process";
import net from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const root = dirname(fileURLToPath(import.meta.url));
const repo = join(root, "..");
loadEnv({ path: join(repo, ".env") });
loadEnv({ path: join(repo, ".env.local") });

function run(command, args, extra = {}) {
  const child = spawn(command, args, {
    cwd: repo,
    stdio: "inherit",
    env: { ...process.env, ...(extra.env || {}) },
  });
  child.on("exit", (code) => {
    if (code && code !== 0) process.exitCode = code;
  });
  return child;
}

function portOpen(port) {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host: "127.0.0.1" }, () => {
      sock.end();
      resolve(true);
    });
    sock.on("error", () => resolve(false));
    sock.setTimeout(500, () => {
      sock.destroy();
      resolve(false);
    });
  });
}

async function waitPort(port, label) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (await portOpen(port)) return;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`${label} did not listen on ${port}`);
}

const mcpPort = Number(process.env.MCP_PORT || 8791);
const forgeUrl = new URL(process.env.TRUEFORGE_BASE_URL || "http://127.0.0.1:8790");
const forgePort = Number(forgeUrl.port || 8790);

if (!(await portOpen(mcpPort))) run("node", ["mcp/server.mjs"]);
await waitPort(mcpPort, "Harbor Pay MCP");

const skipForge = process.env.LICENCE_SKIP_TRUEFORGE === "1";
if (!skipForge) {
  if (!(await portOpen(forgePort))) {
    run("npx", ["--yes", "@truefoundry/trueforge@latest"]);
  }
  await waitPort(forgePort, "TrueForge");
  await new Promise((resolve, reject) => {
    const boot = spawn(process.execPath, ["harness/bootstrap.mjs"], {
      cwd: repo,
      stdio: "inherit",
      env: process.env,
    });
    boot.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`bootstrap exited ${code}`))));
  });
}

run("npm", ["run", "dev", "--prefix", "app"]);
console.log("\nLicence Desk → http://127.0.0.1:3057");
console.log("Replay       → http://127.0.0.1:3057/desk?play=1\n");
