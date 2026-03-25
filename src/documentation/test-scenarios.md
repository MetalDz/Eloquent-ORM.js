# Scenarios

Last updated: 2026-03-19

Scenarios are coordinated artifact and runtime flows used for end-to-end proof.

Typical commands:

```bash
eloquent make:scenario blog --test --controllers --services --run --force
eloquent demo:scenario --test --random
```

## Real REST API matrix
The SQL driver validation pass binds generated controllers and services into an Express app and exercises REST CRUD in this order:

1. PostgreSQL
2. MySQL
3. SQLite

Typical flow:

```bash
eloquent make:scenario blog --test --controllers --services --force
eloquent make:migration --all --test
eloquent migrate:run --test
eloquent db:seed --test --class BlogScenarioSeeder
```

REST routes exercised:

- `GET /users`
- `POST /users`
- `GET /users/:id`
- `PUT /users/:id`
- `GET /posts`
- `POST /posts`
- `GET /posts/:id`
- `PUT /posts/:id`
- `DELETE /posts/:id`

Related pages:

- [Advanced Integration / Real Backend Harness](./test-real-backend-harness.md)
- [CLI and pack smoke](./test-cli-pack-smoke.md)
