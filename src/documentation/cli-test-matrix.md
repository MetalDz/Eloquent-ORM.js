# CLI Test Matrix

This matrix tracks which CLI commands are already validated, which parameters are covered, and what is still missing.

## Fully covered command surface

| Command | Covered parameters / modes | Evidence |
| --- | --- | --- |
| `list` | no options | `src/lab_test/cli.commands.help.test.ts`, `scripts/pack-smoke.js` |
| `cache:clear` | no options | `src/lab_test/cache.commands.logic.test.ts`, `scripts/pack-smoke.js` |
| `cache:stats` | no options | `scripts/pack-smoke.js` |
| `db:seed` | app/test class mode, single-connection flags, and `--all-connections` | `src/lab_test/cli.integration.test.ts` |
| `db:seed:fresh` | app/test single-connection flags plus `--all-connections` | `src/lab_test/cli.integration.test.ts` |
| `factory:status` | direct shell coverage for `--details --graph --test` plus tarball smoke | `src/lab_test/cli.integration.test.ts`, `scripts/pack-smoke.js` |
| `make:controller` | app-mode soft-delete shell assertions plus tarball smoke | `src/lab_test/cli.generators.integration.test.ts`, `scripts/pack-smoke.js` |
| `make:factory` | app/test `--model` shell assertions plus tarball smoke | `src/lab_test/cli.generators.integration.test.ts`, `scripts/pack-smoke.js` |
| `make:model` | app-mode create/overwrite shell assertions plus tarball smoke | `src/lab_test/cli.generators.integration.test.ts`, `scripts/pack-smoke.js` |
| `make:migration` | app/test single-connection flags, `--all`, `--all-connections`, `--pivot-separate`, plus direct single-model shell coverage | `src/lab_test/cli.integration.test.ts` |
| `make:scenario` | `--test --preset blog/media --controllers --services --force`, plus `--run` shell coverage | `src/lab_test/cli.integration.test.ts`, `src/lab_test/cli.generators.integration.test.ts`, `scripts/pack-smoke.js` |
| `make:seed` | app/test count assertions plus tarball smoke | `src/lab_test/cli.generators.integration.test.ts`, `scripts/pack-smoke.js` |
| `make:service` | app-mode shell assertions plus tarball smoke | `src/lab_test/cli.generators.integration.test.ts`, `scripts/pack-smoke.js` |
| `migrate:run` | app/test single-connection flags, `--all-connections`, `--all-migrations`, and app/test `--pivot-separate` proof paths | `src/lab_test/cli.integration.test.ts`, `src/lab_test/migrate.run.logic.test.ts` |
| `migrate:run:test` | test single/all-connection flags, `--all-migrations`, `--pivot-separate` | `src/lab_test/cli.integration.test.ts` |
| `migrate:status` | app and test shell coverage | `src/lab_test/cli.integration.test.ts` |
| `migrate:fresh` | app and test shell coverage with `--force` | `src/lab_test/cli.integration.test.ts` |
| `migrate:reset` | app and test shell coverage | `src/lab_test/cli.integration.test.ts` |
| `demo:scenario` | app/test `--user`, app/test `--random`, plus tarball smoke | `src/lab_test/cli.integration.test.ts`, `scripts/pack-smoke.js` |

## Partially covered command surface

| Command | Covered now | Remaining gaps |
| --- | --- | --- |
| `migrate:rollback` | `--test --step`, app sqlite/mysql/pg shell coverage | all-connections rollback command does not exist by design |

## Command-to-test ownership

| Command | Current main test file |
| --- | --- |
| `list` | `src/lab_test/cli.commands.help.test.ts` |
| `make:model` | `src/lab_test/cli.generators.integration.test.ts`, `scripts/pack-smoke.js` |
| `make:controller` | `src/lab_test/cli.generators.integration.test.ts`, `scripts/pack-smoke.js` |
| `make:service` | `src/lab_test/cli.generators.integration.test.ts`, `scripts/pack-smoke.js` |
| `make:seed` | `src/lab_test/cli.generators.integration.test.ts`, `scripts/pack-smoke.js` |
| `make:factory` | `src/lab_test/cli.generators.integration.test.ts`, `scripts/pack-smoke.js` |
| `make:scenario` | `src/lab_test/cli.integration.test.ts`, `src/lab_test/cli.generators.integration.test.ts` |
| `make:migration` | `src/lab_test/cli.integration.test.ts` |
| `db:seed` | `src/lab_test/cli.integration.test.ts` |
| `db:seed:fresh` | `src/lab_test/cli.integration.test.ts` |
| `demo:scenario` | `src/lab_test/cli.integration.test.ts`, `scripts/pack-smoke.js` |
| `migrate:run` | `src/lab_test/cli.integration.test.ts`, `src/lab_test/migrate.run.logic.test.ts` |
| `migrate:run:test` | `src/lab_test/cli.integration.test.ts` |
| `migrate:rollback` | `src/lab_test/cli.integration.test.ts` |
| `migrate:status` | `src/lab_test/cli.integration.test.ts` |
| `migrate:fresh` | `src/lab_test/cli.integration.test.ts` |
| `migrate:reset` | `src/lab_test/cli.integration.test.ts` |
| `cache:clear` | `src/lab_test/cache.commands.logic.test.ts` |
| `cache:stats` | `scripts/pack-smoke.js` |
| `factory:status` | `src/lab_test/cli.integration.test.ts`, `scripts/pack-smoke.js` |

## Next test targets

1. decide whether tarball smoke should mirror every generator assertion already covered in lab tests
