"use client";

import { Desk } from "@/components/Desk";

export function DeskPageInner() {
  return (
    <main className="desk-page">
      <p className="kicker">On-call desk</p>
      <h1 style={{ fontSize: "2.4rem", maxWidth: "18ch" }}>Harbor Pay · PAGER-4419</h1>
      <Desk />
    </main>
  );
}
