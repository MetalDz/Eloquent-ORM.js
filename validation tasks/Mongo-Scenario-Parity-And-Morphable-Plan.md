# Mongo Scenario Parity And Morphable Plan

## Goal

Close the remaining higher-level runtime parity gaps after Mongo relation support landed:

- align `MorphableMixin` with the safe finder API
- prove nested eager loading works in a Mongo real-scenario shape
- keep CI output quiet for intentional phase-35 coverage branches

## Scope

- `MorphableMixin.morphOne()` and `.morphMany()` use `query()` when available
- fallback to static `where(...).first()/get()` when `query()` is absent
- nested `with("posts.comments", "posts.image", "favorites")` works on Mongo
- phase-35 tests still cover failure branches without noisy console output

## Acceptance

- morph helpers work with BaseModel-style static safe finder APIs
- nested eager loading works in a Mongo blog-style scenario
- `npm run typecheck` stays green
