# EloquentJS Package Docs

Version: `1.1.4`

Last updated: 2026-03-14

## Start Here
- New consumer:
  - read [Installation and Quick Start](./installation-and-quickstart.md)
- Existing consumer upgrading:
  - read [Upgrade and Migration Guide](./upgrade-guide.md)
- Team evaluating support and stability:
  - read [Support Policy](./support-policy.md)
  - read [Versioning Policy](./versioning-policy.md)
  - read [Release Cadence](./release-cadence.md)

## Installation and Setup
- [Installation and Quick Start](./installation-and-quickstart.md)
- [Usage Guides](./usage-guides.md)
- [Common Scenarios Guide](./common-scenarios.md)
- [Cookbook](./cookbook.md)
- [Controller Usage Guide](./usage-guides-controller.md)
- [Service Usage Guide](./usage-guides-services.md)
- [Runtime Overview](./runtime-index.md)
- [Runtime CRUD](./runtime-crud.md)
- [Runtime Querying](./runtime-querying.md)
- [Runtime Models](./runtime-models.md)
- [Runtime Controllers](./runtime-controllers.md)
- [Runtime Services](./runtime-services.md)
- [Runtime Cache](./runtime-cache.md)
- [Test Overview](./test-index.md)
- [Jest and Runtime Tests](./test-jest-runtime.md)
- [Factories and Seeds](./test-factories-seeds.md)
- [Scenarios](./test-scenarios.md)
- [CLI and Pack Smoke](./test-cli-pack-smoke.md)
- [API Reference](./api-reference.md)

## ORM Runtime Patterns
- [Mixin Scenarios Guide](./mixin-scenarios.md)
- [Soft Deletes and Restore](./soft-deletes-and-restore.md)

## SQL and Mongo Usage
- SQL/general workflow:
  - [Usage Guides](./usage-guides.md)
- Mixed-driver runtime and per-model connection pinning:
  - [Multi-Connection Strategy](./multi-connection-strategy.md)
- Mongo-specific workflow and limits:
  - [NoSQL (Mongo) Usage Guide](./nosql-usage-guide.md)

## Operations and Safety
- [CLI Production Safety](./cli-production-safety.md)
- [DB Least Privilege Environment Contract](./db-least-privilege-env-contract.md)
- [Migration Rollback Recovery Runbook](./migration-rollback-recovery-runbook.md)
- [Release Qualification Checklist](./release-qualification-checklist.md)

## Stability and Compatibility
- [Backward Compatibility Policy](./backward-compatibility-policy.md)
- [Public API Freeze Policy](./public-api-freeze-policy.md)
- [Versioning Policy](./versioning-policy.md)
- [Support Policy](./support-policy.md)

## Troubleshooting and Security
- [Troubleshooting Guide](./troubleshooting.md)
- [SECURITY.md](../../SECURITY.md)

## Published npm Package Notes
- The published npm package intentionally excludes `.map` files to reduce package size.
- This does not change ORM runtime behavior, CLI behavior, or the public API. It only removes published debug metadata.
- Reverse mapping from published JavaScript back to TypeScript source is therefore not shipped in the npm tarball.
- Full TypeScript source remains available in the GitHub repository for collaboration, source review, and deeper debugging.
- The package may be flagged for network-access and eval-like behavior by supply-chain scanners because it legitimately talks to databases/cache servers and because `mysql2` uses generated parser functions internally.
- The known `mysql2` `readCodeFor` issue affected versions earlier than `3.9.7`; this package's supported range is `^3.15.2`, which is above that fixed line.
- Hosted docs: https://alphaconsultings.mintlify.app/
- GitHub source: https://github.com/MetalDz/Eloquent-ORM.js
- npm docs command:
  - `npm docs @alpha.consultings/eloquent-orm.js`
- npm repository command:
  - `npm repo @alpha.consultings/eloquent-orm.js`
- npm issues command:
  - `npm bugs @alpha.consultings/eloquent-orm.js`

## Consumer Navigation Contract
- Installation -> runtime setup -> usage -> operations -> upgrade/support should be navigable from this entry page.
- This page is the package-level doc entry point for the LTS trust-building track.
