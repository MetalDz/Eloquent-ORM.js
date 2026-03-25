# Real REST Scenario SQL Driver Matrix Plan

Status: COMPLETED

## Goal

Validate a generated blog scenario through a real Express REST layer instead of only CLI artifact checks.

## Scope

- generate `blog` scenario in `src/test`
- include generated controllers and services
- create test migrations per SQL driver
- run migrations and seeders
- bind generated controllers to an Express app
- exercise REST CRUD over HTTP

## Driver order

1. PostgreSQL
2. MySQL
3. SQLite

## REST routes covered

- `GET /users`
- `POST /users`
- `GET /users/:id`
- `PUT /users/:id`
- `DELETE /posts/:id`
- `GET /posts`
- `POST /posts`
- `GET /posts/:id`
- `PUT /posts/:id`

## Runtime contract

- generated controllers stay thin and service-driven
- generated services own persistence calls
- runtime model registration is explicit
- each driver run closes connections before switching to the next driver

## Validation target

- [src/lab_test/rest.scenario.sql-driver-matrix.logic.test.ts](L:\npm dev Packages\src\lab_test\rest.scenario.sql-driver-matrix.logic.test.ts)
