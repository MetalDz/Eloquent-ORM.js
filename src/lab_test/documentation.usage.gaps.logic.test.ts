import fs from "fs";
import path from "path";

describe("documentation usage gaps smoke coverage", () => {
  const rootDir = process.cwd();

  test("quick start and usage guides keep the required runtime command patterns", () => {
    const intro = fs.readFileSync(
      path.resolve(rootDir, "docs/introduction.mdx"),
      "utf8",
    );
    const installation = fs.readFileSync(
      path.resolve(rootDir, "docs/getting-started/installation.mdx"),
      "utf8",
    );
    const quickStart = fs.readFileSync(
      path.resolve(rootDir, "docs/getting-started/quick-start.mdx"),
      "utf8",
    );
    const usageGuides = fs.readFileSync(
      path.resolve(rootDir, "docs/getting-started/usage-guides.mdx"),
      "utf8",
    );

    expect(intro).toContain("TypeScript Eloquent ORM");
    expect(intro).toContain("Version: `1.0.0-rc.1`");
    expect(installation).toContain("npm install eloquent-orm.js express dotenv");
    expect(installation).toContain("## Full `.env` setup");
    expect(installation).toContain("## Quick `.env` key list");
    expect(installation).toContain("## `.env` constant reference");
    expect(installation).toContain("Do not put multiple connection names in the same env variable.");
    expect(installation).toContain("ELOQUENT_DB_ROLE=runtime");
    expect(installation).toContain("APP_ENV=development");
    expect(installation).toContain("APP_ENV=production");
    expect(installation).toContain("ELOQUENT_DB_ROLE=migration");
    expect(installation).toContain("`DB_CONNECTION`: default application connection.");
    expect(installation).toContain("`DB_HOST`: MySQL host or IP for runtime traffic.");
    expect(installation).toContain("`PG_HOST`: PostgreSQL host or IP for runtime traffic.");
    expect(installation).toContain("`SQLITE_PATH`: file path for the runtime SQLite database.");
    expect(installation).toContain("`MONGO_URI`: MongoDB connection string for the runtime database.");
    expect(installation).toContain("`MEMCACHED_HOST`: Memcached host or IP used in production cache mode.");
    expect(installation).toContain("MEMCACHED_HOST=127.0.0.1");
    expect(installation).toContain("MEMCACHED_PORT=11211");
    expect(installation).toContain("CACHE_DIR=.cache");
    expect(installation).toContain("MONGO_TEST_DB=eloquent_app_test");
    expect(quickStart).toContain("eloquent make:model Post --with-migration");
    expect(quickStart).toContain("eloquent make:service Post");
    expect(quickStart).toContain("eloquent make:controller Post");
    expect(quickStart).toContain("eloquent make:migration --all");
    expect(quickStart).toContain("eloquent migrate:run --test --all-migrations");
    expect(quickStart).toContain("eloquent db:seed --test --class BlogScenarioSeeder");
    expect(quickStart).toContain("npm install eloquent-orm.js express dotenv");
    expect(quickStart).toContain("DB_CONNECTION=sqlite");
    expect(quickStart).toContain("Express.js");
    expect(quickStart).toContain("registerModels([User, Post]);");

    expect(usageGuides).toContain("const created = await new User().create");
    expect(usageGuides).toContain("const byId = await new User().find(1);");
    expect(usageGuides).toContain('const byEmail = await User.findOneBy("email", "alice@example.com");');
    expect(usageGuides).toContain('orderBy("created_at", "desc")');
    expect(usageGuides).toContain("const newestUser = await User.orderBy(\"created_at\", \"desc\").first();");
    expect(usageGuides).toContain("Patch existing record:");
    expect(usageGuides).toContain("await model.restore?.(1);");
    expect(usageGuides).toContain("Use cache at the service boundary, not in controllers.");
    expect(usageGuides).toContain("MEMCACHED_HOST=127.0.0.1");
    expect(usageGuides).toContain("MEMCACHED_PORT=11211");
    expect(usageGuides).toContain("CACHE_DIR=.cache");
    expect(usageGuides).toContain("`APP_ENV=production`: Memcached, then file cache, then memory cache");
    expect(usageGuides).toContain("eloquent cache:stats");
    expect(usageGuides).toContain("See the full contract in [Multi-Connection Strategy](../orm/multi-connection-strategy).");
  });

  test("cli docs describe explicit generator and utility outcomes", () => {
    const generators = fs.readFileSync(
      path.resolve(rootDir, "docs/cli/generators.mdx"),
      "utf8",
    );
    const commands = fs.readFileSync(
      path.resolve(rootDir, "docs/cli/commands.mdx"),
      "utf8",
    );
    const controllers = fs.readFileSync(
      path.resolve(rootDir, "docs/getting-started/controllers.mdx"),
      "utf8",
    );
    const services = fs.readFileSync(
      path.resolve(rootDir, "docs/getting-started/services.mdx"),
      "utf8",
    );

    expect(generators).toContain("src/app/controllers/<Name>Controller.ts");
    expect(generators).toContain("src/app/services/<Name>Service.ts");
    expect(generators).toContain("restore");
    expect(commands).toContain("`make:controller`: generate an Express-oriented CRUD controller");
    expect(commands).toContain("`make:service`: generate a service layer around model CRUD");
    expect(commands).toContain("`cache:stats`: inspect runtime cache activity");
    expect(commands).toContain("`cache:clear`: clear cache keys and registry state");
    expect(controllers).toContain("eloquent make:controller User --soft");
    expect(controllers).toContain("app.patch(\"/users/:id/restore\", controller.restore.bind(controller));");
    expect(controllers).toContain("Keep cache logic in the service layer.");
    expect(services).toContain("eloquent make:service User");
    expect(services).toContain("`load()` and `with()` require explicit relation methods on the model instance");
    expect(services).toContain("Wrap read methods with cache lookups and invalidate keys after writes.");
  });

  test("scenario, cookbook, mixin, and soft delete docs stay published", () => {
    const commonScenarios = fs.readFileSync(
      path.resolve(rootDir, "docs/getting-started/common-scenarios.mdx"),
      "utf8",
    );
    const cookbook = fs.readFileSync(
      path.resolve(rootDir, "docs/getting-started/cookbook.mdx"),
      "utf8",
    );
    const mixinScenarios = fs.readFileSync(
      path.resolve(rootDir, "docs/orm/mixin-scenarios.mdx"),
      "utf8",
    );
    const multiConnection = fs.readFileSync(
      path.resolve(rootDir, "docs/orm/multi-connection-strategy.mdx"),
      "utf8",
    );
    const softDeletes = fs.readFileSync(
      path.resolve(rootDir, "docs/orm/soft-deletes.mdx"),
      "utf8",
    );
    const productionSafety = fs.readFileSync(
      path.resolve(rootDir, "docs/cli/production-safety.mdx"),
      "utf8",
    );
    const indexDoc = fs.readFileSync(
      path.resolve(rootDir, "docs/index.mdx"),
      "utf8",
    );
    const packageDocs = fs.readFileSync(
      path.resolve(rootDir, "docs/getting-started/package-docs.mdx"),
      "utf8",
    );
    const docsConfig = fs.readFileSync(path.resolve(rootDir, "docs.json"), "utf8");

    expect(commonScenarios).toContain("Scenario 1: First SQL CRUD API");
    expect(commonScenarios).toContain("Scenario 2: Mongo document app");
    expect(commonScenarios).toContain("Scenario 5: Cache GET endpoints");
    expect(cookbook).toContain("Recipe 1: SQL User CRUD API");
    expect(cookbook).toContain("Recipe 4: Soft Delete Admin Restore Flow");
    expect(cookbook).toContain("Recipe 5: Cache-First Dashboard Service");
    expect(multiConnection).toContain("This ORM supports multiple named connections in one app");
    expect(multiConnection).toContain("DB_CONNECTION=mysql,pg");
    expect(multiConnection).toContain("static connectionName = \"mysql\"");
    expect(multiConnection).toContain("static connectionName = \"mongo\"");
    expect(multiConnection).toContain("`--all-connections` is SQL-only by design");
    expect(productionSafety).toContain("APP_ENV=development");
    expect(productionSafety).toContain("APP_ENV=production");
    expect(productionSafety).toContain("ELOQUENT_DB_ROLE=runtime");
    expect(productionSafety).toContain("ELOQUENT_DB_ROLE=migration");
    expect(productionSafety).toContain("Do not set `APP_ENV=production` on your local machine unless you are intentionally validating production safety behavior.");
    expect(mixinScenarios).toContain("## SoftDeletes");
    expect(mixinScenarios).toContain("## EagerLoading");
    expect(mixinScenarios).toContain("## PivotHelper");
    expect(mixinScenarios).toContain("schema relation metadata alone does not make `load()` or `with()` available");
    expect(softDeletes).toContain("When `delete()` is soft");
    expect(softDeletes).toContain("restore()");
    expect(softDeletes).toContain("forceDelete()");
    expect(productionSafety).toContain("cache:stats");
    expect(productionSafety).toContain("cache:clear");
    expect(productionSafety).toContain("clear cache after fresh rebuilds, restore tests, or seed resets if stale reads are suspected");
    expect(indexDoc).toContain("Version: `1.0.0-rc.1`");
    expect(indexDoc).toContain("orm/multi-connection-strategy");
    expect(indexDoc).toContain("orm/soft-deletes");
    expect(indexDoc).toContain("getting-started/cookbook");
    expect(packageDocs).toContain("Version: `1.0.0-rc.1`");
    expect(packageDocs).toContain("../orm/multi-connection-strategy");
    expect(packageDocs).toContain("../orm/soft-deletes");
    expect(packageDocs).toContain("./common-scenarios");
    expect(packageDocs).toContain("./controllers");
    expect(packageDocs).toContain("./services");
    expect(docsConfig).toContain('"orm/soft-deletes"');
    expect(docsConfig).toContain('"orm/multi-connection-strategy"');
    expect(docsConfig).toContain('"getting-started/common-scenarios"');
    expect(docsConfig).toContain('"getting-started/cookbook"');
    expect(docsConfig).toContain('"orm/mixin-scenarios"');
  });
});
