import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <section className="wrap" style={{ paddingTop: "2.2rem" }}>
        <p className="kicker">File TF-007 · Harbor Pay · TrueForge</p>
        <h1>The model can look. A human still signs the rollback.</h1>
        <p className="lede">
          Checkout is on fire. Licence is a TrueForge agent with a pager, an isolate, and a
          hard stop. It fans out subagents, bisects the last four deploys in a sandbox, and
          holds for your licence before it touches production.
        </p>
        <div className="row">
          <Link href="/desk?play=1" className="btn gold">
            Run Harbor Pay incident
          </Link>
          <Link href="/how" className="btn ghost">
            See the harness, not a wrapper
          </Link>
        </div>
      </section>

      <section className="wrap grid three">
        <article className="card">
          <p className="kicker">01 Reach</p>
          <h3>MCP, not a mock chat</h3>
          <p className="muted">
            harbor-pay is a real connector: alert, metrics, deploys, logs. TrueForge calls it.
            The desk only renders what the harness is doing.
          </p>
        </article>
        <article className="card">
          <p className="kicker">02 Isolate</p>
          <h3>Code that cannot leak</h3>
          <p className="muted">
            The diagnostic runs in a frozen isolate: no network, no filesystem, eight seconds.
            Secrets stay in the harness. Wrong code cannot take down Harbor Pay.
          </p>
        </article>
        <article className="card">
          <p className="kicker">03 Licence</p>
          <h3>Stop before irreversible</h3>
          <p className="muted">
            rollback_deploy is gated. TrueForge pauses. The desk shows the stamp. You grant or
            deny. Deny means nothing happens — and the session still remembers.
          </p>
        </article>
      </section>
    </>
  );
}
