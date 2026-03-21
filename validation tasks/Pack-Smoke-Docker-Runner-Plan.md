# Pack Smoke Docker Runner Plan

Last updated: 2026-03-21
Owner: ORM core maintainers
Status: IN PROGRESS

## Goal

Make `test:pack-smoke` runnable in a stable containerized environment so the host Windows `spawnSync node.exe/cmd.exe EPERM` issue does not block release validation.

## Deliverables

- Add `Dockerfile.pack-smoke` with the same dependency install pattern as the coverage container.
- Add a dedicated `pack-smoke` service to `docker-compose.coverage-debug.yml`.
- Add a repo script for the container runner:
  - `npm run test:pack-smoke:docker`
- Keep the container environment aligned with the coverage/debug stack:
  - mysql
  - postgres
  - mongo
  - memcached

## Validation

- A focused test must verify:
  - `Dockerfile.pack-smoke` exists and runs `npm run test:pack-smoke`
  - compose defines a `pack-smoke` service
  - package scripts expose `test:pack-smoke:docker`

## Notes

- This task does not replace the native `test:pack-smoke` script.
- It adds a stable runner for CI/local Docker workflows.
