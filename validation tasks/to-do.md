Skip to content
MetalDz
Eloquent-ORM.js
Repository navigation
Code
Issues
Pull requests
1
 (1)
Actions
Projects
Wiki
Security
2
 (2)
Insights
Settings
PR Quality Gate
Ai testing #124
All jobs
Run details
Annotations
1 error and 1 warning
Typecheck, Build, Test (MySQL)
failed 1 minute ago in 8m 32s
Search logs
1s
30s
3s
4s
8s
0s
6s
4s
7m 32s
Run npm run test:coverage

> eloquent-orm.js@0.10.0 test:coverage
> jest --runInBand --coverage

[baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
PASS src/lab_test/milestone1.schema-and-template.logic.test.ts
PASS src/lab_test/lts.phase5.cli-registration-security-utility-coverage.logic.test.ts
PASS src/lab_test/branch.coverage.70.orm-mixins.logic.test.ts
PASS src/lab_test/lts.phase5.migrate-rollback-coverage.logic.test.ts
  ● Console

    console.log
      
      Rolling back migrations in DEVELOPMENT mode on "mongo" (step all)...

      at log (src/cli/commands/migrateRollback.ts:109:11)

    console.log
      Connected to mongo.

      at log (src/cli/commands/migrateRollback.ts:124:13)

    console.log
      Rolling back 1 migration(s)...

      at log (src/cli/commands/migrateRollback.ts:156:15)

    console.log
      Reverting: 202603150002_manage_media.ts

      at log (src/cli/commands/migrateRollback.ts:209:19)

    console.log
      Rolled back: 202603150002_manage_media.ts

      at log (src/cli/commands/migrateRollback.ts:214:19)

    console.log
      
      1 migration(s) rolled back successfully.

      at log (src/cli/commands/migrateRollback.ts:224:15)

    console.log
      All database connections closed.

      at log (src/cli/commands/migrateRollback.ts:236:15)

    console.log
      
      Rolling back migrations in TEST mode on "mongo" (step 1)...

      at log (src/cli/commands/migrateRollback.ts:109:11)

    console.log
      Connected to mongo.

      at log (src/cli/commands/migrateRollback.ts:124:13)

    console.log
      All database connections closed.

      at log (src/cli/commands/migrateRollback.ts:236:15)

    console.log
      
      Rolling back migrations in DEVELOPMENT mode on "legacy" (step 1)...

      at log (src/cli/commands/migrateRollback.ts:109:11)

    console.log
      
      Rolling back migrations in DEVELOPMENT mode on "mongo" (step all)...

      at log (src/cli/commands/migrateRollback.ts:109:11)

    console.log
      Connected to mongo.

      at log (src/cli/commands/migrateRollback.ts:124:13)

    console.log
      Rolling back 3 migration(s)...

      at log (src/cli/commands/migrateRollback.ts:156:15)

    console.log
      Reverting: 202603150010_manage_media_a.ts

      at log (src/cli/commands/migrateRollback.ts:209:19)

    console.log
      Rolled back: 202603150010_manage_media_a.ts

      at log (src/cli/commands/migrateRollback.ts:214:19)

    console.log
      Reverting: 202603150011_manage_media_b.ts

      at log (src/cli/commands/migrateRollback.ts:209:19)

    console.log
      Rolled back: 202603150011_manage_media_b.ts

      at log (src/cli/commands/migrateRollback.ts:214:19)

    console.log
      Reverting: 202603150012_manage_media_c.ts

      at log (src/cli/commands/migrateRollback.ts:209:19)

    console.log
      Rolled back: 202603150012_manage_media_c.ts

      at log (src/cli/commands/migrateRollback.ts:214:19)

    console.log
      
      3 migration(s) rolled back successfully.

      at log (src/cli/commands/migrateRollback.ts:224:15)

    console.log
      All database connections closed.

      at log (src/cli/commands/migrateRollback.ts:236:15)

PASS src/lab_test/nosql.cli.phase3.parity.logic.test.ts
PASS src/lab_test/lts.phase5.cli-entrypoint-coverage.logic.test.ts
PASS src/lab_test/lts.phase5.migrate-run-coverage.logic.test.ts
  ● Console

    console.log
      
      Running migrations in DEVELOPMENT mode on "mongo"...

      at log (src/cli/commands/migrateRun.ts:146:11)

    console.log
      Connected to mongo.

      at log (src/cli/commands/migrateRun.ts:166:13)

    console.log
      Pending migrations: 1

      at log (src/cli/commands/migrateRun.ts:201:15)

    console.log
      Applying: 202603150102_manage_geo.ts

      at log (src/cli/commands/migrateRun.ts:217:17)

    console.log
      Migration applied: 202603150102_manage_geo.ts

      at log (src/cli/commands/migrateRun.ts:239:17)

    console.log
      
      1 migration(s) applied successfully.

      at log (src/cli/commands/migrateRun.ts:243:15)

    console.log
      
      All database connections closed.

      at log (src/cli/commands/migrateRun.ts:256:15)

    console.log
      
      Running migrations in DEVELOPMENT mode on "mongo"...

      at log (src/cli/commands/migrateRun.ts:146:11)

    console.log
      Connected to mongo.

      at log (src/cli/commands/migrateRun.ts:166:13)

    console.log
      Pending migrations: 1

      at log (src/cli/commands/migrateRun.ts:201:15)

    console.log
      Applying: 202603150108_manage_media.ts

      at log (src/cli/commands/migrateRun.ts:217:17)

    console.log
      Migration applied: 202603150108_manage_media.ts

      at log (src/cli/commands/migrateRun.ts:239:17)

    console.log
      
      1 migration(s) applied successfully.

      at log (src/cli/commands/migrateRun.ts:243:15)

    console.log
      
      All database connections closed.

      at log (src/cli/commands/migrateRun.ts:256:15)

    console.log
      
      Running migrations in DEVELOPMENT mode on "mongo" for model "media"...

      at log (src/cli/commands/migrateRun.ts:146:11)

    console.log
      Connected to mongo.

      at log (src/cli/commands/migrateRun.ts:166:13)

    console.log
      Pending migrations: 1

      at log (src/cli/commands/migrateRun.ts:201:15)

    console.log
      Applying: 202603150111_media.js

      at log (src/cli/commands/migrateRun.ts:217:17)

    console.log
      Skipping empty migration: 202603150111_media.js

      at log (src/cli/commands/migrateRun.ts:226:19)

    console.log
      
      0 migration(s) applied successfully.

      at log (src/cli/commands/migrateRun.ts:243:15)

    console.log
      
      All database connections closed.

      at log (src/cli/commands/migrateRun.ts:256:15)

PASS src/lab_test/branch.coverage.100.phase3.logic.test.ts
  ● Console

    console.log
      📁 Models Path: /tmp/eloquent-phase3-make-model-b67znr/models

      at log (src/cli/commands/makeModel.ts:194:11)

    console.log
      📁 Migrations Path: /tmp/eloquent-phase3-make-model-b67znr/migrations

      at log (src/cli/commands/makeModel.ts:195:11)

    console.log
      ✅ Model created: /tmp/eloquent-phase3-make-model-b67znr/models/User.ts

      at log (src/cli/commands/makeModel.ts:232:15)

    console.log
      ✅ Inferred attrs type from schema for User.ts

      at log (src/cli/commands/makeModel.ts:277:19)

    console.log
      💡 Next step:

      at log (src/cli/commands/makeModel.ts:287:13)

    console.log
         1️⃣ Define your schema inside User.ts

      at log (src/cli/commands/makeModel.ts:288:13)

    console.log
         2️⃣ Run: eloquent make:migration User

      at log (src/cli/commands/makeModel.ts:290:13)

    console.log
      📁 Models Path: /tmp/eloquent-phase3-make-model-b67znr/models

      at log (src/cli/commands/makeModel.ts:194:11)

    console.log
      📁 Migrations Path: /tmp/eloquent-phase3-make-model-b67znr/migrations

      at log (src/cli/commands/makeModel.ts:195:11)

    console.log
      ✅ Model created: /tmp/eloquent-phase3-make-model-b67znr/models/User.ts

      at log (src/cli/commands/makeModel.ts:232:15)

PASS src/lab_test/branch.coverage.70.utilities.logic.test.ts
PASS src/lab_test/lts.phase5.make-scenario-coverage.logic.test.ts
  ● Console

    console.log
      
      Scenario preset: media

      at log (src/cli/commands/makeScenario.ts:586:11)

    console.log
      Users, Photos, Videos, Comments (morph), Likes pivot

      at log (src/cli/commands/makeScenario.ts:587:11)

    console.log
      
      Scenario preset: media

      at log (src/cli/commands/makeScenario.ts:586:11)

    console.log
      Users, Photos, Videos, Comments (morph), Likes pivot

      at log (src/cli/commands/makeScenario.ts:587:11)

PASS src/lab_test/orm.real.scenario.cli.phases.test.ts (84.654 s)
PASS src/lab_test/lts.phase5.make-migration-coverage.logic.test.ts
  ● Console

    console.log
      INFO: Models Path: /tmp/eloquent-lts5-make-migration-CocM4D/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-lts5-make-migration-CocM4D/test-migrations

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: mongo_embed

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-lts5-make-migration-CocM4D/test-migrations/mongo_embed

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      OK: Migration (CREATE) saved: /tmp/eloquent-lts5-make-migration-CocM4D/test-migrations/mongo_embed/20260316161830001_create_users_table.ts

      at log (src/cli/commands/makeMigration.ts:456:19)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

    console.log
      INFO: Models Path: /tmp/eloquent-lts5-make-migration-bWK2tZ/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-lts5-make-migration-bWK2tZ/test-migrations

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: mongo_soft_column

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-lts5-make-migration-bWK2tZ/test-migrations/mongo_soft_column

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      OK: Migration (CREATE) saved: /tmp/eloquent-lts5-make-migration-bWK2tZ/test-migrations/mongo_soft_column/20260316161830001_create_audits_table.ts

      at log (src/cli/commands/makeMigration.ts:456:19)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

    console.log
      INFO: Models Path: /tmp/eloquent-lts5-make-migration-0ZXFhn/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-lts5-make-migration-0ZXFhn/app-migrations

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: mongo_pivot

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-lts5-make-migration-0ZXFhn/app-migrations/mongo_pivot

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      OK: Migration (CREATE) saved: /tmp/eloquent-lts5-make-migration-0ZXFhn/app-migrations/mongo_pivot/20260316161830001_create_users_table.ts

      at log (src/cli/commands/makeMigration.ts:456:19)

    console.log
      OK: Pivot migration saved: /tmp/eloquent-lts5-make-migration-0ZXFhn/app-migrations/mongo_pivot/20260316161830002_create_role_user_pivot_table.ts

      at log (src/cli/commands/makeMigration.ts:668:13)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in DEVELOPMENT mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

    console.log
      INFO: Models Path: /tmp/eloquent-lts5-make-migration-IQFial/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-lts5-make-migration-IQFial/test-migrations

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: mongo_wifi

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-lts5-make-migration-IQFial/test-migrations/mongo_wifi

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      OK: Migration (CREATE) saved: /tmp/eloquent-lts5-make-migration-IQFial/test-migrations/mongo_wifi/20260316161830001_create_wifi_table.ts

      at log (src/cli/commands/makeMigration.ts:456:19)

    console.log
      OK: Pivot migration saved: /tmp/eloquent-lts5-make-migration-IQFial/test-migrations/mongo_wifi/20260316161830002_create_role_wifi_pivot_table.ts

      at log (src/cli/commands/makeMigration.ts:668:13)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

    console.log
      INFO: Models Path: /tmp/eloquent-lts5-make-migration-Vy2L7E/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-lts5-make-migration-Vy2L7E/test-migrations

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: sql_cycle

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-lts5-make-migration-Vy2L7E/test-migrations/sql_cycle

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      INFO: No new columns or schema changes - skipping.

      at log (src/cli/commands/makeMigration.ts:516:17)

    console.log
      INFO: Using connection: sql_cycle

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-lts5-make-migration-Vy2L7E/test-migrations/sql_cycle

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      INFO: No new columns or schema changes - skipping.

      at log (src/cli/commands/makeMigration.ts:516:17)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

    console.log
      INFO: Models Path: /tmp/eloquent-lts5-make-migration-udxf3M/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-lts5-make-migration-udxf3M/test-migrations

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: legacy_conn

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-lts5-make-migration-udxf3M/test-migrations/legacy_conn

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

    console.log
      INFO: Models Path: /tmp/eloquent-lts5-make-migration-qeoHQ1/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-lts5-make-migration-qeoHQ1/test-migrations

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: legacy_fallback

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-lts5-make-migration-qeoHQ1/test-migrations/legacy_fallback

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

PASS src/lab_test/branch.coverage.70.cli-commands.logic.test.ts
PASS src/lab_test/lts.phase5.residual-helper-mixin-coverage.logic.test.ts
PASS src/lab_test/lts.phase5.tsruntime-coverage.logic.test.ts
PASS src/lab_test/cli.integration.migrate.targeting.test.ts (92.899 s)
PASS src/lab_test/branch.coverage.70.cache-and-connection.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase2.logic.test.ts
  ● Console

    console.log
      Creating new mysql_test connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

    console.log
      Creating new sqlite_test connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

    console.log
      Creating new sqlite connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

    console.log
      Creating new mongo connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

    console.log
      Closed sqlite_test connection.

      at log (src/core/connection/ConnectionFactory.ts:132:13)

    console.log
      Closed sqlite connection.

      at log (src/core/connection/ConnectionFactory.ts:132:13)

    console.log
      Closed mongo connection.

      at log (src/core/connection/ConnectionFactory.ts:132:13)

    console.log
      Creating new mongo connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

    console.log
      Closed mongo connection.

      at log (src/core/connection/ConnectionFactory.ts:132:13)

    console.log
      Creating new sqlite_test connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

    console.log
      Creating new sqlite connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

    console.log
      Closed sqlite_test connection.

      at log (src/core/connection/ConnectionFactory.ts:132:13)

    console.log
      Closed sqlite connection.

      at log (src/core/connection/ConnectionFactory.ts:132:13)

PASS src/lab_test/cli.integration.seed-and-demo.targeting.test.ts (70.335 s)
PASS src/lab_test/orm.hardening.phase2.mongo-migration-tracker.logic.test.ts
PASS src/lab_test/lts.phase5.demo-scenario-coverage.logic.test.ts
  ● Console

    console.error
      Demo scenario failed.

      159 |     console.log(chalk.gray("favorite posts:"), favorites.length);
      160 |   } catch (err) {
    > 161 |     console.error(chalk.red("Demo scenario failed."));
          |             ^
      162 |     if (err instanceof Error) console.error(chalk.red(err.message));
      163 |   } finally {
      164 |     await closeAllConnections();

      at error (src/cli/commands/demoScenario.ts:161:13)
      at Object.<anonymous> (src/lab_test/lts.phase5.demo-scenario-coverage.logic.test.ts:97:5)

    console.error
      Cannot read properties of undefined (reading 'length')

      160 |   } catch (err) {
      161 |     console.error(chalk.red("Demo scenario failed."));
    > 162 |     if (err instanceof Error) console.error(chalk.red(err.message));
          |                                       ^
      163 |   } finally {
      164 |     await closeAllConnections();
      165 |     if (process.env.ELOQUENT_CLI === "true") {

      at error (src/cli/commands/demoScenario.ts:162:39)
      at Object.<anonymous> (src/lab_test/lts.phase5.demo-scenario-coverage.logic.test.ts:97:5)

    console.log
      
      Scenario check: counts

      at log (src/cli/commands/demoScenario.ts:75:13)

    console.log
      users: 1

      at log (src/cli/commands/demoScenario.ts:76:13)

    console.log
      posts: 2

      at log (src/cli/commands/demoScenario.ts:80:13)

    console.log
      comments: 3

      at log (src/cli/commands/demoScenario.ts:84:13)

    console.log
      post_user_pivot: 4

      at log (src/cli/commands/demoScenario.ts:88:13)

    console.log
      
      Scenario check: relations

      at log (src/cli/commands/demoScenario.ts:117:13)

    console.log
      user: { id: 7, name: 'Random User' }

      at log (src/cli/commands/demoScenario.ts:118:13)

    console.log
      posts for user: 0

      at log (src/cli/commands/demoScenario.ts:124:13)

    console.log
      comments on user: 0

      at log (src/cli/commands/demoScenario.ts:135:13)

    console.log
      comments on posts: 0

      at log (src/cli/commands/demoScenario.ts:149:15)

    console.log
      favorite posts: 0

      at log (src/cli/commands/demoScenario.ts:159:13)

    console.log
      
      Scenario check: counts

      at log (src/cli/commands/demoScenario.ts:75:13)

    console.log
      users: 1

      at log (src/cli/commands/demoScenario.ts:76:13)

    console.log
      posts: 2

      at log (src/cli/commands/demoScenario.ts:80:13)

    console.log
      comments: 3

      at log (src/cli/commands/demoScenario.ts:84:13)

    console.log
      post_user_pivot: 4

      at log (src/cli/commands/demoScenario.ts:88:13)

    console.log
      
      Scenario check: relations

      at log (src/cli/commands/demoScenario.ts:117:13)

    console.log
      user: { id: 11, name: 'Fallback User' }

      at log (src/cli/commands/demoScenario.ts:118:13)

    console.log
      posts for user: 0

      at log (src/cli/commands/demoScenario.ts:124:13)

    console.log
      comments on user: 0

      at log (src/cli/commands/demoScenario.ts:135:13)

    console.log
      comments on posts: 0

      at log (src/cli/commands/demoScenario.ts:149:15)

    console.log
      favorite posts: 0

      at log (src/cli/commands/demoScenario.ts:159:13)

PASS src/lab_test/branch.coverage.100.phase4.logic.test.ts
PASS src/lab_test/relations.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase7.migrate-run.logic.test.ts
PASS src/lab_test/lts.phase5.mongo-migration-tracker-coverage.logic.test.ts
PASS src/lab_test/coremodel.crud.logic.test.ts
PASS src/lab_test/lts.phase5.factory-runtime-coverage.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase35.core-utilities.logic.test.ts
PASS src/lab_test/branch.coverage.70.factory-path-resolver.logic.test.ts
PASS src/lab_test/lts.phase5.safe-finder-coverage.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase24.utilities-and-env.logic.test.ts
PASS src/lab_test/nosql.phase6.command-parity.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase16.make-model-extra.logic.test.ts
  ● Console

    console.log
      📁 Models Path: /tmp/eloquent-phase16-make-model-0fB0ye/models

      at log (src/cli/commands/makeModel.ts:194:11)

    console.log
      📁 Migrations Path: /tmp/eloquent-phase16-make-model-0fB0ye/test-migrations

      at log (src/cli/commands/makeModel.ts:195:11)

    console.log
      ✅ Model created: /tmp/eloquent-phase16-make-model-0fB0ye/models/Status.ts

      at log (src/cli/commands/makeModel.ts:232:15)

    console.log
      ✅ Inferred attrs type from schema for Status.ts

      at log (src/cli/commands/makeModel.ts:277:19)

    console.log
      💡 Next step:

      at log (src/cli/commands/makeModel.ts:287:13)

    console.log
         1️⃣ Define your schema inside Status.ts

      at log (src/cli/commands/makeModel.ts:288:13)

    console.log
         2️⃣ Run: eloquent make:migration Status

      at log (src/cli/commands/makeModel.ts:290:13)

    console.log
      📁 Models Path: /tmp/eloquent-phase16-make-model-0fB0ye/models

      at log (src/cli/commands/makeModel.ts:194:11)

    console.log
      📁 Migrations Path: /tmp/eloquent-phase16-make-model-0fB0ye/test-migrations

      at log (src/cli/commands/makeModel.ts:195:11)

    console.log
      ✅ Model created: /tmp/eloquent-phase16-make-model-0fB0ye/models/Ghost.ts

      at log (src/cli/commands/makeModel.ts:232:15)

    console.log
      ✅ Inferred attrs type from schema for Ghost.ts

      at log (src/cli/commands/makeModel.ts:277:19)

    console.log
      💡 Next step:

      at log (src/cli/commands/makeModel.ts:287:13)

    console.log
         1️⃣ Define your schema inside Ghost.ts

      at log (src/cli/commands/makeModel.ts:288:13)

    console.log
         2️⃣ Run: eloquent make:migration Ghost

      at log (src/cli/commands/makeModel.ts:290:13)

    console.log
      📁 Models Path: /tmp/eloquent-phase16-make-model-0fB0ye/models

      at log (src/cli/commands/makeModel.ts:194:11)

    console.log
      📁 Migrations Path: /tmp/eloquent-phase16-make-model-0fB0ye/app-migrations

      at log (src/cli/commands/makeModel.ts:195:11)

    console.log
      ✅ Model created: /tmp/eloquent-phase16-make-model-0fB0ye/models/User.ts

      at log (src/cli/commands/makeModel.ts:232:15)

    console.log
      💡 Next step:

      at log (src/cli/commands/makeModel.ts:287:13)

    console.log
         1️⃣ Define your schema inside User.ts

      at log (src/cli/commands/makeModel.ts:288:13)

    console.log
         2️⃣ Run: eloquent make:migration User

      at log (src/cli/commands/makeModel.ts:290:13)

    console.log
      📁 Models Path: /tmp/eloquent-phase16-make-model-KEUXvM/models

      at log (src/cli/commands/makeModel.ts:194:11)

    console.log
      📁 Migrations Path: /tmp/eloquent-phase16-make-model-KEUXvM/test-migrations

      at log (src/cli/commands/makeModel.ts:195:11)

    console.log
      ✅ Model created: /tmp/eloquent-phase16-make-model-KEUXvM/models/Post.ts

      at log (src/cli/commands/makeModel.ts:232:15)

    console.log
      Using connection: custom_conn

      at log (src/cli/commands/makeModel.ts:321:13)

    console.log
      Migrations Path: /tmp/eloquent-phase16-make-model-KEUXvM/test-migrations/custom_conn

      at log (src/cli/commands/makeModel.ts:322:13)

    console.log
      🧱 Migration (CREATE) created: /tmp/eloquent-phase16-make-model-KEUXvM/test-migrations/custom_conn/20260316162124_create_posts_table.ts

      at log (src/cli/commands/makeModel.ts:418:13)

    console.log
      All database connections closed.

      at log (src/cli/commands/makeModel.ts:424:15)

    console.log
      📁 Models Path: /tmp/eloquent-phase16-make-model-KEUXvM/models

      at log (src/cli/commands/makeModel.ts:194:11)

    console.log
      📁 Migrations Path: /tmp/eloquent-phase16-make-model-KEUXvM/test-migrations

      at log (src/cli/commands/makeModel.ts:195:11)

    console.log
      ✅ Model created: /tmp/eloquent-phase16-make-model-KEUXvM/models/Post.ts

      at log (src/cli/commands/makeModel.ts:232:15)

    console.log
      Using connection: pg_test

      at log (src/cli/commands/makeModel.ts:321:13)

    console.log
      Migrations Path: /tmp/eloquent-phase16-make-model-KEUXvM/test-migrations/pg_test

      at log (src/cli/commands/makeModel.ts:322:13)

    console.log
      🧱 Migration (CREATE) created: /tmp/eloquent-phase16-make-model-KEUXvM/test-migrations/pg_test/20260316162124_create_posts_table.ts

      at log (src/cli/commands/makeModel.ts:418:13)

    console.log
      All database connections closed.

      at log (src/cli/commands/makeModel.ts:424:15)

    console.log
      📁 Models Path: /tmp/eloquent-phase16-make-model-KEUXvM/models

      at log (src/cli/commands/makeModel.ts:194:11)

    console.log
      📁 Migrations Path: /tmp/eloquent-phase16-make-model-KEUXvM/test-migrations

      at log (src/cli/commands/makeModel.ts:195:11)

    console.log
      ✅ Model created: /tmp/eloquent-phase16-make-model-KEUXvM/models/Post.ts

      at log (src/cli/commands/makeModel.ts:232:15)

    console.log
      Using connection: custom_conn

      at log (src/cli/commands/makeModel.ts:321:13)

    console.log
      Migrations Path: /tmp/eloquent-phase16-make-model-KEUXvM/test-migrations/custom_conn

      at log (src/cli/commands/makeModel.ts:322:13)

    console.log
      🧱 Migration (CREATE) created: /tmp/eloquent-phase16-make-model-KEUXvM/test-migrations/custom_conn/20260316162124_create_posts_table.ts

      at log (src/cli/commands/makeModel.ts:418:13)

    console.log
      All database connections closed.

      at log (src/cli/commands/makeModel.ts:424:15)

    console.log
      📁 Models Path: /tmp/eloquent-phase16-make-model-14CAQT/models

      at log (src/cli/commands/makeModel.ts:194:11)

    console.log
      📁 Migrations Path: /tmp/eloquent-phase16-make-model-14CAQT/app-migrations

      at log (src/cli/commands/makeModel.ts:195:11)

    console.log
      ✅ Model created: /tmp/eloquent-phase16-make-model-14CAQT/models/Account.ts

      at log (src/cli/commands/makeModel.ts:232:15)

    console.log
      Using connection: custom_conn

      at log (src/cli/commands/makeModel.ts:321:13)

    console.log
      Migrations Path: /tmp/eloquent-phase16-make-model-14CAQT/app-migrations/custom_conn

      at log (src/cli/commands/makeModel.ts:322:13)

    console.log
      🧱 Migration (UPDATE) created: /tmp/eloquent-phase16-make-model-14CAQT/app-migrations/custom_conn/20260316162124_update_accounts_table.ts

      at log (src/cli/commands/makeModel.ts:418:13)

    console.log
      All database connections closed.

      at log (src/cli/commands/makeModel.ts:424:15)

PASS src/lab_test/branch.coverage.100.phase7.make-model.logic.test.ts
  ● Console

    console.log
      📁 Models Path: /tmp/eloquent-phase7-make-model-81E84D/models

      at log (src/cli/commands/makeModel.ts:194:11)

    console.log
      📁 Migrations Path: /tmp/eloquent-phase7-make-model-81E84D/migrations-root

      at log (src/cli/commands/makeModel.ts:195:11)

    console.log
      📁 Models Path: /tmp/eloquent-phase7-make-model-zEJtaU/models

      at log (src/cli/commands/makeModel.ts:194:11)

    console.log
      📁 Migrations Path: /tmp/eloquent-phase7-make-model-zEJtaU/migrations-root

      at log (src/cli/commands/makeModel.ts:195:11)

    console.log
      ✅ Model created: /tmp/eloquent-phase7-make-model-zEJtaU/models/User.ts

      at log (src/cli/commands/makeModel.ts:232:15)

    console.log
      Using connection: pg_test

      at log (src/cli/commands/makeModel.ts:321:13)

    console.log
      Migrations Path: /tmp/eloquent-phase7-make-model-zEJtaU/migrations-root/pg_test

      at log (src/cli/commands/makeModel.ts:322:13)

    console.log
      📁 Models Path: /tmp/eloquent-phase7-make-model-6TkuII/models

      at log (src/cli/commands/makeModel.ts:194:11)

    console.log
      📁 Migrations Path: /tmp/eloquent-phase7-make-model-6TkuII/migrations-root

      at log (src/cli/commands/makeModel.ts:195:11)

    console.log
      ✅ Model created: /tmp/eloquent-phase7-make-model-6TkuII/models/User.ts

      at log (src/cli/commands/makeModel.ts:232:15)

    console.log
      Using connection: pg_test

      at log (src/cli/commands/makeModel.ts:321:13)

    console.log
      Migrations Path: /tmp/eloquent-phase7-make-model-6TkuII/migrations-root/pg_test

      at log (src/cli/commands/makeModel.ts:322:13)

    console.log
      🧱 Migration (UPDATE) created: /tmp/eloquent-phase7-make-model-6TkuII/migrations-root/pg_test/20260316162125_update_users_table.ts

      at log (src/cli/commands/makeModel.ts:418:13)

    console.log
      All database connections closed.

      at log (src/cli/commands/makeModel.ts:424:15)

PASS src/lab_test/cli.generators.integration.test.ts (13.948 s)
PASS src/lab_test/branch.coverage.70.migration-and-schema.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase15.make-migration-extra.logic.test.ts
  ● Console

    console.log
      INFO: Models Path: /tmp/eloquent-phase15-make-migration-ZkPxo5/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-phase15-make-migration-ZkPxo5/test-migrations

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: custom_conn

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-phase15-make-migration-ZkPxo5/test-migrations/custom_conn

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      INFO: No new columns or schema changes - skipping.

      at log (src/cli/commands/makeMigration.ts:516:17)

    console.log
      INFO: Using connection: custom_conn

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-phase15-make-migration-ZkPxo5/test-migrations/custom_conn

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      INFO: No new columns or schema changes - skipping.

      at log (src/cli/commands/makeMigration.ts:516:17)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

    console.log
      INFO: Models Path: /tmp/eloquent-phase15-make-migration-nJlOWM/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-phase15-make-migration-nJlOWM/test-migrations

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: custom_conn

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-phase15-make-migration-nJlOWM/test-migrations/custom_conn

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      OK: Migration (UPDATE) saved: /tmp/eloquent-phase15-make-migration-nJlOWM/test-migrations/custom_conn/20260316162139001_update_users_table.ts

      at log (src/cli/commands/makeMigration.ts:602:19)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

    console.log
      INFO: Models Path: /tmp/eloquent-phase15-make-migration-vmMJhs/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-phase15-make-migration-vmMJhs/test-migrations

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

    console.log
      INFO: Models Path: /tmp/eloquent-phase15-make-migration-vmMJhs/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-phase15-make-migration-vmMJhs/test-migrations

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: custom_conn

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-phase15-make-migration-vmMJhs/test-migrations/custom_conn

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

    console.log
      INFO: Models Path: /tmp/eloquent-phase15-make-migration-vmMJhs/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-phase15-make-migration-vmMJhs/app-migrations

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: custom_conn

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-phase15-make-migration-vmMJhs/app-migrations/custom_conn

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      INFO: No new columns or schema changes - skipping.

      at log (src/cli/commands/makeMigration.ts:516:17)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in DEVELOPMENT mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

PASS src/lab_test/lts.phase5.artifact-storage-coverage.logic.test.ts
PASS src/lab_test/safe.finder.api.runtime.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase17.rollback-and-adapter.logic.test.ts
  ● Console

    console.log
      
      Rolling back migrations in DEVELOPMENT mode on "mysql" (step all)...

      at log (src/cli/commands/migrateRollback.ts:109:11)

    console.log
      Connected to mysql.

      at log (src/cli/commands/migrateRollback.ts:250:11)

    console.log
      Rolling back 1 migration(s)...

      at log (src/cli/commands/migrateRollback.ts:288:13)

    console.log
      
      0 migration(s) rolled back successfully.

      at log (src/cli/commands/migrateRollback.ts:359:13)

    console.log
      All database connections closed.

      at log (src/cli/commands/migrateRollback.ts:371:13)

    console.log
      
      Rolling back migrations in DEVELOPMENT mode on "mysql" (step all)...

      at log (src/cli/commands/migrateRollback.ts:109:11)

    console.log
      Connected to mysql.

      at log (src/cli/commands/migrateRollback.ts:250:11)

    console.log
      Rolling back 1 migration(s)...

      at log (src/cli/commands/migrateRollback.ts:288:13)

    console.log
      
      0 migration(s) rolled back successfully.

      at log (src/cli/commands/migrateRollback.ts:359:13)

    console.log
      All database connections closed.

      at log (src/cli/commands/migrateRollback.ts:371:13)

PASS src/lab_test/branch.coverage.100.phase7.make-migration.logic.test.ts
  ● Console

    console.log
      INFO: Models Path: /tmp/eloquent-phase7-make-migration-7u1psB/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-phase7-make-migration-7u1psB/migrations-root

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: pg_test

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-phase7-make-migration-7u1psB/migrations-root/pg_test

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      OK: Migration (CREATE) saved: /tmp/eloquent-phase7-make-migration-7u1psB/migrations-root/pg_test/20260316162141001_create_users_table.ts

      at log (src/cli/commands/makeMigration.ts:602:19)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

    console.log
      INFO: Models Path: /tmp/eloquent-phase7-make-migration-QuLI8x/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-phase7-make-migration-QuLI8x/migrations-root

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

    console.log
      INFO: Models Path: /tmp/eloquent-phase7-make-migration-rIBRUf/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-phase7-make-migration-rIBRUf/migrations-root

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: pg_test

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-phase7-make-migration-rIBRUf/migrations-root/pg_test

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      OK: Migration (UPDATE) saved: /tmp/eloquent-phase7-make-migration-rIBRUf/migrations-root/pg_test/20260316162141001_update_users_table.ts

      at log (src/cli/commands/makeMigration.ts:602:19)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

    console.log
      INFO: Models Path: /tmp/eloquent-phase7-make-migration-N2U1lm/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-phase7-make-migration-N2U1lm/migrations-root

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: pg_test

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-phase7-make-migration-N2U1lm/migrations-root/pg_test

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

    console.log
      INFO: Models Path: /tmp/eloquent-phase7-make-migration-N2U1lm/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-phase7-make-migration-N2U1lm/migrations-root

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: pg_test

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-phase7-make-migration-N2U1lm/migrations-root/pg_test

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      INFO: Baseline CREATE already exists - skipping duplicate CREATE migration.

      at log (src/cli/commands/makeMigration.ts:527:17)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

PASS src/lab_test/lts.phase5.residual-orm-mixins.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase20.dbseed.logic.test.ts
PASS src/lab_test/lts.phase5.make-model-coverage.logic.test.ts
  ● Console

    console.log
      📁 Models Path: /tmp/eloquent-lts-phase5-make-model-UITs00/models

      at log (src/cli/commands/makeModel.ts:194:11)

    console.log
      📁 Migrations Path: /tmp/eloquent-lts-phase5-make-model-UITs00/migrations

      at log (src/cli/commands/makeModel.ts:195:11)

    console.log
      ✅ Model created: /tmp/eloquent-lts-phase5-make-model-UITs00/models/GeoPhoto.ts

      at log (src/cli/commands/makeModel.ts:232:15)

    console.log
      Using connection: mongo_test

      at log (src/cli/commands/makeModel.ts:321:13)

    console.log
      Migrations Path: /tmp/eloquent-lts-phase5-make-model-UITs00/migrations/mongo_test

      at log (src/cli/commands/makeModel.ts:322:13)

    console.log
      All database connections closed.

      at log (src/cli/commands/makeModel.ts:424:15)

    console.log
      📁 Models Path: /tmp/eloquent-lts-phase5-make-model-sql-66EDQD/models

      at log (src/cli/commands/makeModel.ts:194:11)

    console.log
      📁 Migrations Path: /tmp/eloquent-lts-phase5-make-model-sql-66EDQD/migrations

      at log (src/cli/commands/makeModel.ts:195:11)

    console.log
      ✅ Model created: /tmp/eloquent-lts-phase5-make-model-sql-66EDQD/models/PostAudit.ts

      at log (src/cli/commands/makeModel.ts:232:15)

    console.log
      Using connection: pg_test

      at log (src/cli/commands/makeModel.ts:321:13)

    console.log
      Migrations Path: /tmp/eloquent-lts-phase5-make-model-sql-66EDQD/migrations/pg_test

      at log (src/cli/commands/makeModel.ts:322:13)

    console.log
      🧱 Migration (CREATE) created: /tmp/eloquent-lts-phase5-make-model-sql-66EDQD/migrations/pg_test/20260316162142_create_post_audits_table.ts

      at log (src/cli/commands/makeModel.ts:418:13)

    console.log
      All database connections closed.

      at log (src/cli/commands/makeModel.ts:424:15)

PASS src/lab_test/scenario.generated.model.instance.persistence.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase6.orm-branches.logic.test.ts
PASS src/lab_test/branch.coverage.70.cli-support-shared.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase10.core-model.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase21.cli-support-deep.logic.test.ts
PASS src/lab_test/lts.phase5.migrate-status-coverage.logic.test.ts
PASS src/lab_test/branch.coverage.70.cli-support.logic.test.ts
PASS src/lab_test/schema.relation.coverage.logic.test.ts
  ● Console

    console.log
      INFO: No schema differences for 'users'.

      at Function.log [as toCreateSQL] (src/core/schema/SchemaBuilder.ts:326:17)

    console.log
      INFO: No schema differences for 'users'.

      at Function.log [as toCreateSQL] (src/core/schema/SchemaBuilder.ts:326:17)

    console.log
      INFO: No schema differences for 'users'.

      at Function.log [as toCreateSQL] (src/core/schema/SchemaBuilder.ts:326:17)

    console.log
      INFO: No schema differences for 'users'.

      at Function.log [as toCreateSQL] (src/core/schema/SchemaBuilder.ts:326:17)

    console.log
      INFO: No schema differences for 'users'.

      at Function.log [as toCreateSQL] (src/core/schema/SchemaBuilder.ts:326:17)

    console.log
      INFO: No schema differences for 'users'.

      at Function.log [as toCreateSQL] (src/core/schema/SchemaBuilder.ts:326:17)

    console.log
      INFO: No schema differences for 'users'.

      at Function.log [as toCreateSQL] (src/core/schema/SchemaBuilder.ts:326:17)

PASS src/lab_test/migrate.rollback.partial.recovery.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase20.migrate-run.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase5.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase31.make-model-migration.helpers.logic.test.ts
  ● Console

    console.log
      INFO: Models Path: /tmp/eloquent-phase31-make-migration-RNpdJ2/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-phase31-make-migration-RNpdJ2/migrations-root

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: pg_test

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-phase31-make-migration-RNpdJ2/migrations-root/pg_test

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      OK: Migration (CREATE) saved: /tmp/eloquent-phase31-make-migration-RNpdJ2/migrations-root/pg_test/20260316162145001_create_users_table.ts

      at log (src/cli/commands/makeMigration.ts:602:19)

    console.log
      INFO: Using connection: pg_test

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-phase31-make-migration-RNpdJ2/migrations-root/pg_test

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      OK: Migration (CREATE) saved: /tmp/eloquent-phase31-make-migration-RNpdJ2/migrations-root/pg_test/20260316162145002_create_posts_table.ts

      at log (src/cli/commands/makeMigration.ts:602:19)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

    console.log
      📁 Models Path: /tmp/eloquent-phase31-make-model-5Z8q6o/models

      at log (src/cli/commands/makeModel.ts:194:11)

    console.log
      📁 Migrations Path: /tmp/eloquent-phase31-make-model-5Z8q6o/migrations-root

      at log (src/cli/commands/makeModel.ts:195:11)

    console.log
      ✅ Model created: /tmp/eloquent-phase31-make-model-5Z8q6o/models/User.ts

      at log (src/cli/commands/makeModel.ts:232:15)

    console.log
      Using connection: pg_test

      at log (src/cli/commands/makeModel.ts:321:13)

    console.log
      Migrations Path: /tmp/eloquent-phase31-make-model-5Z8q6o/migrations-root/pg_test

      at log (src/cli/commands/makeModel.ts:322:13)

    console.log
      🧱 Migration (CREATE) created: /tmp/eloquent-phase31-make-model-5Z8q6o/migrations-root/pg_test/20260316162145_create_users_table.ts

      at log (src/cli/commands/makeModel.ts:418:13)

    console.log
      All database connections closed.

      at log (src/cli/commands/makeModel.ts:424:15)

PASS src/lab_test/branch.coverage.100.phase14.schema-builder-deep.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase5.cache-hooks.logic.test.ts
PASS src/lab_test/make.migration.fk.logic.test.ts
  ● Console

    console.log
      INFO: Models Path: /tmp/eloquent-make-migration-fk-WIi2Yc/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-make-migration-fk-WIi2Yc/migrations-root

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: pg_test

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-make-migration-fk-WIi2Yc/migrations-root/pg_test

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      Schema diff -> +[user_id], -[-], +fk[fk:user_id:users:id], -fk[-]

      at Function.log [as toCreateSQL] (src/core/schema/SchemaBuilder.ts:386:17)

    console.log
      OK: Migration (UPDATE) saved: /tmp/eloquent-make-migration-fk-WIi2Yc/migrations-root/pg_test/20260316162146001_update_posts_table.ts

      at log (src/cli/commands/makeMigration.ts:602:19)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

    console.log
      INFO: Models Path: /tmp/eloquent-make-migration-fk-kwreY5/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-make-migration-fk-kwreY5/migrations-root

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: pg_test

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-make-migration-fk-kwreY5/migrations-root/pg_test

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      Schema diff -> +[deleted_at], -[-], +fk[-], -fk[-]

      at Function.log [as toCreateSQL] (src/core/schema/SchemaBuilder.ts:386:17)

    console.log
      OK: Migration (UPDATE) saved: /tmp/eloquent-make-migration-fk-kwreY5/migrations-root/pg_test/20260316162146001_update_users_table.ts

      at log (src/cli/commands/makeMigration.ts:602:19)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

    console.log
      INFO: Models Path: /tmp/eloquent-make-migration-fk-7P1blC/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-make-migration-fk-7P1blC/migrations-root

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: pg_test

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-make-migration-fk-7P1blC/migrations-root/pg_test

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      Schema diff -> +[user_id], -[-], +fk[fk:user_id:users:id], -fk[-]

      at Function.log [as toCreateSQL] (src/core/schema/SchemaBuilder.ts:386:17)

    console.log
      OK: Migration (UPDATE) saved: /tmp/eloquent-make-migration-fk-7P1blC/migrations-root/pg_test/20260316162146001_update_posts_table.ts

      at log (src/cli/commands/makeMigration.ts:602:19)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

    console.log
      INFO: Models Path: /tmp/eloquent-make-migration-fk-7P1blC/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-make-migration-fk-7P1blC/migrations-root

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: pg_test

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-make-migration-fk-7P1blC/migrations-root/pg_test

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      Schema diff -> +[user_id], -[-], +fk[fk:user_id:users:id], -fk[-]

      at Function.log [as toCreateSQL] (src/core/schema/SchemaBuilder.ts:386:17)

    console.log
      INFO: Migration unchanged: 20260316162146001_update_posts_table.ts

      at log (src/cli/commands/makeMigration.ts:597:19)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

PASS src/lab_test/lts.phase5.coremodel-coverage.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase11.make-migration.logic.test.ts
  ● Console

    console.log
      INFO: Models Path: /tmp/eloquent-phase11-make-migration-Tg8UcY/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-phase11-make-migration-Tg8UcY/migrations-root

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: pg_test

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-phase11-make-migration-Tg8UcY/migrations-root/pg_test

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      OK: Migration (CREATE) saved: /tmp/eloquent-phase11-make-migration-Tg8UcY/migrations-root/pg_test/20260316162147001_create_users_table.ts

      at log (src/cli/commands/makeMigration.ts:602:19)

    console.log
      INFO: Using connection: pg_test

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-phase11-make-migration-Tg8UcY/migrations-root/pg_test

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      OK: Migration (CREATE) saved: /tmp/eloquent-phase11-make-migration-Tg8UcY/migrations-root/pg_test/20260316162147002_create_posts_table.ts

      at log (src/cli/commands/makeMigration.ts:602:19)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

    console.log
      INFO: Models Path: /tmp/eloquent-phase11-make-migration-PtiFYA/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-phase11-make-migration-PtiFYA/migrations-root

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: pg_test

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-phase11-make-migration-PtiFYA/migrations-root/pg_test

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      OK: Migration (UPDATE) saved: /tmp/eloquent-phase11-make-migration-PtiFYA/migrations-root/pg_test/20260316162147001_update_users_table.ts

      at log (src/cli/commands/makeMigration.ts:602:19)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

PASS src/lab_test/branch.coverage.100.phase19.rollback-querycache-deep.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase32.cache-query-morph-redactor.logic.test.ts
PASS src/lab_test/migrate.run.logic.test.ts
PASS src/lab_test/migration.tracker.logic.test.ts
PASS src/lab_test/lts.phase5.basemodel-safefinder-statics-coverage.logic.test.ts
PASS src/lab_test/lts.phase5.belongs-to-many-coverage.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase38.make-factory.logic.test.ts
PASS src/lab_test/lts.phase5.factory-runtime-residual-coverage.logic.test.ts
PASS src/lab_test/make.migration.append.only.logic.test.ts
  ● Console

    console.log
      INFO: Models Path: /tmp/eloquent-make-migration-append-only-HdrIak/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-make-migration-append-only-HdrIak/migrations-root

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: pg_test

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-make-migration-append-only-HdrIak/migrations-root/pg_test

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      Schema diff -> +[user_id], -[-], +fk[fk:user_id:users:id], -fk[-]

      at Function.log [as toCreateSQL] (src/core/schema/SchemaBuilder.ts:386:17)

    console.log
      OK: Migration (UPDATE) saved: /tmp/eloquent-make-migration-append-only-HdrIak/migrations-root/pg_test/20260316162149001_update_posts_table.ts

      at log (src/cli/commands/makeMigration.ts:602:19)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

    console.log
      INFO: Models Path: /tmp/eloquent-make-migration-append-only-0O30SJ/models

      at log (src/cli/commands/makeMigration.ts:258:11)

    console.log
      INFO: Migrations Root: /tmp/eloquent-make-migration-append-only-0O30SJ/migrations-root

      at log (src/cli/commands/makeMigration.ts:259:11)

    console.log
      INFO: Using connection: pg_test

      at log (src/cli/commands/makeMigration.ts:357:15)

    console.log
      INFO: Migrations Path: /tmp/eloquent-make-migration-append-only-0O30SJ/migrations-root/pg_test

      at log (src/cli/commands/makeMigration.ts:358:15)

    console.log
      INFO: Baseline CREATE already exists - skipping duplicate CREATE migration.

      at log (src/cli/commands/makeMigration.ts:527:17)

    console.log
      INFO: All database connections closed.

      at log (src/cli/commands/makeMigration.ts:673:13)

    console.log
      OK: Migration generation complete in TEST mode.

      at log (src/cli/commands/makeMigration.ts:678:11)

PASS src/lab_test/db.seed.connection.env.logic.test.ts
PASS src/lab_test/orm.hardening.phase5.demo-scenario-operations.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase18.driver-and-querycache.logic.test.ts
PASS src/lab_test/nosql.phase13.native-morph-relations.logic.test.ts
PASS src/lab_test/nosql.phase4.validation-and-gates.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase34.cache-edge.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase29.cli-utils-status.logic.test.ts
PASS src/lab_test/generated.model.instance.persistence.cli.logic.test.ts
PASS src/lab_test/cli.integration.scenario.lifecycle.test.ts (27.443 s)
PASS src/lab_test/lts.phase5.make-factory-coverage-and-ascii.logic.test.ts
PASS src/lab_test/nosql.phase14.scenario-parity-and-morphable.logic.test.ts
PASS src/lab_test/eloquent.cli.commands.testing.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase9.schema-builder.logic.test.ts
  ● Console

    console.log
      INFO: No schema differences for 'posts'.

      at Function.log [as toCreateSQL] (src/core/schema/SchemaBuilder.ts:326:17)

PASS src/lab_test/branch.coverage.100.phase22.precheck-and-resolver.logic.test.ts
PASS src/lab_test/migrate.rollback.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase26.utilities-relations.logic.test.ts
  ● Console

    console.warn
      ⚠️  No tsconfig.json found. Using default compiler options.

      53 |     const configPath = ts.findConfigFile(projectRoot, ts.sys.fileExists, "tsconfig.json");
      54 |     if (!configPath) {
    > 55 |       console.warn(chalk.yellow("⚠️  No tsconfig.json found. Using default compiler options."));
         |               ^
      56 |       return this.compileWithDefaults(files, noEmit);
      57 |     }
      58 |

      at Function.warn [as compile] (src/cli/utils/typescript/TypeScriptCompiler.ts:55:15)
      at Object.<anonymous> (src/lab_test/branch.coverage.100.phase26.utilities-relations.logic.test.ts:123:23)

    console.log
      ✅ TypeScript (default config) compilation OK

      at Function.log [as compileWithDefaults] (src/cli/utils/typescript/TypeScriptCompiler.ts:117:13)

PASS src/lab_test/instance.persistence.layer.runtime.logic.test.ts
PASS src/lab_test/nosql.phase19.mixed-seeder-filtering.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase33.relations-tsruntime.logic.test.ts
PASS src/lab_test/lts.phase5.migrate-fresh-coverage.logic.test.ts
  ● Console

    console.log
      Connected to mongo.

      at log (src/cli/commands/migrateFresh.ts:44:15)

    console.log
      All collections dropped for mongo.

      at log (src/cli/commands/migrateFresh.ts:50:15)

    console.log
      All tables dropped. Re-running migrations...

      at log (src/cli/commands/migrateFresh.ts:152:11)

    console.log
      Connected to oracle.

      at log (src/cli/commands/migrateFresh.ts:55:13)

    console.log
      All tables dropped. Re-running migrations...

      at log (src/cli/commands/migrateFresh.ts:152:11)

    console.log
      Connected to mysql.

      at log (src/cli/commands/migrateFresh.ts:55:13)

    console.log
      All tables dropped for mysql.

      at log (src/cli/commands/migrateFresh.ts:100:13)

    console.log
      All tables dropped. Re-running migrations...

      at log (src/cli/commands/migrateFresh.ts:152:11)

PASS src/lab_test/cli.commands.help.test.ts (21.847 s)
PASS src/lab_test/migrate.run.empty.detection.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase8.cache-audit-runtime.logic.test.ts
  ● Console

    console.log
      [CacheManager] Initializing cache for environment: test

      at log (src/core/cache/setupCache.ts:10:11)

    console.log
      → Using MemoryCacheDriver (Default fallback)

      at log (src/core/cache/setupCache.ts:39:15)

    console.log
      cache:clear

      at log (src/cli/commands/cacheClear.ts:42:11)

    console.log
        registry keys: 0 -> 0

      at log (src/cli/commands/cacheClear.ts:43:11)

    console.log
        registry groups: 0 -> 0

      at log (src/cli/commands/cacheClear.ts:44:11)

    console.log
        analytics: reset

      at log (src/cli/commands/cacheClear.ts:45:11)

    console.log
        fallback chain clear: no-op

      at log (src/cli/commands/cacheClear.ts:50:13)

    console.log
        fallback chain shutdown: no-op

      at log (src/cli/commands/cacheClear.ts:54:13)

    console.log
      [CacheManager] Initializing cache for environment: test

      at log (src/core/cache/setupCache.ts:10:11)

    console.log
      → Using MemoryCacheDriver (Default fallback)

      at log (src/core/cache/setupCache.ts:39:15)

    console.log
      cache:clear

      at log (src/cli/commands/cacheClear.ts:42:11)

    console.log
        registry keys: 0 -> 0

      at log (src/cli/commands/cacheClear.ts:43:11)

    console.log
        registry groups: 0 -> 0

      at log (src/cli/commands/cacheClear.ts:44:11)

    console.log
        analytics: reset

      at log (src/cli/commands/cacheClear.ts:45:11)

    console.log
        fallback chain clear: driverA:fail

      at log (src/cli/commands/cacheClear.ts:50:13)

    console.log
        fallback chain shutdown: driverA:open

      at log (src/cli/commands/cacheClear.ts:54:13)

PASS src/lab_test/branch.coverage.100.phase30.fresh-rollback.logic.test.ts
  ● Console

    console.log
      
      WARNING: This will drop all tables in your database.

      at log (src/cli/commands/migrateFresh.ts:170:13)

    console.log
      This action cannot be undone.

      at log (src/cli/commands/migrateFresh.ts:171:13)

    console.log
      Connected to mongo.

      at log (src/cli/commands/migrateFresh.ts:44:15)

    console.log
      All collections dropped for mongo.

      at log (src/cli/commands/migrateFresh.ts:50:15)

    console.log
      All tables dropped. Re-running migrations...

      at log (src/cli/commands/migrateFresh.ts:152:11)

    console.log
      
      Rolling back migrations in DEVELOPMENT mode on "sqlite" (step 1)...

      at log (src/cli/commands/migrateRollback.ts:109:11)

    console.log
      Connected to sqlite.

      at log (src/cli/commands/migrateRollback.ts:250:11)

    console.log
      Rolling back 2 migration(s)...

      at log (src/cli/commands/migrateRollback.ts:288:13)

    console.log
      Reverting: 202603090001_update_users_table.ts

      at log (src/cli/commands/migrateRollback.ts:345:17)

    console.log
      Rolled back: 202603090001_update_users_table.ts

      at log (src/cli/commands/migrateRollback.ts:349:17)

    console.log
      Reverting: 202603090002_update_posts_table.ts

      at log (src/cli/commands/migrateRollback.ts:345:17)

    console.log
      Rolled back: 202603090002_update_posts_table.ts

      at log (src/cli/commands/migrateRollback.ts:349:17)

    console.log
      
      2 migration(s) rolled back successfully.

      at log (src/cli/commands/migrateRollback.ts:359:13)

    console.log
      All database connections closed.

      at log (src/cli/commands/migrateRollback.ts:371:13)

PASS src/lab_test/orm.hardening.phase4.real-model-read-persistence.logic.test.ts
PASS src/lab_test/migration.tracker.single-table.contract.logic.test.ts
PASS src/lab_test/orm.hardening.phase3.generated-app-test-model-stack.logic.test.ts
PASS src/lab_test/nosql.mongo.dns.runtime.logic.test.ts
PASS src/lab_test/orm.hardening.phase4.finder-eager-serialization.logic.test.ts
PASS src/lab_test/nosql.phase17.scenario-artifact-cache-reset.logic.test.ts
PASS src/lab_test/make.model.rollback.logic.test.ts
  ● Console

    console.log
      📁 Models Path: /tmp/eloquent-make-model-rollback-vvExAF/models

      at log (src/cli/commands/makeModel.ts:194:11)

    console.log
      📁 Migrations Path: /tmp/eloquent-make-model-rollback-vvExAF/migrations-root

      at log (src/cli/commands/makeModel.ts:195:11)

    console.log
      ✅ Model created: /tmp/eloquent-make-model-rollback-vvExAF/models/Post.ts

      at log (src/cli/commands/makeModel.ts:232:15)

    console.log
      Using connection: pg_test

      at log (src/cli/commands/makeModel.ts:321:13)

    console.log
      Migrations Path: /tmp/eloquent-make-model-rollback-vvExAF/migrations-root/pg_test

      at log (src/cli/commands/makeModel.ts:322:13)

    console.log
      🧱 Migration (UPDATE) created: /tmp/eloquent-make-model-rollback-vvExAF/migrations-root/pg_test/20260316162250_update_posts_table.ts

      at log (src/cli/commands/makeModel.ts:418:13)

    console.log
      All database connections closed.

      at log (src/cli/commands/makeModel.ts:424:15)

    console.log
      📁 Models Path: /tmp/eloquent-make-model-rollback-2VT2Bb/models

      at log (src/cli/commands/makeModel.ts:194:11)

    console.log
      📁 Migrations Path: /tmp/eloquent-make-model-rollback-2VT2Bb/migrations-root

      at log (src/cli/commands/makeModel.ts:195:11)

    console.log
      ✅ Model created: /tmp/eloquent-make-model-rollback-2VT2Bb/models/Post.ts

      at log (src/cli/commands/makeModel.ts:232:15)

    console.log
      Using connection: pg_test

      at log (src/cli/commands/makeModel.ts:321:13)

    console.log
      Migrations Path: /tmp/eloquent-make-model-rollback-2VT2Bb/migrations-root/pg_test

      at log (src/cli/commands/makeModel.ts:322:13)

    console.log
      🧱 Migration (UPDATE) created: /tmp/eloquent-make-model-rollback-2VT2Bb/migrations-root/pg_test/20260316162250_update_posts_table.ts

      at log (src/cli/commands/makeModel.ts:418:13)

    console.log
      All database connections closed.

      at log (src/cli/commands/makeModel.ts:424:15)

PASS src/lab_test/driver.adapter.logic.test.ts
PASS src/lab_test/orm.hardening.phase1.runtime.logic.test.ts
PASS src/lab_test/orm.hardening.phase1.coremodel-persistence-state.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase36.orm-mixins-and-adapter.logic.test.ts
PASS src/lab_test/nosql.phase15.cli-scenario-runtime.logic.test.ts
PASS src/lab_test/cli.integration.make-migration.targeting.test.ts (46.705 s)
PASS src/lab_test/nosql.phase8.demo-and-factory-status.logic.test.ts
PASS src/lab_test/lts.phase5.index-entrypoint-coverage.logic.test.ts
PASS src/lab_test/branch.coverage.70.dbseedfresh.logic.test.ts
PASS src/lab_test/lts.phase5.coverage-to-100.logic.test.ts
PASS src/lab_test/softdeletes.runtime.logic.test.ts
PASS src/lab_test/factory.display.ascii-normalization.logic.test.ts
PASS src/lab_test/cli.bootstrap.precheck.logic.test.ts
PASS src/lab_test/nosql.phase12.native-belongstomany.logic.test.ts
PASS src/lab_test/orm.hardening.phase4.hydrated-dirty-tracking.logic.test.ts
PASS src/lab_test/real.model.instance.persistence.integration.logic.test.ts
PASS src/lab_test/nosql.phase10.native-relations.logic.test.ts
PASS src/lab_test/nosql.mongodb.validation.logic.test.ts
PASS src/lab_test/orm.hardening.phase2.incompatible-artifact-routing.logic.test.ts
PASS src/lab_test/orm.hardening.phase3.template-inline-model-parity.logic.test.ts
PASS src/lab_test/nosql.phase18.public-mongomodel-and-scenario-seed.logic.test.ts
PASS src/lab_test/orm.hardening.phase5.scaffold-generators.logic.test.ts
PASS src/lab_test/connection.factory.race.logic.test.ts
  ● Console

    console.log
      Creating new mysql_test connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

    console.log
      Creating new mysql_test connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

    console.log
      Creating new mysql_test connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

    console.log
      Creating new mysql_test connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

    console.log
      Creating new mysql_test connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

    console.log
      Closed mysql_test connection.

      at log (src/core/connection/ConnectionFactory.ts:132:13)

    console.log
      Creating new mysql_test connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

PASS src/lab_test/lts.phase5.seed-bootstrap-precheck-coverage.logic.test.ts
PASS src/lab_test/hooks.registry.phase2.logic.test.ts
PASS src/lab_test/orm.hardening.phase4.safe-finder-restrictions.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase23.orm-mixins-extra.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase28.base-model.logic.test.ts
PASS src/lab_test/app.migration.path.logic.test.ts
PASS src/lab_test/cli.audit.trail.logic.test.ts
PASS src/lab_test/orm.hardening.phase4.softdelete-instance-state.logic.test.ts
PASS src/lab_test/migration.schema.ascii-normalization.logic.test.ts
PASS src/lab_test/lts.phase5.import-resolver-coverage.logic.test.ts
PASS src/lab_test/lts.phase5.cache-runtime-coverage.logic.test.ts
PASS src/lab_test/orm.hardening.phase1.coremodel-validation-events.logic.test.ts
PASS src/lab_test/orm.hardening.phase1.cli-production-guards.logic.test.ts
PASS src/lab_test/nosql.phase16.scenario-generator-type-parity.logic.test.ts
PASS src/lab_test/orm.hardening.phase1.cli-bootstrap.logic.test.ts
PASS src/lab_test/orm.hardening.phase2.scenario-morph-alias-targeting.logic.test.ts
PASS src/lab_test/orm.hardening.phase5.model-introspector.logic.test.ts
PASS src/lab_test/nosql.phase11.native-hasone.logic.test.ts
PASS src/lab_test/make.registry.logic.test.ts
PASS src/lab_test/lts.phase4.consumer-documentation-suite.logic.test.ts
PASS src/lab_test/lts.phase5.database-connection.coverage-and-ascii.logic.test.ts
PASS src/lab_test/lts.phase5.make-registry-coverage.logic.test.ts
PASS src/lab_test/repo.wide.mojibake.remediation.logic.test.ts
PASS src/lab_test/orm.hardening.phase5.file-writer.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase20.audit-trail.logic.test.ts
PASS src/lab_test/appsmoke.safe-finder.integration.logic.test.ts
PASS src/lab_test/package.surface.logic.test.ts
PASS src/lab_test/make.factory.package-import-rename.logic.test.ts
PASS src/lab_test/package.docs-and-examples.rename.logic.test.ts
PASS src/lab_test/lts.phase5.basemodel-coverage.logic.test.ts
PASS src/lab_test/orm.hardening.plan.logic.test.ts
PASS src/lab_test/lts.phase2.release-discipline.logic.test.ts
PASS src/lab_test/lts.phase3.compatibility-api-freeze.logic.test.ts
PASS src/lab_test/orm.hardening.phase1.cli-action-runtime.logic.test.ts
PASS src/lab_test/orm.hardening.phase5.scaffold-suffix-normalization.logic.test.ts
PASS src/lab_test/nosql.phase9.runtime-demo-factory-status.logic.test.ts
PASS src/lab_test/lts.phase5.migrate-reset-coverage-and-ascii.logic.test.ts
PASS src/lab_test/cache.commands.logic.test.ts
  ● Console

    console.log
      [CacheManager] Initializing cache for environment: development

      at log (src/core/cache/setupCache.ts:10:11)

    console.log
      → Using MemoryCacheDriver (Development)

      at log (src/core/cache/setupCache.ts:15:15)

    console.log
      cache:clear

      at log (src/cli/commands/cacheClear.ts:42:11)

    console.log
        registry keys: 1 -> 0

      at log (src/cli/commands/cacheClear.ts:43:11)

    console.log
        registry groups: 1 -> 0

      at log (src/cli/commands/cacheClear.ts:44:11)

    console.log
        analytics: reset

      at log (src/cli/commands/cacheClear.ts:45:11)

    console.log
        fallback driver: none

      at log (src/cli/commands/cacheClear.ts:56:13)

    console.log
      [CacheManager] Initializing cache for environment: development

      at log (src/core/cache/setupCache.ts:10:11)

    console.log
      → Using MemoryCacheDriver (Development)

      at log (src/core/cache/setupCache.ts:15:15)

    console.log
      cache:clear

      at log (src/cli/commands/cacheClear.ts:42:11)

    console.log
        registry keys: 0 -> 0

      at log (src/cli/commands/cacheClear.ts:43:11)

    console.log
        registry groups: 0 -> 0

      at log (src/cli/commands/cacheClear.ts:44:11)

    console.log
        analytics: reset

      at log (src/cli/commands/cacheClear.ts:45:11)

    console.log
        fallback chain clear: memcached:fail

      at log (src/cli/commands/cacheClear.ts:50:13)

    console.log
        fallback chain shutdown: memcached:open

      at log (src/cli/commands/cacheClear.ts:54:13)

    console.log
      [CacheManager] Initializing cache for environment: development

      at log (src/core/cache/setupCache.ts:10:11)

    console.log
      → Using MemoryCacheDriver (Development)

      at log (src/core/cache/setupCache.ts:15:15)

    console.log
      cache:clear

      at log (src/cli/commands/cacheClear.ts:42:11)

    console.log
        registry keys: 0 -> 0

      at log (src/cli/commands/cacheClear.ts:43:11)

    console.log
        registry groups: 0 -> 0

      at log (src/cli/commands/cacheClear.ts:44:11)

    console.log
        analytics: reset

      at log (src/cli/commands/cacheClear.ts:45:11)

    console.log
        fallback chain clear: no-op

      at log (src/cli/commands/cacheClear.ts:50:13)

    console.log
        fallback chain shutdown: no-op

      at log (src/cli/commands/cacheClear.ts:54:13)

PASS src/lab_test/factory.createMany.concurrency.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase12.template-engine.logic.test.ts
PASS src/lab_test/orm.hardening.phase1.cli-command-targets.logic.test.ts
PASS src/lab_test/dependency.audit.tracking.logic.test.ts
PASS src/lab_test/production.readiness.gates.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase1.logic.test.ts
PASS src/lab_test/safe.finder.api.contract.logic.test.ts
PASS src/lab_test/docs.production.presence.logic.test.ts
PASS src/lab_test/orm.hardening.phase2.artifact-compatibility-matrix.logic.test.ts
PASS src/lab_test/laravel.query-builder.contract.logic.test.ts
PASS src/lab_test/orderby.asc-desc.contract.logic.test.ts
PASS src/lab_test/cli.production.safety.logic.test.ts
PASS src/lab_test/lts.trust.building.plan.logic.test.ts
PASS src/lab_test/lts.phase5.cli-production-guards-coverage.logic.test.ts
PASS src/lab_test/orm.hardening.phase1.coremodel-safefinder-support.logic.test.ts
PASS src/lab_test/instance.persistence.layer.contract.logic.test.ts
PASS src/lab_test/serialization.basemodel.integration.logic.test.ts
PASS src/lab_test/sqlite.driver.replacement.logic.test.ts
  ● Console

    console.log
      Creating new sqlite_test connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

    console.log
      Closed sqlite_test connection.

      at log (src/core/connection/ConnectionFactory.ts:132:13)

    console.log
      Creating new sqlite_test connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

    console.log
      Closed sqlite_test connection.

      at log (src/core/connection/ConnectionFactory.ts:132:13)

PASS src/lab_test/serialization.basemodel.runtime.logic.test.ts
PASS src/lab_test/public.model.alias-and-entry.logic.test.ts
PASS src/lab_test/pivot.helper.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase13.schema-blueprint.logic.test.ts
PASS src/lab_test/db.user.role.separation.logic.test.ts
PASS src/lab_test/lts.phase1.versioning-support.foundation.logic.test.ts
PASS src/lab_test/orm.hardening.phase5.completion-review.logic.test.ts
PASS src/lab_test/orm.hardening.phase5.contract.logic.test.ts
PASS src/lab_test/lts.phase5.morphable-mixin.coverage-and-ascii.logic.test.ts
PASS src/lab_test/schema.default.string.escape.logic.test.ts
  ● Console

    console.log
      Schema diff -> +[title], -[-], +fk[-], -fk[-]

      at Function.log [as toCreateSQL] (src/core/schema/SchemaBuilder.ts:386:17)

PASS src/lab_test/orm.hardening.phase1.contract.logic.test.ts
PASS src/lab_test/ci.release.qualification.logic.test.ts
PASS src/lab_test/nosql.phase5.docs-release.logic.test.ts
PASS src/lab_test/orm.hardening.phase1.cli-scaffold-command-registration.logic.test.ts
PASS src/lab_test/hook.store.logic.test.ts
PASS src/lab_test/model.registration.phase3.logic.test.ts
PASS src/lab_test/lts.phase5.make-controller-coverage.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase27.connection-factory.logic.test.ts
  ● Console

    console.log
      Creating new mysql_test connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

    console.log
      Creating new mysql connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

    console.log
      Creating new mongo connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

    console.log
      Closed mysql connection.

      at log (src/core/connection/ConnectionFactory.ts:132:13)

    console.log
      Closed mongo connection.

      at log (src/core/connection/ConnectionFactory.ts:132:13)

    console.log
      Creating new pg_test connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

    console.log
      Closed pg_test connection.

      at log (src/core/connection/ConnectionFactory.ts:132:13)

PASS src/lab_test/lts.phase5.model-introspector-coverage.logic.test.ts
PASS src/lab_test/lts.phase5.make-service-coverage.logic.test.ts
PASS src/lab_test/orm.hardening.phase1.cli-migration-command-registration.logic.test.ts
PASS src/lab_test/nosql.full.integration.contract.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase37.connection-flags.logic.test.ts
PASS src/lab_test/orm.hardening.phase2.contract.logic.test.ts
PASS src/lab_test/orm.hardening.phase1.cli-seed-scenario-command-registration.logic.test.ts
PASS src/lab_test/orm.hardening.phase4.contract.logic.test.ts
PASS src/lab_test/orm.hardening.phase1.cli-make-artifact-command-registration.logic.test.ts
PASS src/lab_test/model.registry.logic.test.ts
PASS src/lab_test/orm.hardening.phase3.contract.logic.test.ts
PASS src/lab_test/orm.hardening.phase1.basemodel-safefinder-statics.logic.test.ts
PASS src/lab_test/lts.phase5.resolve-connection-flags-coverage.logic.test.ts
PASS src/lab_test/orm.hardening.phase1.checkpoint-review.logic.test.ts
PASS src/lab_test/orm.hardening.phase1.cli-support-command-registration.logic.test.ts
PASS src/lab_test/branch.coverage.100.plan.logic.test.ts
PASS src/lab_test/migration.files.integrity.logic.test.ts
PASS src/lab_test/cli.secret.redaction.logic.test.ts
PASS src/lab_test/lts.phase5.file-writer-coverage.logic.test.ts
PASS src/lab_test/morphable.mixin.logic.test.ts
PASS src/lab_test/branch.coverage.100.phase25.schema-builder-invariants.logic.test.ts
PASS src/lab_test/branch.coverage.70.plan.logic.test.ts
PASS src/lab_test/orm.hardening.phase1.cli-help-catalog.logic.test.ts
PASS src/lab_test/model.subpath.named-exports.logic.test.ts
PASS src/lab_test/orm.hardening.phase5.pack-smoke-tarball-staging.logic.test.ts
PASS src/lab_test/hooks.deprecation.phase4.logic.test.ts
PASS src/lab_test/ci.workflow.hardening.alignment.logic.test.ts
PASS src/lab_test/api.reference.refresh.logic.test.ts
PASS src/lab_test/coverage.source-scope.logic.test.ts
PASS src/lab_test/lts.phase5.artifact-routing-report-coverage.logic.test.ts
PASS src/lab_test/orm.hardening.phase3.tsruntime-transpile-fallback.logic.test.ts
PASS src/lab_test/orm.hardening.phase1.cli-presentation.logic.test.ts
PASS src/lab_test/pack.smoke.package-name-rename.logic.test.ts
PASS src/lab_test/lts.phase5.cli-command-targets-coverage.logic.test.ts
PASS src/lab_test/lts.phase5.scaffold-generator-support-coverage.logic.test.ts
PASS src/lab_test/orm.hardening.phase3.pack-smoke-generated-artifact-lifecycle.logic.test.ts
PASS src/lab_test/cli.integration.factory-status.targeting.test.ts (10.749 s)
PASS src/lab_test/test.suite.granularity.logic.test.ts
PASS src/lab_test/pack.smoke.root-export-surface.logic.test.ts
PASS src/lab_test/migrate.reset.cli-banner.contract.logic.test.ts
PASS src/lab_test/lts.phase5.artifact-compatibility-coverage.logic.test.ts
PASS src/lab_test/nosql.phase7.seed-smoke.logic.test.ts
PASS src/lab_test/mongo.connection.lifecycle.logic.test.ts
  ● Console

    console.log
      Creating new mongo connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

    console.log
      Connected to MongoDB: eloquentjs_db

      at log (src/core/connection/DatabaseConnection.ts:167:17)

    console.log
      Closed mongo connection.

      at log (src/core/connection/ConnectionFactory.ts:132:13)

    console.log
      Creating new mongo connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

    console.log
      Connected to MongoDB: eloquentjs_db

      at log (src/core/connection/DatabaseConnection.ts:167:17)

    console.log
      Closed mongo connection.

      at log (src/core/connection/ConnectionFactory.ts:132:13)

PASS src/lab_test/orm.hardening.phase5.pack-smoke-npm-cache.logic.test.ts
PASS src/lab_test/connection.factory.alias.lifecycle.logic.test.ts
  ● Console

    console.log
      Creating new mysql_test connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

    console.log
      Closed mysql_test connection.

      at log (src/core/connection/ConnectionFactory.ts:132:13)

    console.log
      Creating new mysql_test connection...

      at log (src/core/connection/ConnectionFactory.ts:32:11)

PASS src/lab_test/resolve.connection.name.logic.test.ts
PASS src/lab_test/app.model.fixture-fallback.logic.test.ts
PASS src/lab_test/orm.hardening.phase4.completion-review.logic.test.ts
PASS src/lab_test/orm.hardening.phase5.package-dist-whitelist.logic.test.ts
PASS src/lab_test/orm.hardening.phase3.completion-review.logic.test.ts
PASS src/lab_test/migration.append-only-and-dialect-fallback.logic.test.ts
PASS src/lab_test/template.cleanliness.logic.test.ts
PASS src/lab_test/eagerloading.getrelation.contract.logic.test.ts
PASS src/lab_test/pack.smoke.mongo.factory-status.visible-section.logic.test.ts
PASS src/lab_test/tsruntime.absolute-temp-load.logic.test.ts
PASS src/lab_test/orm.hardening.phase1.completion-review.logic.test.ts
PASS src/lab_test/orm.hardening.phase2.completion-review.logic.test.ts
PASS src/lab_test/cli.bootstrap.processenv.compatibility.logic.test.ts
PASS src/lab_test/app.model.dynamic-loading.logic.test.ts
PASS src/lab_test/cli.remaining.todo.test.ts

=============================== Coverage summary ===============================
Statements   : 99.98% ( 6289/6290 )
Branches     : 99.96% ( 3325/3326 )
Functions    : 100% ( 1031/1031 )
Lines        : 99.98% ( 5953/5954 )
================================================================================
Jest: "global" coverage threshold for statements (100%) not met: 99.98%
Jest: "global" coverage threshold for branches (100%) not met: 99.96%
Jest: "global" coverage threshold for lines (100%) not met: 99.98%

Test Suites: 1 skipped, 258 passed, 258 of 259 total
Tests:       25 skipped, 1134 passed, 1159 total
Snapshots:   0 total
Time:        451.87 s
Ran all test suites.
Error: Process completed with exit code 1.
0s
0s
1s
0s
