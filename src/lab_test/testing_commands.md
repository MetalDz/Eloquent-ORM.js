# Testing Commands

## Core validation

```bash
npm run typecheck
npm run typecheck:nodenext
npm test
npm run test:coverage
npm run coverage:misses
```

## Focused regression and smoke suites

```bash
npm run test:critical
npm run test:mysql-smoke
npm run test:coverage:docker
npm run test:pack-smoke
npm run test:pack-smoke:docker
```

Docker rule:
- Docker test commands rebuild from a fully fresh image with `--no-cache` before running.

## Documentation validation

```bash
npm run docs:build
npm run docs:validate
npm run docs:lint
```

## Build and release verification

```bash
npm run build
npm run release
```

## Metadata and docs sync helpers

```bash
npm run docs:sync-package-metadata
npm run docs:sync-supported
npm run docs:sync-config
```

## NodeNext migration audit

```bash
npm run audit:nodenext-blockers
```

## Local runtime helpers

```bash
npm run dev
npm run cli
```
