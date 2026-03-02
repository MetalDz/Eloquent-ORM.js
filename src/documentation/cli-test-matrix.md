# CLI Test Matrix

This matrix tracks which CLI commands are already validated, which parameters are covered, and what is still missing.

## Fully covered command surface

| Command | Covered parameters / modes | Evidence |
| --- | --- | --- |
| `list` | no options | `src/lab_test/cli.commands.help.test.ts`, `scripts/pack-smoke.js` |
| `cache:clear` | no options | `src/lab_test/cache.commands.logic.test.ts`, `scripts/pack-smoke.js` |
| `cache:stats` | no options | `scripts/pack-smoke.js` |
| `db:seed` | app/test class mode, single-connection flags, and `--all-connections` | `src/lab_test/cli.integration.test.ts` |
| `migrate:status` | app and test shell coverage | `src/lab_test/cli.integration.test.ts` |
| `migrate:fresh` | app and test shell coverage with `--force` | `src/lab_test/cli.integration.test.ts` |
| `migrate:reset` | app and test shell coverage | `src/lab_test/cli.integration.test.ts` |

## Partially covered command surface

| Command | Covered now | Remaining gaps |
| --- | --- | --- |
| `make:model` | `--test --with-migration --attrs-from-schema --force` through tarball smoke | direct CLI lab test for app mode output assertions |
| `make:controller` | `--test --soft` through tarball smoke | dedicated CLI assertions for generated content in app mode |
| `make:service` | `--test` through tarball smoke | dedicated CLI assertions for generated content in app mode |
| `make:seed` | basic generation through tarball smoke | direct CLI assertions for `--count` in app and test mode |
| `make:factory` | `--test --force --model` through tarball smoke | dedicated CLI assertions for generated content in app mode |
| `make:scenario` | `--test --preset blog/media --controllers --services --force`, plus `--run` in tarball smoke | explicit CLI assertions for `--run` inside lab tests |
| `make:migration` | `--test --all --pivot-separate`, plus app/test generation in smoke/integration | direct CLI assertions for single-model mode |
| `db:seed:fresh` | test mode `--sqlite`, `--all-connections`, `--class`, `--force` | app-mode single/all-connections shell coverage |
| `demo:scenario` | `--test --random`, plus tarball smoke | direct shell coverage for `--user` and app-mode run |
| `migrate:run` | app/test single-connection flags, `--all-connections`, `--all-migrations` | `--pivot-separate` coverage |
| `migrate:run:test` | `--all-connections --all-migrations`, help/options | `--pivot-separate` coverage |
| `migrate:rollback` | `--test --step` | app-mode shell coverage |
| `factory:status` | tarball smoke | direct shell coverage for `--details --graph --test` |

## Command-to-test ownership

| Command | Current main test file |
| --- | --- |
| `list` | `src/lab_test/cli.commands.help.test.ts` |
| `make:model` | `scripts/pack-smoke.js` |
| `make:controller` | `scripts/pack-smoke.js` |
| `make:service` | `scripts/pack-smoke.js` |
| `make:seed` | `scripts/pack-smoke.js` |
| `make:factory` | `scripts/pack-smoke.js` |
| `make:scenario` | `src/lab_test/cli.integration.test.ts` |
| `make:migration` | `src/lab_test/cli.integration.test.ts` |
| `db:seed` | `src/lab_test/cli.integration.test.ts` |
| `db:seed:fresh` | `src/lab_test/cli.integration.test.ts` |
| `demo:scenario` | `src/lab_test/cli.integration.test.ts` |
| `migrate:run` | `src/lab_test/cli.integration.test.ts`, `src/lab_test/migrate.run.logic.test.ts` |
| `migrate:run:test` | `src/lab_test/cli.integration.test.ts` |
| `migrate:rollback` | `src/lab_test/cli.integration.test.ts` |
| `migrate:status` | `src/lab_test/cli.integration.test.ts` |
| `migrate:fresh` | `src/lab_test/cli.integration.test.ts` |
| `migrate:reset` | `src/lab_test/cli.integration.test.ts` |
| `cache:clear` | `src/lab_test/cache.commands.logic.test.ts` |
| `cache:stats` | `scripts/pack-smoke.js` |
| `factory:status` | `scripts/pack-smoke.js` |

## Next test targets

1. `migrate:run --pivot-separate` and `migrate:run:test --pivot-separate`
2. `db:seed:fresh` app-mode single/all connection shell coverage
3. `demo:scenario --user <id>` shell coverage
4. direct shell coverage for `factory:status`
5. direct single-model shell coverage for `make:migration`
