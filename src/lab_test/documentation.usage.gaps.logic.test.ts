import fs from "fs";
import path from "path";

describe("documentation usage gaps smoke coverage", () => {
  const rootDir = process.cwd();
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(rootDir, "package.json"), "utf8"),
  ) as { name?: string; version?: string };
  const packageName = packageJson.name ?? "@alpha.consultings/eloquent-orm.js";
  const packageVersion = packageJson.version ?? "1.0.0";

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
    const querying = fs.readFileSync(
      path.resolve(rootDir, "docs/api/querying.mdx"),
      "utf8",
    );
    const usageGuides = fs.readFileSync(
      path.resolve(rootDir, "docs/getting-started/usage-guides.mdx"),
      "utf8",
    );

    expect(intro).toContain("TypeScript Eloquent ORM");
    expect(intro).toContain(`Version: \`${packageVersion}\``);
    expect(installation).toContain(`npm install ${packageName} express`);
    expect(installation).toContain("`dotenv` and `@faker-js/faker` stay in the package runtime dependencies");
    expect(installation).toContain("npm install dotenv @faker-js/faker");
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
    expect(quickStart).toContain(`npm install ${packageName} express`);
    expect(quickStart).toContain("`dotenv` and `@faker-js/faker` are already included by the package runtime.");
    expect(quickStart).toContain("npm install dotenv @faker-js/faker");
    expect(quickStart).toContain("DB_CONNECTION=sqlite");
    expect(quickStart).toContain("Express.js");
    expect(quickStart).toContain("registerModels([User, Post]);");
    expect(quickStart).toContain("const created = await Post.create({ title: \"Hello ORM JS\" });");
    expect(quickStart).toContain("const found = await Post.find(created.id as number);");
    expect(quickStart).toContain("found.update({ title: \"Hello ORM JS Updated\" });");
    expect(quickStart).toContain("await Post.deleteById(created.id as number);");
    expect(quickStart).toContain("await deleted.restore();");
    expect(quickStart).not.toContain("await new Post().create");
    expect(quickStart).not.toContain("found.fill({ title: \"Hello ORM JS Updated\" });");
    expect(quickStart).not.toContain("await new Post().delete");
    expect(quickStart).not.toContain("await model.restore?.(1);");
    expect(querying).toContain("## Important: query contract");
    expect(querying).toContain("<summary><strong>Filtered collection reads</strong></summary>");
    expect(querying).toContain("<summary><strong>Eager loading</strong></summary>");
    expect(querying).toContain("const rows = await User.where(\"status\", \"active\")");
    expect(querying).toContain("const active = await User.active().first();");

    expect(usageGuides).toContain("const created = await User.create");
    expect(usageGuides).toContain("### Important: runtime querying contract");
    expect(usageGuides).toContain("<summary><strong>Single-record reads</strong></summary>");
    expect(usageGuides).toContain("<summary><strong>Eager loading with <code>with(...)</code> and <code>load(...)</code></strong></summary>");
    expect(usageGuides).toContain("const active = await User.active().first();");
    expect(usageGuides).toContain("return (new User()).with(\"posts\", \"profile\").find(id);");
    expect(usageGuides).toContain("const byId = await User.find(1);");
    expect(usageGuides).toContain('const byEmail = await User.findOneBy("email", "alice@example.com");');
    expect(usageGuides).toContain('orderBy("created_at", "desc")');
    expect(usageGuides).toContain("const newestUser = await User.orderBy(\"created_at\", \"desc\").first();");
    expect(usageGuides).toContain("### Important: runtime CRUD contract");
    expect(usageGuides).toContain("<summary><strong>Create: insert a new record</strong></summary>");
    expect(usageGuides).toContain("<summary><strong>Patch: partial update on a persisted instance</strong></summary>");
    expect(usageGuides).toContain("<summary><strong>Recommended service-layer CRUD pattern</strong></summary>");
    expect(usageGuides).toContain("user.update({ name: \"Alice Updated\" });");
    expect(usageGuides).toContain("await user.delete();");
    expect(usageGuides).toContain("await trashed.restore();");
    expect(usageGuides).toContain("await User.updateById(1, {");
    expect(usageGuides).toContain("await User.deleteById(1);");
    expect(usageGuides).toContain("await User.restoreById(1);");
    expect(usageGuides).toContain("const createdMany = await User.createMany([");
    expect(usageGuides).toContain("await User.updateMany([1, 2], { status: \"inactive\" });");
    expect(usageGuides).toContain("await User.patchMany([");
    expect(usageGuides).toContain("await User.deleteMany([1, 2]);");
    expect(usageGuides).toContain("await User.restoreMany([1, 2]);");
    expect(usageGuides).not.toContain("await new User().update(1, {");
    expect(usageGuides).not.toContain("await new User().delete(1);");
    expect(usageGuides).not.toContain("await model.restore?.(1);");
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
    expect(controllers).toContain("services use `User.find(...)`, `User.create(...)`");
    expect(controllers).toContain("return User.deleteById(id);");
    expect(controllers).toContain("return User.restoreById(id);");
    expect(services).toContain("eloquent make:service User");
    expect(services).toContain("`load()` and `with()` require explicit relation methods on the model instance");
    expect(services).toContain("Wrap read methods with cache lookups and invalidate keys after writes.");
    expect(services).toContain("return User.create(data);");
    expect(services).toContain("const user = await User.find(id);");
    expect(services).toContain("user.update(data);");
    expect(services).toContain("return User.deleteById(id);");
    expect(services).toContain("return User.restoreById(id);");
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
    const runtimeIndex = fs.readFileSync(
      path.resolve(rootDir, "docs/runtime/index.mdx"),
      "utf8",
    );
    const runtimeCrud = fs.readFileSync(
      path.resolve(rootDir, "docs/runtime/crud.mdx"),
      "utf8",
    );
    const runtimeQuerying = fs.readFileSync(
      path.resolve(rootDir, "docs/runtime/querying.mdx"),
      "utf8",
    );
    const runtimeModels = fs.readFileSync(
      path.resolve(rootDir, "docs/runtime/models.mdx"),
      "utf8",
    );
    const runtimeControllers = fs.readFileSync(
      path.resolve(rootDir, "docs/runtime/controllers.mdx"),
      "utf8",
    );
    const runtimeServices = fs.readFileSync(
      path.resolve(rootDir, "docs/runtime/services.mdx"),
      "utf8",
    );
    const runtimeCache = fs.readFileSync(
      path.resolve(rootDir, "docs/runtime/cache.mdx"),
      "utf8",
    );
    const testIndex = fs.readFileSync(
      path.resolve(rootDir, "docs/test/index.mdx"),
      "utf8",
    );
    const testJestRuntime = fs.readFileSync(
      path.resolve(rootDir, "docs/test/jest-runtime.mdx"),
      "utf8",
    );
    const testFactoriesSeeds = fs.readFileSync(
      path.resolve(rootDir, "docs/test/factories-seeds.mdx"),
      "utf8",
    );
    const testScenarios = fs.readFileSync(
      path.resolve(rootDir, "docs/test/scenarios.mdx"),
      "utf8",
    );
    const testCliPackSmoke = fs.readFileSync(
      path.resolve(rootDir, "docs/test/cli-pack-smoke.mdx"),
      "utf8",
    );
    const docsConfig = fs.readFileSync(path.resolve(rootDir, "mint.json"), "utf8");

    expect(commonScenarios).toContain("Scenario 1: First SQL CRUD API");
    expect(commonScenarios).toContain("Scenario 2: Mongo document app");
    expect(commonScenarios).toContain("Scenario 5: Cache GET endpoints");
    expect(commonScenarios).toContain("const created = await User.create({");
    expect(commonScenarios).toContain("const found = await User.find(created.id as number);");
    expect(commonScenarios).toContain("found.update({ name: \"Alice Updated\" });");
    expect(commonScenarios).toContain("await User.updateMany([1, 2], { status: \"inactive\" });");
    expect(commonScenarios).toContain("const created = await User.create(data);");
    expect(commonScenarios).toContain("const user = await User.find(id);");
    expect(cookbook).toContain("Recipe 1: SQL User CRUD API");
    expect(cookbook).toContain("Recipe 4: Soft Delete Admin Restore Flow");
    expect(cookbook).toContain("Recipe 5: Cache-First Dashboard Service");
    expect(cookbook).toContain("return User.create(data);");
    expect(cookbook).toContain("return User.deleteById(id);");
    expect(cookbook).toContain("await user.restore();");
    expect(cookbook).toContain("await Post.updateById(id, { published: true });");
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
    expect(softDeletes).toContain("await user.delete();");
    expect(softDeletes).toContain("await user.restore();");
    expect(productionSafety).toContain("cache:stats");
    expect(productionSafety).toContain("cache:clear");
    expect(productionSafety).toContain("clear cache after fresh rebuilds, restore tests, or seed resets if stale reads are suspected");
    expect(indexDoc).toContain(`Version: \`${packageVersion}\``);
    expect(indexDoc).toContain("runtime/index");
    expect(indexDoc).toContain("runtime/crud");
    expect(indexDoc).toContain("runtime/controllers");
    expect(indexDoc).toContain("runtime/services");
    expect(indexDoc).toContain("test/index");
    expect(indexDoc).toContain("orm/multi-connection-strategy");
    expect(indexDoc).toContain("orm/soft-deletes");
    expect(indexDoc).toContain("getting-started/cookbook");
    expect(packageDocs).toContain(`Version: \`${packageVersion}\``);
    expect(packageDocs).toContain("../runtime/index");
    expect(packageDocs).toContain("../runtime/crud");
    expect(packageDocs).toContain("../runtime/querying");
    expect(packageDocs).toContain("../runtime/controllers");
    expect(packageDocs).toContain("../runtime/services");
    expect(packageDocs).toContain("../test/index");
    expect(packageDocs).toContain("../test/jest-runtime");
    expect(packageDocs).toContain("../test/factories-seeds");
    expect(packageDocs).toContain("../test/scenarios");
    expect(packageDocs).toContain("../test/cli-pack-smoke");
    expect(packageDocs).toContain("../orm/multi-connection-strategy");
    expect(packageDocs).toContain("../orm/soft-deletes");
    expect(packageDocs).toContain("./common-scenarios");
    expect(packageDocs).toContain("./controllers");
    expect(packageDocs).toContain("./services");
    expect(runtimeIndex).toContain("[Runtime CRUD](./crud)");
    expect(runtimeIndex).toContain("[Runtime Querying](./querying)");
    expect(runtimeIndex).toContain("[Runtime Controllers](./controllers)");
    expect(runtimeIndex).toContain("[Runtime Services](./services)");
    expect(runtimeIndex).toContain("User.createMany(...)");
    expect(runtimeCrud).toContain("Use one of these two creation paths:");
    expect(runtimeCrud).toContain("const created = await User.create({");
    expect(runtimeCrud).toContain("found.update({ name: \"Alice Updated\" });");
    expect(runtimeCrud).toContain("const createdMany = await User.createMany([");
    expect(runtimeCrud).toContain("await User.updateMany([1, 2], { status: \"inactive\" });");
    expect(runtimeCrud).toContain("await User.deleteMany([1, 2]);");
    expect(runtimeCrud).toContain("await User.restoreMany([1, 2]);");
    expect(runtimeCrud).toContain("await User.updateById(1, { name: \"Alice Direct\" });");
    expect(runtimeCrud).toContain("Do not treat these as the primary public teaching path:");
    expect(runtimeQuerying).toContain("const byId = await User.find(1);");
    expect(runtimeQuerying).toContain("const allUsers = await new User().all();");
    expect(runtimeModels).toContain("MySQL: conventional production web-app default");
    expect(runtimeModels).toContain("Mongo models");
    expect(runtimeControllers).toContain("Controllers are the HTTP edge of the runtime.");
    expect(runtimeControllers).toContain("User.deleteById(...)");
    expect(runtimeServices).toContain("Services are the main application boundary for runtime behavior.");
    expect(runtimeServices).toContain("return User.create(data);");
    expect(runtimeServices).toContain("return User.createMany(rows);");
    expect(runtimeServices).toContain("return User.restoreById(id);");
    expect(runtimeCache).toContain("MEMCACHED_HOST=127.0.0.1");
    expect(runtimeCache).toContain("const created = await User.create(data);");
    expect(testIndex).toContain("Jest unit and logic tests");
    expect(testIndex).toContain("[Factories and seeds](./factories-seeds)");
    expect(testJestRuntime).toContain("npm run test:coverage");
    expect(testFactoriesSeeds).toContain("eloquent make:factory User --test");
    expect(testFactoriesSeeds).toContain("eloquent db:seed --test --class BlogScenarioSeeder");
    expect(testScenarios).toContain("eloquent make:scenario blog --test --controllers --services --run --force");
    expect(testScenarios).toContain("eloquent demo:scenario --test --random");
    expect(testCliPackSmoke).toContain("npm run test:pack-smoke");
    expect(testCliPackSmoke).toContain("[CLI Test Matrix](../cli/test-matrix)");
    expect(docsConfig).toContain('"theme": "mint"');
    expect(docsConfig).toContain('"orm/soft-deletes"');
    expect(docsConfig).toContain('"orm/multi-connection-strategy"');
    expect(docsConfig).toContain('"runtime/index"');
    expect(docsConfig).toContain('"runtime/crud"');
    expect(docsConfig).toContain('"runtime/querying"');
    expect(docsConfig).toContain('"runtime/models"');
    expect(docsConfig).toContain('"runtime/controllers"');
    expect(docsConfig).toContain('"runtime/services"');
    expect(docsConfig).toContain('"runtime/cache"');
    expect(docsConfig).toContain('"test/index"');
    expect(docsConfig).toContain('"test/jest-runtime"');
    expect(docsConfig).toContain('"test/factories-seeds"');
    expect(docsConfig).toContain('"test/scenarios"');
    expect(docsConfig).toContain('"test/cli-pack-smoke"');
    expect(docsConfig).toContain('"getting-started/common-scenarios"');
    expect(docsConfig).toContain('"getting-started/cookbook"');
    expect(docsConfig).toContain('"orm/mixin-scenarios"');
  });
});
