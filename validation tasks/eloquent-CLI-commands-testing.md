# Eloquent CLI Commands Testing

Date: 2026-03-06
Status: Completed

## Objective
- Validate every registered CLI command and all declared parameters.
- Provide both automated test coverage and runtime execution evidence.

## Added Test File
- `src/lab_test/eloquent.cli.commands.testing.logic.test.ts`

## Test Strategy
1. Static command/parameter contract test (Jest):
- Parse `src/cli/eloquent.ts`.
- Assert the exact command set is registered.
- Assert each command declares exactly the expected options.
- Assert the `list` command includes all registered command names.

2. Runtime CLI sweep (shell):
- Execute every command with all its flags plus `--help` (and required placeholder args).
- Assert exit code `0` for each invocation.
- This confirms parameter parser acceptance at runtime without executing destructive workflows.

## Commands + Parameters Covered
- `make:model`: `--test --with-migration --attrs-from-schema --force`
- `make:controller`: `--test --soft`
- `make:service`: `--test`
- `make:seed`: `--count <number> --test`
- `make:factory`: `--model <model> --test --force`
- `make:scenario`: `--test --preset <name> --controllers --services --run --force`
- `make:migration`: `--test --all --mysql --pg --sqlite --all-connections --pivot-separate`
- `db:seed`: `--test --mysql --pg --sqlite --all-connections --class <name>`
- `db:seed:fresh`: `--test --mysql --pg --sqlite --all-connections --class <name> --force`
- `demo:scenario`: `--user <id> --random --test`
- `migrate:run`: `--test --mysql --pg --sqlite --all-connections --all-migrations --pivot-separate`
- `migrate:run --test`: `--mysql --pg --sqlite --all-connections --all-migrations --pivot-separate`
- `migrate:rollback`: `--test --mysql --pg --sqlite --all-connections --all-migrations --step <number>`
- `migrate:status`: `--test --mysql --pg --sqlite --all-connections --all-migrations`
- `migrate:fresh`: `--test --mysql --pg --sqlite --all-connections --all-migrations --force`
- `migrate:reset`: `--test --mysql --pg --sqlite --all-connections --all-migrations`
- `cache:clear`: no options
- `cache:stats`: no options
- `factory:status`: `--test --details --graph`
- `list`: no options
- root help: `--help`

## Evidence
### Jest
Command:
- `npm.cmd test -- --runTestsByPath src/lab_test/eloquent.cli.commands.testing.logic.test.ts`

Result:
- `PASS`
- `Test Suites: 1 passed`
- `Tests: 22 passed`

### Runtime CLI Sweep
Result summary (all exit codes were `0`):
- root
- make:model
- make:controller
- make:service
- make:seed
- make:factory
- make:scenario
- make:migration
- db:seed
- db:seed:fresh
- demo:scenario
- migrate:run
- migrate:run --test
- migrate:rollback
- migrate:status
- migrate:fresh
- migrate:reset
- cache:clear
- cache:stats
- factory:status
- list

## Outcome
- CLI command registry and parameter surface are fully covered by the new test.
- Runtime command parsing checks passed for all commands with all declared parameters.
