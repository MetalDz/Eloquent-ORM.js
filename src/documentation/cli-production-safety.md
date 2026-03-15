# CLI Production Safety Guide

Last updated: 2026-03-06

## Goal
- Prevent accidental destructive operations in production.
- Make operator intent explicit for high-risk commands.

## Production Guard Contract
For destructive commands in production, all of the following are required:
- `ELOQUENT_ALLOW_PROD_DESTRUCTIVE=true`
- `--force`
- `--yes`

Production detection:
- `APP_ENV=production` or `NODE_ENV=production`

## Destructive Commands (Guarded)
- `make:model`
- `make:registry`
- `make:controller`
- `make:service`
- `make:seed`
- `make:factory`
- `make:scenario`
- `make:migration`
- `migrate:fresh`
- `migrate:reset`
- `db:seed:fresh`

## Safe Commands (Non-Destructive)
- `migrate:status`
- `db:seed` (except precheck requirements for `--all-connections`)
- `db:seed:precheck`
- `factory:status`
- `cache:stats`
- `list`

## All-Connections Seed Precheck
When running:
- `db:seed --all-connections`

The CLI runs a bootstrap precheck to ensure clean migration state.
If precheck fails:
- run migrations first (`migrate:run` or `migrate:run --test`)
- retry `db:seed`

Manual precheck command:
- `eloquent db:seed:precheck --all-connections`

## Example: Controlled Production Migration Reset
```bash
export APP_ENV=production
export ELOQUENT_ALLOW_PROD_DESTRUCTIVE=true
eloquent migrate:reset --all-connections --all-migrations --force --yes
```

## Recommended Operational Practice
1. Always run `migrate:status` before destructive operations.
2. Keep migration/seed operations in CI/CD job steps, not ad-hoc shells.
3. Use least-privilege DB identities (`runtime` vs `migration` roles).
4. Keep audit logging enabled for migration/seed commands.