# Package Update Summary

Version: `1.3.0`

This file is the source of truth for the release-focused quick info block that appears in `README.md`.

Update the latest release summary on every patch, minor, or major release, then run:

```bash
npm run docs:sync-package-metadata
```

## Release Lineup

<!-- release-lineup:start -->
Latest Release:
- `v1.1.4 latest`

Old Release:
- `v1.1.3`
<!-- release-lineup:end -->

## Latest Release Headline

<!-- latest-package-headline:start -->
- Fix release. PostgreSQL boolean defaults, dependency-safe create ordering, and CLI version reporting are now aligned with the package contract.
<!-- latest-package-headline:end -->

## Latest Release Summary

<!-- latest-package-update:start -->
- Keep the relational DDL and safe-diff model contract from `1.1.0`, emit PostgreSQL boolean defaults as `TRUE` / `FALSE` instead of `0` / `1`, order brand-new create migrations by dependencies declared in both `static schema` and `static database.foreignKeys`, resolve the shipped CLI banner version from `package.json` instead of the stale `v1.0` literal, and lock the CLI SemVer rule in the published versioning policy while preserving the clean NodeNext source-tree, CommonJS `dist/*` build, and `100%` coverage baseline.
<!-- latest-package-update:end -->

## Synced Quick Info

<!-- package-quick-info:start -->
Quick info:
- Package: `@alpha.consultings/eloquent-orm.js`
- Version: `v1.3.0`
- Latest release: `v1.1.4 latest`
- What's new: [Fix release. PostgreSQL boolean defaults, dependency-safe create ordering, and CLI version reporting are now aligned with the package contract.](https://alphaconsultings.mintlify.app/release/latest-release-summary)
- Old release: `v1.1.3`
- Latest update: Keep the relational DDL and safe-diff model contract from `1.1.0`, emit PostgreSQL boolean defaults as `TRUE` / `FALSE` instead of `0` / `1`, order brand-new create migrations by dependencies declared in both `static schema` and `static database.foreignKeys`, resolve the shipped CLI banner version from `package.json` instead of the stale `v1.0` literal, and lock the CLI SemVer rule in the published versioning policy while preserving the clean NodeNext source-tree, CommonJS `dist/*` build, and `100%` coverage baseline.
- Official docs: https://alphaconsultings.mintlify.app
- Quick start: https://alphaconsultings.mintlify.app/getting-started/quick-start
- Release history: https://alphaconsultings.mintlify.app/release/history
- Latest release notes: [PACKAGE-UPDATE-SUMMARY.md](./PACKAGE-UPDATE-SUMMARY.md)
<!-- package-quick-info:end -->

## Update Rule

- Refresh the `latest-package-headline` summary on every fix, minor, or major release.
- Refresh the `latest-package-update` summary on every fix, minor, or major release.
- Keep the headline short and linkable, and keep the detailed update exact and release-specific.
- Let the sync script refresh package name, version, docs URL, README output, and the latest release summary docs page.
