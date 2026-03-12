# ORM Hardening Execution Plan

Last updated: 2026-03-12  
Status: PLANNED

## Goal
- Reduce the main long-term maintenance risks in the ORM without destabilizing the current runtime.
- Keep SQL and `mongo` as first-class drivers across runtime, generators, CLI commands, seeds, scenarios, and smoke flows.
- Break the roadmap into small tracked slices, each with a paired `.md` plan file and `.test` contract file.

## Baseline
- Source of truth: `coverage/coverage-summary.json`
- Current global coverage snapshot at plan creation:
  - Statements: `89.67%` (`4420/4929`)
  - Branches: `87.00%` (`2371/2725`)
  - Functions: `89.29%` (`667/747`)
  - Lines: `89.71%` (`4163/4640`)
- Current structural hotspots:
  - `src/cli/eloquent.ts` (`1042` lines)
  - `src/core/model/CoreModel.ts` (`783` lines)
  - `src/core/model/BaseModel.ts` (`355` lines)
  - `src/cli/utils/ArtifactStorage.ts` (`263` lines)
  - `src/core/model/SafeFinder.ts` (`301` lines)
  - `src/cli/utils/typescript/tsRuntime.ts` (`149` lines)
- Current low-coverage operational hotspots:
  - `src/cli/commands/demoScenario.ts`: branches `25%`
  - `src/cli/utils/migrations/MongoMigrationTracker.ts`: branches `0%`
  - `src/cli/utils/ModelIntrospector.ts`: branches `0%`
  - `src/cli/commands/makeController.ts`: branches `0%`
  - `src/cli/commands/makeService.ts`: branches `0%`
  - `src/cli/utils/fileWriter.ts`: branches `30%`

## Problem Statement
- Core runtime behavior is concentrated in a few large files, which raises regression risk and slows feature work.
- SQL and `mongo` parity now covers much more of the stack, but parity fixes still tend to span runtime, generators, artifact routing, and CLI commands together.
- Generated TypeScript artifacts and dynamic loading paths remain a reliability hotspot in CI, pack smoke, and temp-file execution.
- Read-path ergonomics and instance persistence have improved, but they now need explicit hardening so the public API does not drift again.

## Constraints
- No fake coverage or dead-branch padding.
- No weakening of SQL identifier/parameter safety or schema validation guarantees.
- No hidden driver-specific behavior in CLI commands when the user has explicitly selected `--mongo`, `--pg`, `--mysql`, or `--sqlite`.
- Every implementation slice must add a paired `.md` and `.test` file.
- Prefer additive refactors with contract coverage over broad rewrites.

## Ordered Phases

### Phase 1: Architecture and Public Boundaries
- Plan file:
  - `validation tasks/ORM-Hardening-Phase1-Architecture-And-Boundaries-Plan.md`
- Contract test:
  - `src/lab_test/orm.hardening.phase1.contract.logic.test.ts`
- Focus:
  - shrink responsibility overlap between `CoreModel`, `BaseModel`, mixins, and public exports
  - freeze public model/export boundaries before deeper refactors

### Phase 2: Driver Parity and Artifact Routing
- Plan file:
  - `validation tasks/ORM-Hardening-Phase2-Driver-Parity-And-Artifact-Routing-Plan.md`
- Contract test:
  - `src/lab_test/orm.hardening.phase2.contract.logic.test.ts`
- Focus:
  - SQL/`mongo` parity in artifact discovery, routing, migration tracking, and compatibility checks

### Phase 3: Generator and Runtime Loading Parity
- Plan file:
  - `validation tasks/ORM-Hardening-Phase3-Generator-And-Runtime-Loading-Plan.md`
- Contract test:
  - `src/lab_test/orm.hardening.phase3.contract.logic.test.ts`
- Focus:
  - template parity, inline generator parity, temp TypeScript runtime loading, and smoke reproducibility

### Phase 4: Read Path and Instance Persistence Hardening
- Plan file:
  - `validation tasks/ORM-Hardening-Phase4-Read-Path-And-Persistence-Plan.md`
- Contract test:
  - `src/lab_test/orm.hardening.phase4.contract.logic.test.ts`
- Focus:
  - safe finder maturity, eager loading parity, serialization defaults, and `fill()` / `save()` / `patch()` stability

### Phase 5: CLI Decomposition and Operational Hardening
- Plan file:
  - `validation tasks/ORM-Hardening-Phase5-CLI-Decomposition-And-Operations-Plan.md`
- Contract test:
  - `src/lab_test/orm.hardening.phase5.contract.logic.test.ts`
- Focus:
  - reduce `eloquent.ts` command-routing complexity, harden low-coverage command modules, and keep production safety explicit

## Cross-Phase Rules
- Public package exports must match the actual default runtime stack.
- Template-based generators and inline generators must stay behaviorally aligned.
- App/test/prod safety rules must remain explicit and testable.
- CLI-targeted driver selection must never silently downgrade to a different storage kind.
- Phase work should improve both runtime clarity and coverage in the hotspot files it touches.

## Quality Gates
- Per phase:
  - `npm run typecheck`
  - focused Jest contract/runtime suites for the touched slice
- When a phase touches CLI runtime or packaging:
  - `npm run build`
  - `npm run test:pack-smoke`
- When a phase directly targets coverage hotspots:
  - `npm run test:coverage`

## Done Criteria
- [ ] Public model/runtime boundaries are documented, enforced, and tested.
- [ ] SQL and `mongo` artifact routing behaves deterministically across CLI, generators, seeds, and scenarios.
- [ ] Generated TypeScript artifacts load reliably in local, CI, and pack-smoke flows.
- [ ] Safe finder, eager loading, serialization, and instance persistence are stable across SQL and `mongo`.
- [ ] `eloquent.ts` and other command hotspots have a smaller, clearer operational surface with dedicated tests.
- [ ] The master plan plus all phase `.md` and `.test` files are present and active.
