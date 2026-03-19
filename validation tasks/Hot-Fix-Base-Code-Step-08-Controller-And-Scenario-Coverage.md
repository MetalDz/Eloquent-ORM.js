# Hot Fix Base Code Step 08 - Controller and Scenario Coverage

Last updated: 2026-03-19
Owner: ORM core maintainers
Status: IN PROGRESS

## Coverage targets

- `docs/getting-started/controllers.mdx`
- `src/documentation/usage-guides-controller.md`
- `docs/getting-started/common-scenarios.mdx`
- `src/documentation/common-scenarios.md`
- `src/lab_test/documentation.usage.gaps.logic.test.ts`

## Guard rules

- controller docs must keep controllers thin and point CRUD behavior to the service/model layer
- scenario docs must not recommend the older `new User().create(...)` path as the first-copy runtime shape
- source docs and Mintlify docs must stay aligned
