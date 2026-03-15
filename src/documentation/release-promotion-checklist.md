# Release Promotion Checklist

Last updated: 2026-03-14

Use this checklist before promoting a build to `stable`, and again before promoting any line to `LTS`.

## Stable Promotion
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] `npm run test:coverage` passes
- [ ] `npm run test:pack-smoke` passes
- [ ] CI workflow gates are green
- [ ] `CHANGELOG.md` is updated under `## Unreleased`
- [ ] `src/documentation/upgrade-guide.md` is updated when consumer action is required
- [ ] release qualification checklist is satisfied

## LTS Promotion
- [ ] Stable promotion checklist is satisfied
- [ ] support policy for the line is published
- [ ] versioning policy remains aligned with the intended release
- [ ] backward compatibility promises are locked by tests
- [ ] public API freeze rules are active
- [ ] consumer docs are complete from installation to support
- [ ] coverage has reached the LTS target

## Blockers
- Do not promote if:
  - changelog is stale
  - upgrade guidance is missing for a breaking or notable change
  - smoke validation is red
  - compatibility contracts are failing
  - support expectations are undocumented
