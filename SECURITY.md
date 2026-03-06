# Security Policy

Last updated: 2026-03-06

## Supported Versions

| Version | Supported |
| --- | --- |
| 0.10.x | Yes |
| < 0.10.0 | No |

## Security Scope
- Package runtime code under `src/core/*`, `src/config/*`, and published `dist/*`.
- CLI command execution under `src/cli/*`.
- Migration and seed execution paths.

Out of scope:
- Local environment misconfiguration.
- Third-party database server vulnerabilities.
- User-maintained application model logic.

## Reporting a Vulnerability
1. Do not open a public issue with exploit details.
2. Open a private security report through GitHub Security Advisories for this repository.
3. Include:
   - affected version
   - impact summary
   - reproduction steps
   - proof-of-concept (if available)
   - suggested mitigation (optional)

## Response Process
- Initial triage target: 3 business days.
- Impact and severity assessment: maintainers review reproducibility and blast radius.
- Fix timeline target:
  - critical/high: next patch release
  - medium/low: scheduled patch/minor release
- Security fixes are documented in release notes.

## Coordinated Disclosure
- Please allow maintainers time to validate and patch before public disclosure.
- Public disclosure is expected after a fix is released or a mitigation path is published.

