# Repo-Wide Mojibake Remediation Plan

Last updated: 2026-03-15  
Status: IN PROGRESS

## Goal
- Remove mojibake and corrupted text markers from the ORM codebase and replace them with stable, intentional text.
- Make shipped CLI/runtime output, source comments, templates, and generated fixtures readable on Windows, Linux, CI, and packaged installs.

## Rule of Replacement
- Do not try to reconstruct lost emoji from corrupted bytes.
- Prefer plain ASCII for runtime and CLI output unless there is a clear product reason to keep Unicode.
- Replace mojibake with the semantic equivalent the code is trying to express.
- Keep replacement strings centralized when the same marker appears in multiple files.

## Canonical Replacement Table
- `â‡ ` -> `<-`
- `â‡¢` -> `->`
- `â‡¢â‡¢` -> `->>`
- `â‡؟` -> `<->`
- `â‰ˆ` -> `~>`
- `â†’` -> `->`
- `â€”` or `—` -> `-`
- `âœ…` or `✅` -> `OK:` or plain success text
- `â‌Œ` or `❌` -> `ERROR:`
- `âڑ ï¸ڈ` or `⚠️` -> `WARN:`
- `ℹ️` -> `INFO:`
- corrupted banner/status glyphs -> plain English text

## Scope

### 1. Shipped CLI Runtime Surface
- `src/cli/commands/*`
- `src/cli/utils/*`
- `scripts/*` when they validate packaged/runtime behavior

### 2. Core ORM Runtime Surface
- `src/core/schema/*`
- `src/core/orm/*`
- `src/core/cache/*`
- `src/core/connection/*`
- `src/core/security/*`

### 3. Generator and Template Surface
- `src/cli/templates/*`
- generator command comments and emitted default strings in:
  - `makeModel.ts`
  - `makeMigration.ts`
  - `makeFactory.ts`
  - `makeScenario.ts`
  - related scaffold helpers

### 4. Repo-Owned Example and Generated Fixtures
- committed example models under `src/app/*` when they are package-facing examples
- committed generated migrations/templates that are kept as living fixtures in the repo

## Non-Goals
- Historical log files under `src/test/logs/*` are not hand-edited as primary source of truth.
- User-local `.env` values are out of scope.
- Third-party dependency output is out of scope.

## Phase Order

### Phase 1: CLI Display and Factory Runtime
- Normalize shipped factory display/runtime strings.
- Normalize CLI-facing success/warn/error/status prefixes.
- Completed first slice:
  - `Factory-Display-ASCII-Normalization-Plan.md`

### Phase 2: Migration and Schema Hotspots
- Normalize mojibake in:
  - `src/cli/commands/makeMigration.ts`
  - `src/core/schema/SchemaBuilder.ts`
  - related migration-generated comment headers
- Replace corrupted runtime logs with stable ASCII `INFO:` / `WARN:` / `ERROR:` text.
- Completed first slice:
  - `Migration-Schema-ASCII-Normalization-Plan.md`

### Phase 3: Core Mixins and ORM Runtime
- Normalize mojibake in:
  - `src/core/orm/mixins/MorphableMixin.ts`
  - `src/core/orm/mixins/PivotHelperMixin.ts`
  - `src/core/orm/mixins/ScopeMixin.ts`
  - `src/core/orm/Relation.ts`
- related ORM mixin comments and thrown message prefixes
- Completed first slice:
  - `LTS-Phase5-MorphableMixin-Coverage-And-ASCII-Plan.md`

### Phase 4: TypeScript Runtime, Scaffolds, and Security/Cache/Connection Helpers
- Normalize mojibake in:
  - `src/cli/utils/typescript/*`
  - `src/cli/commands/makeModel.ts`
  - `src/cli/commands/makeFactory.ts`
  - `src/core/security/*`
  - `src/core/cache/*`
  - `src/core/connection/*`
- Completed first slice:
  - `LTS-Phase5-DatabaseConnection-Coverage-And-ASCII-Plan.md`

### Phase 5: Example/Fixture Sweep
- Normalize committed example models and generated fixture files that are part of the repo contract.
- Regenerate or replace corrupted generated header comments with stable ASCII text.

## Execution Standard
- Every remediation slice must ship with:
  - a dedicated `.md`
  - a dedicated `.test`
  - source-level verification for the targeted files
- New or edited runtime strings must default to ASCII.
- Shared output markers should move into helper modules instead of being duplicated.

## Acceptance Criteria
- No mojibake markers remain in shipped ORM runtime and CLI source.
- No corrupted relation arrows remain in shipped output.
- Package-facing templates and generated defaults are ASCII-stable.
- Future regressions are blocked by source-level tests.

## Validation Strategy
- Contract test for this master remediation plan.
- Per-slice `.md` + `.test` artifacts for each hotspot group.
- `npm run typecheck`
- targeted Jest runs for each remediation slice.
