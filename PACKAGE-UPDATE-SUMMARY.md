# Package Update Summary

Version: `1.0.8`

This file is the source of truth for the release-focused quick info block that appears in `README.md`.

Update the latest release summary on every patch, minor, or major release, then run:

```bash
npm run docs:sync-package-metadata
```

## Release Lineup

<!-- release-lineup:start -->
Latest Release:
- `v1.0.8 latest`

Old Release:
- `v1.0.7`
<!-- release-lineup:end -->

## Latest Release Summary

<!-- latest-package-update:start -->
- Add an ESM-safe package entry for NodeNext consumers, keep CommonJS root imports from eagerly loading `Factory`, and verify installed-package ESM imports in pack-smoke.
<!-- latest-package-update:end -->

## Synced Quick Info

<!-- package-quick-info:start -->
Quick info:
- Package: `@alpha.consultings/eloquent-orm.js`
- Version: `v1.0.8`
- Latest release: `v1.0.8 latest`
- What's new: Fix release
- Old release: `v1.0.7`
- Latest update: Add an ESM-safe package entry for NodeNext consumers, keep CommonJS root imports from eagerly loading `Factory`, and verify installed-package ESM imports in pack-smoke.
- Official docs: https://alphaconsultings.mintlify.app
- Quick start: https://alphaconsultings.mintlify.app/getting-started/quick-start
- Release history: https://alphaconsultings.mintlify.app/release/history
- Latest release notes: [PACKAGE-UPDATE-SUMMARY.md](./PACKAGE-UPDATE-SUMMARY.md)
<!-- package-quick-info:end -->

## Update Rule

- Refresh the `latest-package-update` summary on every fix, minor, or major release.
- Keep the quick info short and focused on the most useful runtime or package changes.
- Let the sync script refresh package name, version, docs URL, and README output.
