# Field report: Licence, or the agent that waited

The Agent Harness Hackathon asks for an agent that can reach tools, run code somewhere safe, and stop before it does damage. Most demos will show the first two. The interesting shot is the third.

Licence is a desk for that pause.

Harbor Pay is fictional. The pager is not a metaphor: checkout error rate went from 0.4% to 8.1% after deploy `4c21`. The agent fans out through a real MCP server, writes a diagnostic, and runs it in an isolate with no network and no filesystem. Then it asks to roll the deploy back. TrueForge holds. The desk shows a stamp that says HOLD. A human grants or denies a licence. Deny means production does not move.

I used Cursor to build the desk and the connector. The product decision is the gate: investigate is free, act is signed. Qodo reviews the pull requests. The harness is TrueForge, not a wrapper around a model call.

If you clone the repo, you do not need an API key to see the loop. `/?play=1` replays harness-shaped events. The live path is the same UI against `npx @truefoundry/trueforge`.
