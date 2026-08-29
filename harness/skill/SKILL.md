---
name: harbor-incident
description: Investigate a Harbor Pay checkout SEV-1, bisect deploys in an isolate, and stop before rollback.
---

# Harbor Pay incident playbook

Work the pager like a licensed operator, not a chatbot.

1. Read `get_alert`. Quote the alert id in your first status line.
2. Fan out three subagents: metrics, deploys, logs. Wait for all three.
3. In `run_diagnostic`, compare checkout error rate before and after each deploy timestamp. Print the implicated deploy id.
4. Call `rollback_deploy` only for that id, with a reason a human can defend. Expect the harness to pause.
5. After approval, post a closeout note. After denial, do nothing irreversible.
