# Licence

**The model can look. A human still signs the rollback.**

[The Agent Harness Hackathon](https://www.wemakedevs.org/hackathons/trueforge) · TrueForge · public repo (this one)

**Replay (no API key):** `http://127.0.0.1:3057/desk?play=1`

Licence is an on-call agent for a fictional payments company, Harbor Pay. Checkout timeouts doubled. The agent reaches real tools over MCP, bisects the last four deploys in an isolate, and **stops**. Rolling back deploy `4c21` is irreversible. TrueForge holds for a human licence. The desk shows what the harness is doing, what it is waiting on, and what it did.

This is not a chat wrapper around a model call. TrueForge runs the loop.

## Why this can win

Judges score impact, originality, technical excellence, sponsor tools, control and safety, and the demo — equally.

| Criterion | What we built |
| --- | --- |
| Impact | A SEV-1 checkout outage is a job people already hand to on-call. The agent finishes it. |
| Originality | The product is the **licence**, not another incident chatbot. Investigate is free. Act is signed. |
| Technical | Custom MCP, isolate, gated writes, subagents, persistent TrueForge session, custom desk UI. |
| Sponsor tools | TrueForge does MCP, isolate, approval, subagents, session. Qodo reviews every substantive PR. |
| Control and safety | `rollback_deploy` cannot run until a human grants the licence. Deny means nothing happens. |
| Presentation | Three-minute Harbor Pay incident. The HOLD stamp is the shot. |

Architecture: [`docs/architecture.svg`](docs/architecture.svg)

## What TrueForge is doing

1. **MCP** — `harbor-pay` is registered as a remote connector. Read tools: `get_alert`, `query_metrics`, `list_deploys`, `get_error_logs`. Isolate: `run_diagnostic`. Gated writes: `rollback_deploy`, `post_incident_note`.
2. **Sandbox** — `run_diagnostic` executes generated JavaScript in `vm.runInNewContext`: no `process`, no network, no filesystem, 8s timeout, frozen snapshots. If `DAYTONA_API_KEY` is set, bootstrap also enables TrueForge's native sandbox.
3. **Approval** — the agent spec sets `require_approval_for_tools: ["rollback_deploy", "post_incident_note"]`. The stream emits `tool.approval_required`. Granting a licence is a new turn with `user.tool_approval`.
4. **Subagents** — `dynamic_sub_agents` is on. Instructions require a fan-out across metrics, deploys, and logs. Only summaries return to the root thread.
5. **Session** — the live desk stores the TrueForge session id. Refresh does not mint a new incident.

The Licence desk is a window onto that loop. It is not the bundled TrueForge chat.

## Quick start

Node 22+.

```bash
cd licence
cp .env.example .env   # optional for replay
npm install
npm --prefix app install
npm test
```

### Replay, no keys

```bash
node mcp/server.mjs &
cd app && npm run build && npm start
```

Open [http://127.0.0.1:3057/desk?play=1](http://127.0.0.1:3057/desk?play=1). Grant or deny the licence. Deny is the control shot: nothing irreversible runs.

(`next dev` also works; on a machine with many other `node_modules` trees, production `next start` is the quieter path.)

### Live TrueForge

You need a model key (`GEMINI_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY`) in `.env`.

```bash
npm run dev
```

This starts:

- Harbor Pay MCP at `http://127.0.0.1:8791/mcp`
- TrueForge at `http://127.0.0.1:8790` (`npx @truefoundry/trueforge`)
- bootstrap: model provider, MCP connector, agent `licence-harbor-pay`
- Licence desk at `http://127.0.0.1:3057`

On the desk, click **Live TrueForge**. The same UI now streams harness events.

## Demo script

See [`VIDEO_SCRIPT.md`](VIDEO_SCRIPT.md). Three minutes:

1. Alert is real: checkout 0.4% → 8.1%.
2. MCP, three subagents, isolate bisect. Culprit is `4c21`.
3. HOLD. Grant the licence. Rollback. Recovering.
4. Optional: run again and **Deny**. Production does not move.

## AI disclosure

Cursor (Grok 4.6) was used to implement the desk, MCP server, and TrueForge bootstrap. Harbor Pay fixtures, isolate rules, approval gates, and the product decision (licence-before-rollback) were specified and reviewed by the participant. The agent is not an unreviewed dump of generated code.

## Qodo Code Review Evidence

Required of every submission. After the public repo exists:

1. Install Qodo on this repository (Integrations → SaaS → GitHub).
2. Open a pull request with meaningful hackathon code. If Qodo does not start, comment `/agentic_review`.
3. Fix every valid High finding, or dismiss it in the Qodo thread with a reason. Push, then `/agentic_review` again.
4. Replace this paragraph with:
   - a link to that merged PR
   - one or two sentences on what Qodo surfaced and what we changed or dismissed
   - the PR history showing review → decision → follow-up review

Direct pushes to `main` do not count.

## Submit checklist

- [ ] Public GitHub repository
- [ ] This README (setup + TrueForge write-up)
- [ ] Demo video ~3 minutes
- [ ] Qodo evidence section filled with a public PR link
- [ ] AI disclosure above
- [ ] Optional: [field report](docs/field-report.md) for the blog prize

Deadline: 30 August 2026, 20:00 London.

## License

Apache-2.0.
