# Package Update Summary

Version: `1.1.0`

This file is the source of truth for the release-focused quick info block that appears in `README.md`.

Update the latest release summary on every patch, minor, or major release, then run:

```bash
npm run docs:sync-package-metadata
```

## Release Lineup

<!-- release-lineup:start -->
Latest Release:
- `v1.0.11 latest`

Old Release:
- `v1.0.10`
<!-- release-lineup:end -->

## Latest Release Headline

<!-- latest-package-headline:start -->
- Minor release. The ORM now supports model-declared relational DDL metadata and safe PostgreSQL smart-update diffs that preserve unmanaged foreign keys.
<!-- latest-package-headline:end -->

## Latest Release Summary

<!-- latest-package-update:start -->
- Add first-class model `database` metadata for foreign keys and indexes, emit relational DDL from the model source of truth, preserve unmanaged PostgreSQL foreign keys during smart-update diffs, keep the source-tree TypeScript contract on NodeNext while `dist/*` stays CommonJS, and restore `100%` statement, branch, function, and line coverage.
<!-- latest-package-update:end -->

## Synced Quick Info

<!-- package-quick-info:start -->
Quick info:
- Package: `@alpha.consultings/eloquent-orm.js`
- Version: `v1.1.0`
- Latest release: `v1.0.11 latest`
- What's new: [Minor release. The ORM now supports model-declared relational DDL metadata and safe PostgreSQL smart-update diffs that preserve unmanaged foreign keys.](https://alphaconsultings.mintlify.app/release/latest-release-summary)
- Old release: `v1.0.10`
- Latest update: Add first-class model `database` metadata for foreign keys and indexes, emit relational DDL from the model source of truth, preserve unmanaged PostgreSQL foreign keys during smart-update diffs, keep the source-tree TypeScript contract on NodeNext while `dist/*` stays CommonJS, and restore `100%` statement, branch, function, and line coverage.
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
