# Support Policy

Last updated: 2026-03-14

## Goal
- Define what consumers can expect from stable and future LTS releases, including supported environments and backport behavior.

## Current Support Position
- Until the first LTS line is declared, support is provided for the current stable line only.
- Pre-release builds are evaluation channels, not long-term support channels.

## Support Channels
- `stable`:
  - receives active fixes and feature work
  - expected channel for current production adopters
- `LTS`:
  - receives prioritized fixes, security updates, and compatibility maintenance for the declared support window
  - no LTS line is declared yet

## Planned LTS Policy
- Once an LTS line is declared, it should define:
  - a support start date
  - a support end date
  - the Node.js support range
  - the supported driver matrix
  - the backport policy for fixes

## Supported Runtime Surface
- Node.js support must be explicitly documented for every stable/LTS line.
- Supported database families must be explicitly documented:
  - mysql
  - pg
  - sqlite
  - mongo
- SQL and Mongo support expectations must remain documented separately where feature parity differs.

## Supported and Tested Prerequisites

<!-- supported-prerequisites:start -->
The following versions are the current supported and CI-tested prerequisites.

| Component | Supported / tested version |
| --- | --- |
| Node.js | `20.x` |
| TypeScript | `^5.9.3` |
| MySQL | `8.0` |
| PostgreSQL | `16` |
| MongoDB | `7` |
| SQLite | `SQLite 3.x via better-sqlite3 12.2.0` |
| Memcached | `1.6+ server, client package ^2.2.2` |
<!-- supported-prerequisites:end -->

## Backport Policy
- Security fixes:
  - backported to all actively supported lines
- Critical correctness fixes:
  - backported when risk is acceptable
- New features:
  - not backported to maintenance/LTS lines unless explicitly stated

## Out of Scope
- Unsupported Node.js versions
- undocumented internal modules
- unofficial forks or patched custom builds
- behavior outside the documented CLI/runtime/package surface

## Consumer Expectations
- Consumers should be able to identify:
  - which release line to adopt
  - what environments are supported
  - what fix categories are backported
  - when they must upgrade to remain supported
