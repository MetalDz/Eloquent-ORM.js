# Release Cadence

Last updated: 2026-03-14

## Goal
- Make release timing and stability expectations predictable for consumers before any LTS line is announced.

## Release Channels
- `alpha`
  - early validation for unstable or incomplete work
  - no compatibility guarantee
- `beta`
  - feature-complete validation window for upcoming stable work
  - compatibility may still change before stable
- `rc`
  - release-candidate validation for intended stable behavior
  - only blocker fixes should land
- `stable`
  - default production adoption channel
  - backward compatibility governed by the versioning policy
- `LTS`
  - long-term support channel promoted only after stability criteria are met

## Cadence Model
- Patch releases:
  - issued as needed for correctness, regression, and security fixes
- Minor releases:
  - issued in scheduled batches once new additive work is validated
- Major releases:
  - issued only for intentional breaking changes with upgrade guidance
- LTS promotion:
  - not automatic
  - must follow a stable-release period with low regression rate and complete release evidence

## Stable Release Requirements
- green CI
- green package smoke
- release qualification checklist satisfied
- changelog updated
- upgrade guide updated for any behavioral or migration-impacting change

## LTS Promotion Requirements
- stable line proves reliable across multiple releases
- public API and CLI/runtime compatibility rules are documented and enforced
- coverage gate reaches the declared LTS target
- support policy is published for the promoted line
- consumer docs are complete from installation through operations and support

## Emergency Releases
- Security or severe regression fixes may ship outside the normal cadence.
- Emergency releases still require:
  - versioning-policy compliance
  - changelog entry
  - upgrade note when consumer action is required
