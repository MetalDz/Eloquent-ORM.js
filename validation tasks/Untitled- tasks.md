# United-tasks.md
Note

2) Seed/CLI shutdown stability

We already fixed double‑close and forced CLI exit. Keep this pattern: dbSeed/dbSeedFresh should always closeAllConnections() exactly once and exit only in CLI context.
Consider adding a --silent or --no-hooks flag to reduce verbose seed output (currently hooks log a lot).

3) Schema-driven migration generation

SchemaBuilder doesn’t always capture pivot/morph columns automatically. You’re now patching with manual migrations. Recommendation: update the migration generator to:
Add user_id for belongsTo relations
Add morph columns when morphName exists
Add pivot tables for belongsToMany
This removes manual migration debt.

4) CLI runtime correctness

You now load .ts seeds/factories via ts-node. Good. But keep dist and src loading consistent, or explicitly detect runtime (ts-node vs compiled) to avoid mixed state.
Add an explicit log when ts-node runtime is enabled to avoid confusion in production.

5) Safety checks

db:seed:fresh is destructive; consider a --force flag to skip prompt for CI, and keep the prompt for interactive runs.

6) Consistency

In demo:scenario, you now have manual and random selection. That’s good. But when testing, prefer --user <id> to avoid confusion.
If you want, I can go deeper and do a line-by-line review of specific folders (e.g., src/core, src/cli, src/app) and flag exact file/line issues. Just tell me which scope to prioritize.


_/ dons 7) make sénario use Model auto

8) check this --attrs-from-schema  in (make:model Comment --attrs-from-schema)

_/ dons 9) unify test opions like --test or :test

10) make a clean tpl beside the all needds tpls in all the kinds 

11) Later, consider switching from sqlite3 to better-sqlite3 (usually smoother builds and fewer transitive issues).


eloquent make:scenario blog --test
eloquent make:scenario anything --test --preset media
eloquent make:scenario run1 --test --run
eloquent make:scenario blog --test --controllers --services


**News**
*Done*

3) Schema-driven migration generation is *Done*.
belongsTo FK columns/constraints: [SchemaBuilder.ts](L:\npm dev Packages\src\core\schema\SchemaBuilder.ts:506)
morphTo columns with morphName: [SchemaBuilder.ts](L:\npm dev Packages\src\core\schema\SchemaBuilder.ts:556)
belongsToMany pivot table generation: [SchemaBuilder.ts](L:\npm dev Packages\src\core\schema\SchemaBuilder.ts:526)
Migration ordering by belongsTo deps: [makeMigration.ts](L:\npm dev Packages\src\cli\commands\makeMigration.ts:106)
5) Safety checks (db:seed:fresh --force) is done.
CLI flag: [eloquent.ts](L:\npm dev Packages\src\cli\eloquent.ts:326)
Prompt logic + --force bypass: [migrateFresh.ts](L:\npm dev Packages\src\cli\commands\migrateFresh.ts:88), [migrateFresh.ts](L:\npm dev Packages\src\cli\commands\migrateFresh.ts:130)
6) Consistency (manual + random demo scenario) is done.
CLI options: [eloquent.ts](L:\npm dev Packages\src\cli\eloquent.ts:363)
Runtime behavior: [demoScenario.ts](L:\npm dev Packages\src\cli\commands\demoScenario.ts:63)
7) make scenario use model auto is done.
Scenario auto-generates models/factories/seeds: [makeScenario.ts](L:\npm dev Packages\src\cli\commands\makeScenario.ts:567)
8) --attrs-from-schema is done.
CLI option: [eloquent.ts](L:\npm dev Packages\src\cli\eloquent.ts:193)
Inference logic: [makeModel.ts](L:\npm dev Packages\src\cli\commands\makeModel.ts:167)

**Partial** is *Done*.

*Done*. 2) Seed/CLI shutdown stability is only partially done.
CLI-only exits are implemented: [dbSeed.ts](L:\npm dev Packages\src\cli\commands\dbSeed.ts:96), [dbSeedFresh.ts](L:\npm dev Packages\src\cli\commands\dbSeedFresh.ts:65)
But dbSeed still closes connections in-loop and again in finally (double-close path): [dbSeed.ts](L:\npm dev Packages\src\cli\commands\dbSeed.ts:77), [dbSeed.ts](L:\npm dev Packages\src\cli\commands\dbSeed.ts:90)
*Done*. 4) CLI runtime correctness is mostly done.
TS runtime loader/fallback exists: [tsRuntime.ts](L:\npm dev Packages\src\cli\utils\typescript\tsRuntime.ts:10)
Runtime detection exists: [RuntimeDetector.ts](L:\npm dev Packages\src\cli\utils\typescript\RuntimeDetector.ts:9)
“explicit runtime enabled log” is debug-only, not always visible in normal runs.
*currents*. 9) unify test options is mostly done with --test, but mixed style remains because of command migrate:run:test: [eloquent.ts](L:\npm dev Packages\src\cli\eloquent.ts:494)

**Missing**

2) --silent / --no-hooks for seed output: not implemented in CLI options (no such flags under db:seed / db:seed:fresh): [eloquent.ts](L:\npm dev Packages\src\cli\eloquent.ts:283), [eloquent.ts](L:\npm dev Packages\src\cli\eloquent.ts:320)

10) clean tpl is not clearly completed (templates exist, but no explicit “clean template system” milestone/flag was added): [src/cli/templates](L:\npm dev Packages\src\cli\templates)

11) move to better-sqlite3 later not done.

Still on sqlite3: [package.json](L:\npm dev Packages\package.json:53)
If you want, next I can close the two real gaps quickly:

fix dbSeed single-close flow,
add --silent to db:seed and db:seed:fresh end-to-end.
