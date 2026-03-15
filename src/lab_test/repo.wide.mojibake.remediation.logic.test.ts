import fs from "fs";
import path from "path";

describe("repo-wide mojibake remediation plan", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/Repo-Wide-Mojibake-Remediation-Plan.md",
  );

  test("plan defines the remediation goal, replacement rules, and scope", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# Repo-Wide Mojibake Remediation Plan",
      "Status: IN PROGRESS",
      "Do not try to reconstruct lost emoji from corrupted bytes.",
      "Prefer plain ASCII for runtime and CLI output",
      "`â‡ ` -> `<-`",
      "`â‡¢` -> `->`",
      "`â‡¢â‡¢` -> `->>`",
      "`â‡؟` -> `<->`",
      "`â‰ˆ` -> `~>`",
      "`â†’` -> `->`",
      "`âœ…` or `✅` -> `OK:` or plain success text",
      "`â‌Œ` or `❌` -> `ERROR:`",
      "`âڑ ï¸ڈ` or `⚠️` -> `WARN:`",
      "## Scope",
      "### 1. Shipped CLI Runtime Surface",
      "`src/cli/commands/*`",
      "`src/cli/utils/*`",
      "### 2. Core ORM Runtime Surface",
      "`src/core/schema/*`",
      "`src/core/orm/*`",
      "`src/core/cache/*`",
      "`src/core/connection/*`",
      "`src/core/security/*`",
      "### 3. Generator and Template Surface",
      "`src/cli/templates/*`",
      "### 4. Repo-Owned Example and Generated Fixtures",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan defines ordered remediation phases and execution rules", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "### Phase 1: CLI Display and Factory Runtime",
      "Factory-Display-ASCII-Normalization-Plan.md",
      "### Phase 2: Migration and Schema Hotspots",
      "`src/cli/commands/makeMigration.ts`",
      "`src/core/schema/SchemaBuilder.ts`",
      "Migration-Schema-ASCII-Normalization-Plan.md",
      "### Phase 3: Core Mixins and ORM Runtime",
      "`src/core/orm/mixins/PivotHelperMixin.ts`",
      "`src/core/orm/mixins/ScopeMixin.ts`",
      "`src/core/orm/Relation.ts`",
      "### Phase 4: TypeScript Runtime, Scaffolds, and Security/Cache/Connection Helpers",
      "`src/cli/utils/typescript/*`",
      "`src/cli/commands/makeModel.ts`",
      "`src/cli/commands/makeFactory.ts`",
      "`src/core/security/*`",
      "`src/core/cache/*`",
      "`src/core/connection/*`",
      "LTS-Phase5-DatabaseConnection-Coverage-And-ASCII-Plan.md",
      "### Phase 5: Example/Fixture Sweep",
      "Every remediation slice must ship with:",
      "a dedicated `.md`",
      "a dedicated `.test`",
      "New or edited runtime strings must default to ASCII.",
      "Shared output markers should move into helper modules instead of being duplicated.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan sets clear non-goals and acceptance criteria", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "## Non-Goals",
      "Historical log files under `src/test/logs/*` are not hand-edited as primary source of truth.",
      "Third-party dependency output is out of scope.",
      "## Acceptance Criteria",
      "No mojibake markers remain in shipped ORM runtime and CLI source.",
      "No corrupted relation arrows remain in shipped output.",
      "Package-facing templates and generated defaults are ASCII-stable.",
      "Future regressions are blocked by source-level tests.",
      "## Validation Strategy",
      "Contract test for this master remediation plan.",
      "Per-slice `.md` + `.test` artifacts for each hotspot group.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });
});
