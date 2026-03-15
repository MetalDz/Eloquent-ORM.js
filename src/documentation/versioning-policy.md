# Versioning Policy

Last updated: 2026-03-14

## Goal
- Keep package releases predictable for consumers and make SemVer behavior explicit before any LTS line is promoted.

## Versioning Model
- This package follows Semantic Versioning:
  - `major`: breaking public API, CLI contract, generator output, migration contract, or runtime behavior changes
  - `minor`: new backward-compatible features and additive capabilities
  - `patch`: backward-compatible fixes only

## Breaking Change Rules
- A change must be released as a new major version when it breaks:
  - documented package exports
  - documented CLI flags or command behavior
  - documented generator output contracts
  - model runtime APIs
  - migration or seeding lifecycle expectations
- Breaking changes must ship with:
  - a changelog entry
  - an upgrade note
  - a migration path when feasible

## Minor Release Rules
- Minor releases may add:
  - new commands
  - new documented APIs
  - new backward-compatible options
  - new drivers/features that do not alter existing contracts
- Minor releases must not silently repurpose existing flags or exports.

## Patch Release Rules
- Patch releases are for:
  - bug fixes
  - security fixes
  - documentation corrections
  - internal refactors that do not change documented behavior
- Patch releases must not contain silent contract drift.

## Deprecation Policy
- Deprecations should be announced before removal when practical.
- A deprecation must include:
  - the affected API/flag
  - the replacement
  - the planned removal version or release line

## Pre-Release Channels
- Pre-release identifiers may be used for:
  - `alpha`
  - `beta`
  - `rc`
- Pre-release builds are not covered by LTS guarantees.

## Release Evidence
- A release is eligible only when:
  - CI is green
  - smoke validation is green
  - changelog is updated
  - upgrade documentation is updated for any breaking or notable change
