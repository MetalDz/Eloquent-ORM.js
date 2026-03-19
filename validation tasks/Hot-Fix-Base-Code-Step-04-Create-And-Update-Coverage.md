# Hot Fix Base Code Step 04 - Create And Update Coverage

Last updated: 2026-03-19
Owner: ORM core maintainers
Status: IN PROGRESS

## Coverage targets

- static SQL `Model.create(data)`
- static Mongo `Model.create(data)`
- static SQL `Model.find(id)`
- static Mongo `Model.find(id)`
- loaded-instance SQL `model.update({...}); await model.save()`
- loaded-instance Mongo `model.update({...}); await model.save()`
- low-level compatibility `model.update(id, data, pk?)`
- generated SQL model example updated to `update({...}); save()`
- generated Mongo model example updated to `update({...}); save()`

## Guard rules

- keep 100% statements, branches, functions, and lines
- no regression in `patch()` behavior while adding `update({...})`
- no generated artifact example changes without direct test assertions
