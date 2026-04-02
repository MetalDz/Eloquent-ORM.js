# Package Update Summary

Version: `1.0.10`

This file is the source of truth for the release-focused quick info block that appears in `README.md`.

Update the latest release summary on every patch, minor, or major release, then run:

```bash
npm run docs:sync-package-metadata
```

## Release Lineup

<!-- release-lineup:start -->
Latest Release:
- `v1.0.10 latest`

Old Release:
- `v1.0.9`
<!-- release-lineup:end -->

## Latest Release Headline

<!-- latest-package-headline:start -->
- Patched. The published ESM surface now builds from dedicated TypeScript entrypoints, keeping CommonJS stable and removing wrapper-generation drift.
<!-- latest-package-headline:end -->

## Latest Release Summary

<!-- latest-package-update:start -->
- Replace the generated ESM wrapper script with a true TypeScript ESM build pipeline, compiling dedicated `esm-src/*.mts` entrypoints into the published `esm/*` surface while preserving the CommonJS `dist/*` runtime contract.
<!-- latest-package-update:end -->

## Synced Quick Info

<!-- package-quick-info:start -->
Quick info:
- Package: `@alpha.consultings/eloquent-orm.js`
- Version: `v1.0.10`
- Latest release: `v1.0.10 latest`
- What's new: [Patched. The published ESM surface now builds from dedicated TypeScript entrypoints, keeping CommonJS stable and removing wrapper-generation drift.](https://alphaconsultings.mintlify.app/release/latest-release-summary)
- Old release: `v1.0.9`
- Latest update: Replace the generated ESM wrapper script with a true TypeScript ESM build pipeline, compiling dedicated `esm-src/*.mts` entrypoints into the published `esm/*` surface while preserving the CommonJS `dist/*` runtime contract.
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
