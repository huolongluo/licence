import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));

export function loadFixture() {
  const raw = readFileSync(join(here, "../fixtures/harbor-pay.json"), "utf8");
  return JSON.parse(raw);
}

export function createWorld(seed = loadFixture()) {
  const state = structuredClone(seed);
  state.rolled_back = [];
  state.notes = [];
  return {
    getAlert() {
      return {
        ...state.alert,
        rolled_back: [...state.rolled_back],
        recovery: recovery(state),
      };
    },
    queryMetrics(service) {
      const rows = state.metrics.filter((m) => !service || m.service === service);
      return { service: service || "all", points: rows, recovery: recovery(state) };
    },
    listDeploys() {
      return { deploys: state.deploys };
    },
    getErrorLogs(service) {
      const rows = state.logs.filter((l) => !service || l.service === service);
      return { logs: rows };
    },
    runDiagnostic(code) {
      if (typeof code !== "string" || code.trim().length === 0) {
        throw new Error("diagnostic code is required");
      }
      if (code.length > 12_000) {
        throw new Error("diagnostic code exceeds 12k characters");
      }
      const stdout = [];
      const sandbox = {
        console: {
          log: (...args) => stdout.push(args.map(stringify).join(" ")),
        },
        metrics: structuredClone(state.metrics),
        deploys: structuredClone(state.deploys),
        logs: structuredClone(state.logs),
        alert: structuredClone(state.alert),
      };
      Object.freeze(sandbox.metrics);
      Object.freeze(sandbox.deploys);
      Object.freeze(sandbox.logs);
      Object.freeze(sandbox.alert);
      vm.runInNewContext(code, sandbox, {
        timeout: 8000,
        displayErrors: true,
        contextCodeGeneration: { strings: false, wasm: false },
      });
      return {
        isolated: true,
        network: false,
        filesystem: false,
        timeout_ms: 8000,
        stdout: stdout.join("\n") || "(no stdout)",
      };
    },
    rollbackDeploy(deployId, reason) {
      const deploy = state.deploys.find((d) => d.id === deployId);
      if (!deploy) throw new Error(`unknown deploy ${deployId}`);
      if (state.rolled_back.includes(deployId)) {
        return { ok: true, already: true, deploy, recovery: recovery(state) };
      }
      if (!reason || String(reason).trim().length < 8) {
        throw new Error("rollback requires a human-readable reason");
      }
      state.rolled_back.push(deployId);
      if (deployId === "4c21") {
        for (const point of state.metrics) {
          if (point.service === "checkout-api" && point.ts >= "2026-08-29T14:15:00Z") {
            point.error_rate = 0.005;
            point.p95_ms = 430;
          }
        }
      }
      return {
        ok: true,
        irreversible: true,
        deploy,
        reason,
        recovery: recovery(state),
      };
    },
    postIncidentNote(body) {
      const note = {
        at: new Date().toISOString(),
        body: String(body || "").slice(0, 2000),
      };
      state.notes.push(note);
      return { ok: true, note, count: state.notes.length };
    },
    snapshot() {
      return structuredClone(state);
    },
  };
}

function recovery(state) {
  if (state.rolled_back.includes("4c21")) {
    return {
      status: "recovering",
      checkout_error_rate: 0.005,
      note: "deploy 4c21 rolled back — checkout error rate returning to baseline",
    };
  }
  return {
    status: "degraded",
    checkout_error_rate: 0.081,
    note: "checkout still failing — no rollback applied",
  };
}

function stringify(value) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
