# Mintlify Validate Wrapper Hardening Plan

Last updated: 2026-03-20
Owner: ORM core maintainers
Status: IN PROGRESS

## Problem

`npm run docs:build` can fail inside Docker because Mintlify CLI validates `docs/mint.json` and `docs.json` through different theme schemas.
The wrapper should validate both config shapes deterministically instead of relying on the CLI's inconsistent behavior.

## Scope

- keep `broken-links` routed through Mintlify CLI
- harden `validate` in `scripts/run-mintlify.cjs`
- validate root `docs.json` against the v2 docs config schema
- upgrade `docs/mint.json` to docs-config form before validating it against the same v2 schema

## Acceptance Criteria

- `validate` succeeds when both config sources are semantically valid
- invalid root `docs.json` fails with a clear `Invalid docs.json` error
- invalid `docs/mint.json` fails with a clear `Invalid mint.json` error
- Docker docs build no longer depends on Mintlify CLI's mixed-schema failure mode
