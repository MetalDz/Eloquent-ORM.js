# LTS Phase 5 CLI Registration Security Utility Coverage Plan

Last updated: 2026-03-16 12:20  
Status: COMPLETED

## Goal
- Close the remaining zero-percent coverage cluster around CLI registration helpers, seeder generation, runtime helpers, and the legacy security surface.

## Scope
- `src/cli/commands/makeSeed.ts`
- `src/cli/commands/dbSeedBootstrapPrecheck.ts`
- `src/cli/utils/CliMakeArtifactCommandRegistration.ts`
- `src/cli/utils/CliMigrationCommandRegistration.ts`
- `src/cli/utils/CliScaffoldCommandRegistration.ts`
- `src/cli/utils/CliSeedScenarioCommandRegistration.ts`
- `src/cli/utils/CliSupportCommandRegistration.ts`
- `src/cli/utils/CliPresentation.ts`
- `src/cli/utils/typescript/BaseCommand.ts`
- `src/cli/utils/typescript/RuntimeDetector.ts`
- `src/core/security/AbstractSecurity.ts`
- `src/core/security/EnvKeySecurity.ts`
- `src/core/security/NoSecurity.ts`
- `src/core/security/SecurityFactory.ts`
- `src/core/security/index.ts`
- `src/lab_test/lts.phase5.cli-registration-security-utility-coverage.logic.test.ts`

## Targeted Gaps
- command registration actions and guard branches
- `makeSeed(...)` success, quiet-false, force-overwrite, and error paths
- CLI presentation rendering
- `dbSeedBootstrapPrecheck(...)` delegation
- runtime detector command classification and DEBUG logging
- base command runtime bootstrap and output helpers
- security init / confirm / audit flows, including invalid key and audit-write failure
- public security barrel exports

## Completion Notes
- Added direct runtime tests that execute every extracted registration helper instead of relying only on source-string contract tests.
- Normalized `makeSeed` success/error output to ASCII while locking its behavior with coverage tests.
- Added focused security tests for both `EnvKeySecurity` and `NoSecurity`, plus the factory/barrel surface.

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.cli-registration-security-utility-coverage.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/commands/makeSeed.ts --collectCoverageFrom=src/cli/commands/dbSeedBootstrapPrecheck.ts --collectCoverageFrom=src/cli/utils/CliMakeArtifactCommandRegistration.ts --collectCoverageFrom=src/cli/utils/CliMigrationCommandRegistration.ts --collectCoverageFrom=src/cli/utils/CliScaffoldCommandRegistration.ts --collectCoverageFrom=src/cli/utils/CliSeedScenarioCommandRegistration.ts --collectCoverageFrom=src/cli/utils/CliSupportCommandRegistration.ts --collectCoverageFrom=src/cli/utils/CliPresentation.ts --collectCoverageFrom=src/cli/utils/typescript/BaseCommand.ts --collectCoverageFrom=src/cli/utils/typescript/RuntimeDetector.ts --collectCoverageFrom=src/core/security/AbstractSecurity.ts --collectCoverageFrom=src/core/security/EnvKeySecurity.ts --collectCoverageFrom=src/core/security/NoSecurity.ts --collectCoverageFrom=src/core/security/SecurityFactory.ts --collectCoverageFrom=src/core/security/index.ts --runTestsByPath src/lab_test/lts.phase5.cli-registration-security-utility-coverage.logic.test.ts`
- `npm.cmd run typecheck`
