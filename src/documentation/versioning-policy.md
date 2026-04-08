# Versioning Policy

Last updated: 2026-04-05

## Goal
- Keep package releases predictable for consumers and make SemVer behavior explicit before any LTS line is promoted.

## Versioning Model
- This package follows Semantic Versioning:
  - `major`: breaking public API, CLI contract, generator output, migration contract, or runtime behavior changes
  - `minor`: new backward-compatible features and additive capabilities
  - `patch`: backward-compatible fixes only
- The shipped CLI banner/version tracks the published package version.
- CLI-only changes are semver-classified by user-facing impact under the same package release policy.

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

## Package Rename And Scope Migration
- Renaming the package or changing its npm scope is always a `major` release.
- Treat package identity changes as ecosystem migrations, not registry-only maintenance.
- A package rename/scope move must include explicit review of:
  - install command changes
  - import path changes in generated code and consumer applications
  - README/docs/example updates
  - lockfile and dependency-name migration guidance
  - npmjs history split versus GitHub Packages owner-scope requirements
- Do not rename the package only to satisfy GitHub Packages publishing. Prefer:
  - keeping npmjs as the canonical registry, or
  - moving the repository under a matching GitHub owner/org, if GitHub Packages is required

## Minor Release Rules
- Minor releases may add:
  - new commands
  - new documented APIs
  - new backward-compatible options
  - new drivers/features that do not alter existing contracts
- CLI-only additive features or new backward-compatible flags are `minor`.
- Minor releases must not silently repurpose existing flags or exports.

## Patch Release Rules
- Patch releases are for:
  - bug fixes
  - security fixes
  - documentation corrections
  - internal refactors that do not change documented behavior
- backward-compatible CLI fixes, including banner/version reporting corrections
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
