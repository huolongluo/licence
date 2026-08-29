import { Suspense } from "react";
import { DeskPageInner } from "./inner";

export default function DeskPage() {
  return (
    <Suspense fallback={<main className="desk-page">Loading desk…</main>}>
      <DeskPageInner />
    </Suspense>
  );
}
