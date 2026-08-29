import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld, loadFixture } from "../mcp/harbor.mjs";

test("fixture names the Harbor Pay checkout SEV-1", () => {
  const fixture = loadFixture();
  assert.equal(fixture.alert.id, "PAGER-4419");
  assert.equal(fixture.deploys.at(-1).id, "4c21");
});

test("read tools do not mutate recovery", () => {
  const world = createWorld();
  world.getAlert();
  world.queryMetrics("checkout-api");
  world.listDeploys();
  world.getErrorLogs("checkout-api");
  assert.equal(world.getAlert().recovery.status, "degraded");
});

test("diagnostic isolate can bisect 4c21 and cannot see process", () => {
  const world = createWorld();
  const result = world.runDiagnostic(`
    const cut = "2026-08-29T14:12:00Z";
    const checkout = metrics.filter((m) => m.service === "checkout-api");
    const before = checkout.filter((m) => m.ts < cut);
    const after = checkout.filter((m) => m.ts >= cut);
    const avg = (rows) => rows.reduce((s, r) => s + r.error_rate, 0) / rows.length;
    console.log(JSON.stringify({
      before: avg(before),
      after: avg(after),
      culprit: deploys.find((d) => d.id === "4c21"),
    }));
  `);
  const parsed = JSON.parse(result.stdout);
  assert.ok(parsed.after > parsed.before * 5);
  assert.equal(parsed.culprit.id, "4c21");
  assert.equal(result.network, false);
  assert.equal(result.filesystem, false);

  assert.throws(
    () => world.runDiagnostic("console.log(process.env)"),
    /process is not defined|process/,
  );
});

test("rollback without a reason is refused", () => {
  const world = createWorld();
  assert.throws(() => world.rollbackDeploy("4c21", "no"), /reason/);
});

test("licensed rollback of 4c21 recovers checkout", () => {
  const world = createWorld();
  const out = world.rollbackDeploy(
    "4c21",
    "Deploy 4c21 doubled checkout timeouts; rolling back to restore payments.",
  );
  assert.equal(out.ok, true);
  assert.equal(out.irreversible, true);
  assert.equal(world.getAlert().recovery.status, "recovering");
  const latest = world
    .queryMetrics("checkout-api")
    .points.filter((p) => p.ts >= "2026-08-29T14:15:00Z");
  assert.ok(latest.every((p) => p.error_rate < 0.01));
});

test("unknown deploy cannot be rolled back", () => {
  const world = createWorld();
  assert.throws(() => world.rollbackDeploy("ffff", "not a real deploy id here"), /unknown deploy/);
});
