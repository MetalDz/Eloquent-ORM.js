# Hot Fix Base Code Generator Template Alignment

Last updated: 2026-03-21
Owner: ORM core maintainers
Status: IN PROGRESS

## Goal

Freeze the generator output that must move with the hot-fix CRUD API so docs, templates, and generated artifacts do not drift apart.

## Locked move set

- `src/cli/templates/model.tpl`
- `src/cli/templates/service.tpl`
- `src/cli/templates/controller.tpl`
- `src/lab_test/generated.model.instance.persistence.cli.logic.test.ts`
- `src/lab_test/scenario.generated.model.instance.persistence.logic.test.ts`
- `src/lab_test/orm.hardening.phase5.scaffold-generators.logic.test.ts`
- `src/lab_test/cli.generators.integration.test.ts`
- `src/documentation/usage-guides.md`
- `src/documentation/usage-guides-services.md`
- `src/documentation/usage-guides-controller.md`
- `docs/getting-started/usage-guides.mdx`
- `docs/getting-started/services.mdx`
- `docs/getting-started/controllers.mdx`

## Required generator output

- `model.tpl` must keep the loaded-instance `fill()`, `update() + save()`, and `patch()` examples.
- `service.tpl` must prefer:
  - `Model.find(id)` for direct reads
  - `Model.create(data)` for create
  - loaded-instance `update(data); await model.save();` for readable updates
  - `Model.deleteById(id)` and `Model.restoreById(id)` for explicit low-level by-id writes
  - `Model.createMany(...)` and `Model.updateMany(...)` when bulk helpers are exposed by the hot-fix surface
- `controller.tpl` must stay service-oriented and must not bypass the service layer for writes.

## Validation

- Generated app models stay covered by `generated.model.instance.persistence.cli.logic.test.ts`.
- Scenario-generated models stay covered by `scenario.generated.model.instance.persistence.logic.test.ts`.
- Scaffold template routing/output stays covered by `orm.hardening.phase5.scaffold-generators.logic.test.ts`.
- CLI end-to-end generator output stays covered by `cli.generators.integration.test.ts`.

## Notes

- This slice is template and generated-artifact alignment only.
- Pack-smoke stays a later gate in the main hot-fix checklist.
