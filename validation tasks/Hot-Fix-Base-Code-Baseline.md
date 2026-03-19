# Hot Fix Base Code Baseline

Last updated: 2026-03-19
Owner: ORM core maintainers
Status: CAPTURED

## Coverage baseline

Command:

```bash
npm run test:coverage
```

Recorded result on 2026-03-19:

```text
Statements   : 100% (6290/6290)
Branches     : 100% (3326/3326)
Functions    : 100% (1031/1031)
Lines        : 100% (5954/5954)
```

Rule:

- no hot-fix slice may merge below this baseline without an explicit checklist amendment

## Pack-smoke baseline

Command:

```bash
npm run test:pack-smoke
```

Recorded result on 2026-03-19:

```text
NoSQL runtime smoke skipped: set ELOQUENT_PACK_SMOKE_ENABLE_MONGO_RUNTIME=1 to enable live mongo migrate:* checks.
Tarball smoke passed.
```

Rule:

- pack-smoke must stay green for every runtime CRUD slice
- if generated artifacts or package surface change, rerun pack-smoke before merge

## Notes

- This baseline was captured before the runtime CRUD hot-fix implementation began.
- Mongo live runtime smoke remains optional and environment-gated for pack-smoke.
