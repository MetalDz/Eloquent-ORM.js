# NoSQL Full Integration Plan

Last updated: 2026-03-09
Status: IN PROGRESS (Phase 1 Complete)

## Goal
- Fully integrate NoSQL support into ORM runtime and CLI workflows with predictable behavior and production-safe defaults.
- Keep SQL behavior stable while expanding parity for NoSQL use cases.

## Scope
- Target driver family:
  - `mongo`
- Coverage target:
  - runtime path parity where feasible
  - explicit documented differences where parity is not technically valid

## Current State
- Core connection and model paths already include `mongo` branches.
- Some tests validate lifecycle and selected behavior.
- Full parity is not complete yet across CLI, migrations contract, and scenario tooling.

## Non-Goals (This Task)
- No runtime refactor in this planning task.
- No breaking API change in this planning task.
- No immediate migration-system redesign for document databases in this planning task.

## Target End State
- Clear NoSQL contract for:
  - model CRUD
  - relation behavior
  - factory and seeding workflows
  - CLI targeting and environment routing
- Stable production readiness gates for mixed SQL + NoSQL projects.
- Documented compatibility matrix: supported, partial, and intentionally unsupported features.

## Ordered Plan

### Phase 1: Contract Definition
- [x] Define ORM feature matrix for `mongo`:
  - supported
  - partial
  - unsupported
- [x] Freeze naming/targeting rules for NoSQL CLI usage:
  - `--connection`
  - `--test`
  - all-connections semantics

### Phase 1 Output: Mongo Feature Matrix (Contract Baseline)

#### Supported
- Connection lifecycle:
  - `getConnection("mongo")`
  - tracked close through `closeAllConnections()`
- Runtime model CRUD on Mongo paths:
  - `find`, `all`, `create`, `update`, `delete`
- CLI explicit mongo targeting (`--mongo`) for connection-targeted command families.

#### Partial
- `demo:scenario` for mongo is collection-convention based (`users`, `posts`, `comments`, `post_user_pivot`).
- `db:seed*` mongo behavior depends on user model/factory implementation (SQL-first generated models are not auto-converted).
- Mixed-driver all-connections flows are backward-compatible first, not full automatic parity.

#### Unsupported (by contract)
- SQL migration engine semantics on mongo:
  - `make:migration` SQL generation
  - SQL migration tracker/history table semantics
- SQL adapter API usage on mongo (`getAdapter("mongo")` / SQL query paths).

### Phase 1 Output: CLI Targeting Rules (Frozen)
- Explicit driver targeting:
  - `--mongo` maps to `mongo` in runtime mode.
  - `--mongo --test` maps to `mongo_test` when configured.
- `--all-connections` semantics:
  - remains SQL set by default (`mysql`, `pg`, `sqlite`) for deterministic backward compatibility.
  - mongo is opt-in via explicit `--mongo`.
- SQL-only command behavior with mongo target:
  - command must skip safely with explicit warning, not crash or silently misapply SQL semantics.

### Phase 2: Runtime Parity Baseline
- [ ] Validate CRUD behavior parity expectations for NoSQL models.
- [ ] Validate relation mixin behavior and edge-case handling in NoSQL paths.
- [ ] Define transaction/session behavior policy for NoSQL operations.

### Phase 3: CLI Integration Parity
- [ ] Add NoSQL-aware coverage for command families:
  - `make:*`
  - `db:seed*`
  - `demo:scenario`
  - status/precheck flows
- [ ] Ensure unsupported SQL-only commands fail clearly for NoSQL with actionable messages.

### Phase 4: Validation and Quality Gates
- [ ] Add focused NoSQL integration tests for app + test environments.
- [ ] Add release gates to ensure NoSQL regressions fail CI.
- [ ] Confirm tarball smoke path does not regress NoSQL runtime wiring.

### Phase 5: Documentation and Release Closure
- [ ] Publish NoSQL usage guide and limitation matrix.
- [ ] Add upgrade notes for projects enabling NoSQL after SQL-first setup.
- [ ] Close this plan only after CI and pack-smoke validation are green.

## Acceptance Criteria
- NoSQL driver is treated as a first-class documented runtime target.
- CLI behavior for NoSQL is deterministic and tested.
- Unsupported SQL-only operations on NoSQL produce explicit, safe errors.
- CI includes NoSQL-focused regression coverage.
- Documentation reflects actual runtime behavior and limits.

## Risks
- Feature parity assumptions can hide meaningful SQL/NoSQL semantic differences.
- Over-generalized abstractions may reduce correctness for either driver family.
- Mixed-connection projects can introduce ambiguous defaults if routing is unclear.

## Validation Strategy
- Use focused logic/integration tests first, then broader CLI scenario runs.
- Keep SQL regressions blocked while enabling NoSQL parity work.
- Track deltas in `validation tasks/Progress snapshot.md` during implementation phases.

## Notes
- Phase 1 is complete and locked.
- Runtime implementation proceeds phase-by-phase after explicit authorization.
