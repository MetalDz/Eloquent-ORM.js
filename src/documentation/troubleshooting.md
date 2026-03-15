# Troubleshooting Guide

Last updated: 2026-03-14

## Build and TypeScript

### `npm run build` fails on CLI helper types
- Verify extracted CLI helper types remain compatible with `process.env`.
- Re-run:

```bash
npm run typecheck
npm run build
```

### Generated files import the wrong model/service/controller name
- Regenerate the artifact with the current CLI.
- If the name already includes `Controller` or `Service`, current scaffold generation should normalize it and avoid duplicated suffixes.

## Runtime and Connection Issues

### SQL connection fails at startup
- Check `.env` values for:
  - `DB_CONNECTION`
  - host/user/password/db values for the targeted driver
- Re-run the relevant migration/status command against the explicit target.

### Mongo auth or DNS fails
- Verify:
  - `MONGO_URI`
  - `MONGO_DB_NAME`
  - `MONGO_TEST_URI`
  - `MONGO_TEST_DB_NAME`
- For SRV/DNS issues, use the Mongo DNS guidance already supported by the runtime and re-check your environment.

## CLI and Packaging

### `npm run test:pack-smoke` fails
- Rebuild first:

```bash
npm run build
npm run test:pack-smoke
```

- If you want the live Mongo tarball runtime path too, enable:

```bash
ELOQUENT_PACK_SMOKE_ENABLE_MONGO_RUNTIME=1
```

### `factory:status --mongo` shows skip warnings
- This is expected when SQL-only factories exist in the same project.
- The Mongo-targeted visible registry should exclude incompatible SQL factories while warnings explain what was skipped.

## Migration and Seeding

### Rollback fails or leaves partial state
- Follow the operator steps in:
  - [Migration Rollback Recovery Runbook](./migration-rollback-recovery-runbook.md)

### Mongo seeding behaves differently from SQL
- Check the documented Mongo-specific workflow and compatibility matrix:
  - [NoSQL (Mongo) Usage Guide](./nosql-usage-guide.md)

## Need More Context
- Package entry point:
  - [EloquentJS Package Docs](./package-docs-index.md)
- Runtime workflows:
  - [Usage Guides](./usage-guides.md)
- Public surface:
  - [API Reference](./api-reference.md)
- Support expectations:
  - [Support Policy](./support-policy.md)
