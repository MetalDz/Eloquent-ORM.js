import fs from "fs";
import path from "path";

describe("Transaction-scoped ORM helpers plan contract", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/Transaction-Scoped-ORM-Helpers-Plan.md",
  );

  test("plan doc exists and freezes the intended ORM-native helper surface", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# Transaction-Scoped ORM Helpers Plan",
      "Status: COMPLETE",
      "## Target API",
      "`Model.useTransaction(tx)`",
      "`instance.useTransaction(tx)`",
      "`.forUpdate()`",
      "`.forShare()`",
      "`.skipLocked()`",
      "`tx.execute(...)`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan locks the problem statement and keeps raw transaction fallback in scope", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "## Problem Summary",
      "application code still has to use raw SQL for common transaction-bound model operations.",
      "High-concurrency flows like scheduling slot claims, pharmacy stock reservation, and financial allocation need:",
      "## Non-Goals",
      "No removal of raw `tx.execute(...)` for advanced SQL workflows.",
      "No full fluent query-builder redesign in this slice.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan defines SQL and Mongo examples plus per-driver lock rules", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "## Example Contract",
      'await transaction("pg", async (tx) => {',
      "Appointment.useTransaction(tx)",
      "CreditAccount.useTransaction(tx)",
      'await transaction("mongo", async (tx) => {',
      "Wallet.useTransaction(tx)",
      "## Driver Contract",
      "PostgreSQL:",
      "MySQL:",
      "SQLite:",
      "MongoDB:",
      "no `.forUpdate()`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan defines phased rollout, acceptance criteria, and implementation status", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "### Phase 1: Contract Freeze",
      "### Phase 2: Transaction Scope Propagation",
      "### Phase 3: Finder Locking Surface",
      "### Phase 4: Persistence Parity",
      "### Phase 5: Driver And Error Semantics",
      "### Phase 6: Coverage And Docs",
      "## Acceptance Criteria",
      "Models can be bound to an active transaction with `useTransaction(tx)`.",
      "Raw transaction methods remain available for advanced workflows.",
      "## Notes",
      "All planned phases in this document are now implemented.",
      "rebinding to the same transaction is a no-op",
      "rebinding to a different transaction on the same connection fails fast",
      "Coverage and runtime docs are in place.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });
});
