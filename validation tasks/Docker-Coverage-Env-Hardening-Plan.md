# Docker Coverage Env Hardening Plan

Status: COMPLETED

## Goal

Keep the Docker coverage environment aligned with test expectations so coverage runs are valid and reproducible.

## Problems fixed

- `coverage-debug` was forcing `APP_ENV=production`, which triggered production CLI guards during test coverage.
- The build context was copying host `node_modules`, which can inject non-Linux native binaries like `better-sqlite3.node` and break the container with `invalid ELF header`.
- The build context was excluding repo metadata files that contract tests legitimately read (`.github/workflows/ci.yml`, `.npmignore`).
- Some plan-contract tests were reading `coverage/coverage-summary.json` during the same Jest coverage run, which is not a stable input in a fresh container.

## Changes

- Set the coverage Docker image to test-safe environment defaults.
- Set the compose coverage service to explicit non-production runtime values.
- Add `.dockerignore` to exclude host `node_modules`, coverage artifacts, and other non-runtime build noise.
- Keep repo metadata files required by contract tests in the Docker build context.
- Add a deterministic fallback coverage summary fixture for plan-contract tests when live coverage artifacts do not exist yet.
- Add a guard test for the Docker coverage environment contract.

## Validation

- `src/lab_test/docker.coverage.env.logic.test.ts`
- Docker coverage run should no longer enter production guard mode from container defaults.
- Docker image build should no longer copy host native modules into the Linux container.
- Docker full coverage runs should keep CI/package contract tests runnable inside a fresh image.
