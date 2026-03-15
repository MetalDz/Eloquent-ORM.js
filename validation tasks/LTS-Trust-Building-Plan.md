# LTS Trust Building Plan

Last updated: 2026-03-15  
Status: IN PROGRESS

## Goal
- Move the ORM from "production-usable in controlled environments" to "consumer-trusted LTS-grade package" through release discipline, support guarantees, compatibility policy, professional documentation, and a zero-gap coverage program.

## Current Starting Point
- Hardening roadmap status:
  - `ORM-Hardening-Execution-Plan.md`: completed through Phases 1 to 5
- Current trust status:
  - strong engineering readiness
  - controlled-production usable
  - not yet consumer-trusted as an LTS package
- Latest reported full-suite coverage snapshot (`2026-03-15`):
  - Statements   : `93.71% (5751/6137)`
  - Branches     : `87.85% (2980/3392)`
  - Functions    : `93.48% (933/998)`
  - Lines        : `94.09% (5454/5796)`
  - Progress note:
    - the post-kickoff LTS Phase 5 slices materially improved the global baseline, but `100%` remains the release gate

## LTS Target
- Publish a clearly versioned stable line with explicit support and upgrade rules.
- Keep the public API predictable across patch/minor releases.
- Give consumers full-package documentation from installation through operations and support.
- Drive automated coverage to `100%` with no intentionally untracked gaps in shipped runtime and CLI surfaces.

## Scope
- Versioning policy
- support policy
- release cadence
- backward compatibility rules
- public API freeze and export discipline
- consumer-facing package documentation
- coverage plan to `100%`

## Non-Goals
- No fake "LTS" label without a documented support window.
- No silent breaking change in patch/minor releases.
- No documentation split across ad hoc notes without a package-level doc entry point.
- No permanent exemption bucket for low-coverage production code.

## Workstreams

### 1) Versioning Policy
- Define explicit SemVer policy for:
  - major: breaking public API or migration-contract changes
  - minor: additive backward-compatible features
  - patch: fixes only, no silent contract drift
- Lock package versioning rules in:
  - release docs
  - changelog process
  - regression tests for public export surface
- Require every breaking change to ship with:
  - migration note
  - upgrade note
  - deprecation path when feasible

### 2) Support Policy
- Define an explicit support window for:
  - current stable line
  - previous LTS line if maintained
- Document:
  - supported Node.js versions
  - supported databases/drivers
  - support expectations for SQL and Mongo
  - bug-fix vs feature backport policy
- Add a support matrix document and test lock for it.

### 3) Release Cadence
- Define release channels:
  - canary/preview
  - stable
  - LTS
- Define cadence:
  - patch releases: as-needed bug/security fixes
  - minor releases: scheduled feature batches
  - LTS promotion: only after stability criteria are met for a full release window
- Require release evidence:
  - CI green
  - smoke green
  - changelog updated
  - upgrade notes updated

### 4) Backward Compatibility Policy
- Freeze behavioral contracts for:
  - CLI flags
  - generated artifact shapes
  - public package exports
  - model runtime APIs
  - migration/seeding lifecycle contracts
- Add a compatibility runbook:
  - what counts as breaking
  - what can change only in major releases
  - what must stay source-compatible
- Require contract tests for every public compatibility surface that claims stability.

### 5) Public API Freeze
- Define the package public API as:
  - `dist/index.js` exports
  - documented CLI commands
  - documented model/runtime APIs
  - documented generator outputs
- Mark internal-only modules clearly.
- Add a public API freeze checklist:
  - export additions reviewed
  - export removals blocked outside major releases
  - runtime behavior changes reflected in docs/tests

### 6) Consumer Docs (Professional Package Docs)
- Create a consumer-facing doc set that reads like a serious maintained package:
  - installation
  - quick start
  - configuration
  - SQL usage
  - Mongo usage
  - models
  - relations
  - validation
  - serialization
  - factories and seeds
  - migrations
  - CLI reference
  - production usage
  - upgrade guide
  - support policy
  - troubleshooting
- Add a single docs entry page that routes consumers from installation to daily usage to release/support information.
- Add tests that pin required docs sections and entry-point links.

### 7) Coverage Plan to 100% (No Gaps)
- Coverage target:
  - Statements: `100%`
  - Branches: `100%`
  - Functions: `100%`
  - Lines: `100%`
- Rule:
  - no shipped runtime/CLI module is allowed to remain below target without an active tracked slice and matching regression
- Ordered coverage program:
  - Phase A: finish all stale contract/test assumptions after architecture extraction
  - Phase B: close remaining CLI operational hotspots
  - Phase C: close generated artifact and runtime-loading edge paths
  - Phase D: close SQL/Mongo parity leftovers and low-frequency branch behavior
  - Phase E: close final branch-only misses in helper modules and release docs/workflow contracts
- Coverage execution standard:
  - every gap gets:
    - a dedicated `.md`
    - a dedicated `.test`
    - explicit validation command evidence
- Coverage release gate:
  - `npm run test:coverage` must report `100%` across statements, branches, functions, and lines before LTS promotion

## Ordered LTS Plan

### Phase 1: Versioning + Support Foundation
- [x] Write versioning policy doc
- [x] write support policy doc
- [x] add contract tests for both

### Phase 2: Release Discipline
- [x] Write release cadence doc
- [x] add release promotion checklist
- [x] lock changelog/upgrade requirements in tests

### Phase 3: Compatibility + API Freeze
- [x] Write backward compatibility policy
- [x] write public API freeze policy
- [x] add tests for export/CLI/generator/runtime compatibility promises

### Phase 4: Consumer Documentation Suite
- [x] Publish full package docs from installation to usage to support
- [x] add docs entry-point tests and section coverage tests

### Phase 5: Coverage to 100%
- [x] Refresh the real coverage baseline from `npm run test:coverage`
- [x] Record hotspot order and execution rules in `LTS-Phase5-Coverage-To-100-Plan.md`
- [ ] Use tracked slices to eliminate all remaining runtime/CLI/helper gaps
- [ ] make `100%` coverage a release-blocking LTS gate

## Acceptance Criteria
- Consumers can identify:
  - supported versions
  - release cadence
  - backward compatibility rules
  - support expectations
  - full installation-to-usage documentation path
- Public API and CLI behavior are frozen by policy and tests.
- LTS promotion requires:
  - green CI
  - green smoke validation
  - docs complete
  - coverage at `100%`

## Validation Strategy
- Contract test for this plan file.
- Future per-slice `.md` + `.test` artifacts under the LTS track.
- `npm run typecheck`
- `npm run build`
- `npm run test:coverage`
- release/workflow contract tests stay green.
