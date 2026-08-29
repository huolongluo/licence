export default function HowPage() {
  return (
    <main className="wrap" style={{ paddingBottom: "3rem" }}>
      <p className="kicker">Judges · File TF-007</p>
      <h1>The harness is doing the work</h1>
      <p className="lede">
        Licence is not a chat box with TrueForge imported for the README. The agent loop, the
        MCP calls, the isolate, the pause, and the session all belong to TrueForge. The desk
        is a window.
      </p>

      <section className="grid three">
        <article className="card">
          <p className="kicker">MCP</p>
          <h3>harbor-pay</h3>
          <p className="muted">
            A Streamable HTTP MCP server on :8791. TrueForge registers it as a remote connector
            and calls get_alert, query_metrics, list_deploys, get_error_logs, run_diagnostic,
            then the gated writes.
          </p>
        </article>
        <article className="card">
          <p className="kicker">Sandbox</p>
          <h3>run_diagnostic</h3>
          <p className="muted">
            Generated JavaScript runs in <code>vm.runInNewContext</code>: no process, no
            network, no fs, 8s timeout, frozen snapshots. Optional Daytona turns on
            TrueForge&apos;s native sandbox when a key is present.
          </p>
        </article>
        <article className="card">
          <p className="kicker">Approval</p>
          <h3>require_approval_for_tools</h3>
          <p className="muted">
            rollback_deploy and post_incident_note are listed on the agent spec. The stream
            emits tool.approval_required. Granting a licence is a new TrueForge turn with
            user.tool_approval.
          </p>
        </article>
        <article className="card">
          <p className="kicker">Subagents</p>
          <h3>dynamic_sub_agents</h3>
          <p className="muted">
            Instructions tell the root agent to fan out metrics, deploys, and logs. Only the
            summaries return. The desk labels those threads so a judge can see them.
          </p>
        </article>
        <article className="card">
          <p className="kicker">Session</p>
          <h3>survives refresh</h3>
          <p className="muted">
            The live path stores the TrueForge session id. Turns chain. A refresh does not
            invent a new incident. That is the harness, not localStorage theatre.
          </p>
        </article>
        <article className="card">
          <p className="kicker">UI</p>
          <h3>Not the bundled chat</h3>
          <p className="muted">
            The Licence desk shows what the agent is doing, what it is waiting on, and what it
            did — and asks before the irreversible step. Judged on the running project, as the
            Savile Row brief requires.
          </p>
        </article>
      </section>
    </main>
  );
}
