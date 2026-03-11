import fs from "fs";
import path from "path";
import chalk from "chalk";
import { PathMap } from "../utils/PathMap";
import { makeFactory } from "./makeFactory";
import { makeController } from "./makeController";
import { makeService } from "./makeService";
import { makeMigration } from "./makeMigration";
import { migrateFresh } from "./migrateFresh";
import { dbSeed } from "./dbSeed";
import { ImportResolver } from "../utils/ImportResolver";
import { resolveConnectionNamesFromFlags } from "../utils/resolveConnectionFlags";
import type { ConnectionName } from "../../core/connection/ConnectionFactory";
import { resolveConnectionName } from "../../core/connection/resolveConnectionName";

type ScenarioOptions = {
  test?: boolean;
  mongo?: boolean;
  controllers?: boolean;
  services?: boolean;
  run?: boolean;
  force?: boolean;
  preset?: string;
};

type ModelSpec = {
  name: string;
  table: string;
  attrs: string[];
  schemaLines: string[];
};

type ScenarioPreset = {
  id: string;
  description: string;
  models: ModelSpec[];
  seedName: string;
  seedBody: string[];
};

type ScenarioManifest = {
  presetId: string;
  generatedAt: string;
  models: string[];
  seedName: string;
};

function renderModel(
  spec: ModelSpec,
  options: { isTest: boolean; useMongo: boolean; defaultConnectionName: string }
): string {
  const attrs = spec.attrs.map((line) => `  ${line}`).join("\n");
  const schema = spec.schemaLines.map((line) => `    ${line}`).join("\n");
  const coreImportPath = ImportResolver.coreImportPath(options.isTest);
  const schemaImportPath = ImportResolver.schemaImportPath(options.isTest);
  const modelBaseClass = options.useMongo ? "MongoModel" : "SqlModel";
  const connectionExpr = options.useMongo
    ? `"${options.defaultConnectionName}"`
    : `process.env.DB_CONNECTION ?? "${options.defaultConnectionName}"`;

  return `/**
 * Auto-generated Test Model
 * Model: ${spec.name}
 * Table: ${spec.table}
 */

import { ${modelBaseClass}, ModelInstance } from "${coreImportPath}";
import { column, validate } from "${schemaImportPath}";

type ${spec.name}Attrs = {
${attrs}
};

export class ${spec.name} extends ${modelBaseClass}<${spec.name}Attrs> {
  static tableName = "${spec.table}";
  static connectionName = ${connectionExpr};
  static morphAlias = "${spec.table}";

  static schema = {
${schema}
  };

  constructor() {
    super("${spec.table}", ${connectionExpr});
  }
}

export interface ${spec.name} extends ModelInstance<${spec.name}Attrs> {}
`;
}

function writeModelFile(
  modelDir: string,
  spec: ModelSpec,
  force: boolean,
  renderOptions: { isTest: boolean; useMongo: boolean; defaultConnectionName: string }
): void {
  const filePath = path.join(modelDir, `${spec.name}.ts`);
  if (fs.existsSync(filePath) && !force) {
    console.log(chalk.yellow(`Model exists (skipped): ${filePath}`));
    return;
  }
  fs.writeFileSync(filePath, renderModel(spec, renderOptions), "utf8");
  console.log(chalk.green(`Model created: ${filePath}`));
}

const blogPreset: ScenarioPreset = {
  id: "blog",
  description: "Users, Posts, Comments (morph), Favorites pivot",
  models: [
    {
      name: "User",
      table: "users",
      attrs: [
        "id?: number | null;",
        "name?: string | null;",
        "created_at?: string | Date | null;",
        "updated_at?: string | Date | null;",
      ],
      schemaLines: [
        "id: column(\"increments\", undefined, { primary: true }),",
        "name: validate(column(\"string\", 255), { required: true, min: 3 }),",
        "created_at: column(\"timestamp\"),",
        "updated_at: column(\"timestamp\"),",
        "",
        "posts: {",
        "  kind: \"relation\",",
        "  relation: \"hasMany\",",
        "  model: \"Post\",",
        "  options: { foreignKey: \"user_id\" },",
        "},",
        "favorites: {",
        "  kind: \"relation\",",
        "  relation: \"belongsToMany\",",
        "  model: \"Post\",",
        "  options: {},",
        "},",
        "comments: {",
        "  kind: \"relation\",",
        "  relation: \"morphMany\",",
        "  model: \"Comment\",",
        "  options: { morphName: \"commentable\" },",
        "},",
      ],
    },
    {
      name: "Post",
      table: "posts",
      attrs: [
        "id?: number | null;",
        "name?: string | null;",
        "user_id?: number | null;",
        "created_at?: string | Date | null;",
        "updated_at?: string | Date | null;",
      ],
      schemaLines: [
        "id: column(\"increments\", undefined, { primary: true }),",
        "name: validate(column(\"string\", 255), { required: true, min: 3 }),",
        "user_id: column(\"int\", undefined, { notNull: true }),",
        "created_at: column(\"timestamp\"),",
        "updated_at: column(\"timestamp\"),",
        "",
        "author: {",
        "  kind: \"relation\",",
        "  relation: \"belongsTo\",",
        "  model: \"User\",",
        "  options: { foreignKey: \"user_id\" },",
        "},",
        "favoritedBy: {",
        "  kind: \"relation\",",
        "  relation: \"belongsToMany\",",
        "  model: \"User\",",
        "  options: {},",
        "},",
        "comments: {",
        "  kind: \"relation\",",
        "  relation: \"morphMany\",",
        "  model: \"Comment\",",
        "  options: { morphName: \"commentable\" },",
        "},",
      ],
    },
    {
      name: "Comment",
      table: "comments",
      attrs: [
        "id?: number | null;",
        "name?: string | null;",
        "commentable_id?: number | null;",
        "commentable_type?: string | null;",
        "created_at?: string | Date | null;",
        "updated_at?: string | Date | null;",
      ],
      schemaLines: [
        "id: column(\"increments\", undefined, { primary: true }),",
        "name: validate(column(\"string\", 255), { required: true, min: 3 }),",
        "commentable_id: column(\"int\", undefined, { notNull: true }),",
        "commentable_type: column(\"string\", 255, { notNull: true }),",
        "created_at: column(\"timestamp\"),",
        "updated_at: column(\"timestamp\"),",
        "",
        "commentable: {",
        "  kind: \"relation\",",
        "  relation: \"morphTo\",",
        "  model: \"Commentable\",",
        "  options: { morphName: \"commentable\" },",
        "},",
      ],
    },
  ],
  seedName: "BlogScenarioSeeder",
  seedBody: [
    "const users = (await userFactory.createMany(5)) as SeedModel[];",
    "const allPosts: SeedModel[] = [];",
    "",
    "for (const user of users) {",
    "  for (let i = 0; i < 3; i++) {",
    "    const post = (await postFactory.create({ user_id: user.id })) as SeedModel;",
    "    allPosts.push(post);",
    "    for (let j = 0; j < 2; j++) {",
    "      await commentFactory.create({",
    "        commentable_id: post.id,",
    "        commentable_type: morphTypeOf(post),",
    "      });",
    "    }",
    "  }",
    "  await commentFactory.create({",
    "    commentable_id: user.id,",
    "    commentable_type: morphTypeOf(user),",
    "  });",
    "}",
    "",
    "for (const user of users) {",
    "  const favorites = pickRandomIds(allPosts, 2);",
    "  if (typeof user.attach === \"function\") {",
    "    await user.attach(\"post_user_pivot\", \"user_id\", \"post_id\", user.id, favorites);",
    "  }",
    "}",
  ],
};

const mediaPreset: ScenarioPreset = {
  id: "media",
  description: "Users, Photos, Videos, Comments (morph), Likes pivot",
  models: [
    {
      name: "User",
      table: "users",
      attrs: [
        "id?: number | null;",
        "name?: string | null;",
        "created_at?: string | Date | null;",
        "updated_at?: string | Date | null;",
      ],
      schemaLines: [
        "id: column(\"increments\", undefined, { primary: true }),",
        "name: validate(column(\"string\", 255), { required: true, min: 3 }),",
        "created_at: column(\"timestamp\"),",
        "updated_at: column(\"timestamp\"),",
        "",
        "photos: {",
        "  kind: \"relation\",",
        "  relation: \"hasMany\",",
        "  model: \"Photo\",",
        "  options: { foreignKey: \"user_id\" },",
        "},",
        "videos: {",
        "  kind: \"relation\",",
        "  relation: \"hasMany\",",
        "  model: \"Video\",",
        "  options: { foreignKey: \"user_id\" },",
        "},",
        "likes: {",
        "  kind: \"relation\",",
        "  relation: \"belongsToMany\",",
        "  model: \"Photo\",",
        "  options: {},",
        "},",
      ],
    },
    {
      name: "Photo",
      table: "photos",
      attrs: [
        "id?: number | null;",
        "name?: string | null;",
        "user_id?: number | null;",
        "created_at?: string | Date | null;",
        "updated_at?: string | Date | null;",
      ],
      schemaLines: [
        "id: column(\"increments\", undefined, { primary: true }),",
        "name: validate(column(\"string\", 255), { required: true, min: 3 }),",
        "user_id: column(\"int\", undefined, { notNull: true }),",
        "created_at: column(\"timestamp\"),",
        "updated_at: column(\"timestamp\"),",
        "",
        "author: {",
        "  kind: \"relation\",",
        "  relation: \"belongsTo\",",
        "  model: \"User\",",
        "  options: { foreignKey: \"user_id\" },",
        "},",
        "comments: {",
        "  kind: \"relation\",",
        "  relation: \"morphMany\",",
        "  model: \"Comment\",",
        "  options: { morphName: \"commentable\" },",
        "},",
      ],
    },
    {
      name: "Video",
      table: "videos",
      attrs: [
        "id?: number | null;",
        "name?: string | null;",
        "user_id?: number | null;",
        "created_at?: string | Date | null;",
        "updated_at?: string | Date | null;",
      ],
      schemaLines: [
        "id: column(\"increments\", undefined, { primary: true }),",
        "name: validate(column(\"string\", 255), { required: true, min: 3 }),",
        "user_id: column(\"int\", undefined, { notNull: true }),",
        "created_at: column(\"timestamp\"),",
        "updated_at: column(\"timestamp\"),",
        "",
        "author: {",
        "  kind: \"relation\",",
        "  relation: \"belongsTo\",",
        "  model: \"User\",",
        "  options: { foreignKey: \"user_id\" },",
        "},",
        "comments: {",
        "  kind: \"relation\",",
        "  relation: \"morphMany\",",
        "  model: \"Comment\",",
        "  options: { morphName: \"commentable\" },",
        "},",
      ],
    },
    {
      name: "Comment",
      table: "comments",
      attrs: [
        "id?: number | null;",
        "name?: string | null;",
        "commentable_id?: number | null;",
        "commentable_type?: string | null;",
        "created_at?: string | Date | null;",
        "updated_at?: string | Date | null;",
      ],
      schemaLines: [
        "id: column(\"increments\", undefined, { primary: true }),",
        "name: validate(column(\"string\", 255), { required: true, min: 3 }),",
        "commentable_id: column(\"int\", undefined, { notNull: true }),",
        "commentable_type: column(\"string\", 255, { notNull: true }),",
        "created_at: column(\"timestamp\"),",
        "updated_at: column(\"timestamp\"),",
        "",
        "commentable: {",
        "  kind: \"relation\",",
        "  relation: \"morphTo\",",
        "  model: \"Commentable\",",
        "  options: { morphName: \"commentable\" },",
        "},",
      ],
    },
  ],
  seedName: "MediaScenarioSeeder",
  seedBody: [
    "const users = (await userFactory.createMany(4)) as SeedModel[];",
    "const allPhotos: SeedModel[] = [];",
    "const allVideos: SeedModel[] = [];",
    "",
    "for (const user of users) {",
    "  for (let i = 0; i < 2; i++) {",
    "    const photo = (await photoFactory.create({ user_id: user.id })) as SeedModel;",
    "    allPhotos.push(photo);",
    "    await commentFactory.create({",
    "      commentable_id: photo.id,",
    "      commentable_type: morphTypeOf(photo),",
    "    });",
    "  }",
    "  for (let i = 0; i < 2; i++) {",
    "    const video = (await videoFactory.create({ user_id: user.id })) as SeedModel;",
    "    allVideos.push(video);",
    "    await commentFactory.create({",
    "      commentable_id: video.id,",
    "      commentable_type: morphTypeOf(video),",
    "    });",
    "  }",
    "}",
    "",
    "for (const user of users) {",
    "  const favorites = pickRandomIds(allPhotos, 2);",
    "  if (typeof user.attach === \"function\") {",
    "    await user.attach(\"photo_user_pivot\", \"user_id\", \"photo_id\", user.id, favorites);",
    "  }",
    "}",
  ],
};

const presets: ScenarioPreset[] = [blogPreset, mediaPreset];

function scenarioManifestPath(isTest: boolean): string {
  return path.resolve(
    PathMap.root,
    isTest ? "src/test/.eloquent-scenario.json" : "src/app/.eloquent-scenario.json"
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scenarioManagedModelNames(): string[] {
  return Array.from(new Set(presets.flatMap((preset) => preset.models.map((model) => model.name))));
}

function scenarioManagedTables(): string[] {
  return Array.from(new Set(presets.flatMap((preset) => preset.models.map((model) => model.table))));
}

function scenarioManagedSeeders(): string[] {
  return Array.from(new Set(presets.map((preset) => preset.seedName)));
}

function scenarioManagedPivotFactories(): string[] {
  return [
    "PhotoUserPivotFactory",
    "PostUserPivotFactory",
    "UserPhotoPivotFactory",
    "UserPostPivotFactory",
  ];
}

function scenarioManagedPivotTables(): string[] {
  return ["photo_user_pivot", "post_user_pivot"];
}

function removeFileIfExists(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  fs.rmSync(filePath, { force: true });
  return true;
}

function readScenarioManifest(isTest: boolean): ScenarioManifest | null {
  const manifestPath = scenarioManifestPath(isTest);
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(manifestPath, "utf8");
    return JSON.parse(content) as ScenarioManifest;
  } catch {
    return null;
  }
}

function writeScenarioManifest(isTest: boolean, preset: ScenarioPreset): void {
  const payload: ScenarioManifest = {
    presetId: preset.id,
    generatedAt: new Date().toISOString(),
    models: preset.models.map((model) => model.name),
    seedName: preset.seedName,
  };

  const manifestPath = scenarioManifestPath(isTest);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(payload, null, 2), "utf8");
}

function cleanupScenarioArtifacts(isTest: boolean): number {
  let removedCount = 0;
  const modelNames = scenarioManagedModelNames();
  const seederNames = scenarioManagedSeeders();
  const tableNames = [...scenarioManagedTables(), ...scenarioManagedPivotTables()];
  const migrationPattern = new RegExp(
    `^\\d+_(create|update)_(${tableNames.map(escapeRegex).join("|")})_table\\.(ts|js)$`
  );

  const manifestPath = scenarioManifestPath(isTest);
  const modelsDir = PathMap.models(isTest);
  const factoriesDir = PathMap.factories(isTest);
  const seedsDir = PathMap.seeds(isTest);
  const controllersDir = path.resolve(
    PathMap.root,
    isTest ? "src/test/controllers" : "src/app/controllers"
  );
  const servicesDir = path.resolve(
    PathMap.root,
    isTest ? "src/test/services" : "src/app/services"
  );
  const migrationsRoot = PathMap.migrations(isTest);

  for (const modelName of modelNames) {
    removedCount += Number(removeFileIfExists(path.join(modelsDir, `${modelName}.ts`)));
    removedCount += Number(removeFileIfExists(path.join(factoriesDir, `${modelName}Factory.ts`)));
    removedCount += Number(removeFileIfExists(path.join(controllersDir, `${modelName}Controller.ts`)));
    removedCount += Number(removeFileIfExists(path.join(servicesDir, `${modelName}Service.ts`)));
  }

  for (const pivotFactory of scenarioManagedPivotFactories()) {
    removedCount += Number(removeFileIfExists(path.join(factoriesDir, `${pivotFactory}.ts`)));
  }

  for (const seedName of seederNames) {
    removedCount += Number(removeFileIfExists(path.join(seedsDir, `${seedName}.ts`)));
  }

  removedCount += Number(removeFileIfExists(manifestPath));

  const migrationDirs = [migrationsRoot];
  if (fs.existsSync(migrationsRoot)) {
    for (const entry of fs.readdirSync(migrationsRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        migrationDirs.push(path.join(migrationsRoot, entry.name));
      }
    }
  }

  for (const dir of migrationDirs) {
    if (!fs.existsSync(dir)) {
      continue;
    }

    for (const entry of fs.readdirSync(dir)) {
      if (!migrationPattern.test(entry)) {
        continue;
      }
      removedCount += Number(removeFileIfExists(path.join(dir, entry)));
    }
  }

  return removedCount;
}

function selectPreset(name: string | undefined): ScenarioPreset {
  if (name) {
    const hit = presets.find((p) => p.id === name.toLowerCase());
    if (hit) return hit;
  }
  return presets[Math.floor(Math.random() * presets.length)];
}

export async function makeScenario(
  name: string,
  options: ScenarioOptions = {}
): Promise<void> {
  const isTest = options.test === true;
  const useMongo = options.mongo === true;
  const connectionNames = resolveConnectionNamesFromFlags(isTest, {
    mongo: useMongo,
  }) as ConnectionName[];
  if (useMongo && connectionNames.length === 0) {
    throw new Error(
      "No mongo test connection configured. Set DB_TEST_CONNECTION=mongo_test or configure mongo_test in dbConfig."
    );
  }
  const scenarioConnectionName =
    connectionNames[0] ?? resolveConnectionName(undefined, { test: isTest });
  const renderOptions = {
    isTest,
    useMongo,
    defaultConnectionName: scenarioConnectionName,
  };

  const preset = selectPreset(options.preset ?? name);
  console.log(chalk.cyanBright(`\nScenario preset: ${preset.id}`));
  console.log(chalk.gray(preset.description));

  const existingManifest = readScenarioManifest(isTest);
  const presetChanged = existingManifest?.presetId !== undefined && existingManifest.presetId !== preset.id;
  if (presetChanged && options.force !== true) {
    throw new Error(
      `Existing ${isTest ? "test" : "app"} scenario "${existingManifest?.presetId}" is active. Re-run with --force to replace it.`
    );
  }

  if (options.force === true) {
    const removedArtifacts = cleanupScenarioArtifacts(isTest);
    if (removedArtifacts > 0) {
      console.log(chalk.yellow(`Force cleanup removed ${removedArtifacts} stale scenario artifact(s).`));
    }
  }

  PathMap.ensureDirs();
  const modelsDir = PathMap.models(isTest);
  const factoriesDir = PathMap.factories(isTest);
  const seedsDir = PathMap.seeds(isTest);
  const controllersDir = path.resolve(
    PathMap.root,
    isTest ? "src/test/controllers" : "src/app/controllers"
  );
  const servicesDir = path.resolve(
    PathMap.root,
    isTest ? "src/test/services" : "src/app/services"
  );

  if (!fs.existsSync(controllersDir)) {
    fs.mkdirSync(controllersDir, { recursive: true });
  }
  if (!fs.existsSync(servicesDir)) {
    fs.mkdirSync(servicesDir, { recursive: true });
  }

  // 1) Models
  for (const model of preset.models) {
    writeModelFile(modelsDir, model, options.force === true, renderOptions);
  }

  // 2) Factories
  for (const model of preset.models) {
    await makeFactory(model.name, { test: isTest, force: true, mongo: useMongo });
  }

  if (options.controllers) {
    for (const model of preset.models) {
      await makeController(model.name, { test: isTest });
    }
  }

  if (options.services) {
    for (const model of preset.models) {
      await makeService(model.name, { test: isTest });
    }
  }

  // 3) Seeder (custom scenario)
  const seederPath = path.join(seedsDir, `${preset.seedName}.ts`);
  const seedContent = `/**
 * Auto-generated Scenario Seeder
 * Seeder: ${preset.seedName}
 */

import { UserFactory } from "../factories/UserFactory";
import { CommentFactory } from "../factories/CommentFactory";
${preset.id === "media"
  ? 'import { PhotoFactory } from "../factories/PhotoFactory";\nimport { VideoFactory } from "../factories/VideoFactory";'
  : 'import { PostFactory } from "../factories/PostFactory";'}

type SeedModel = {
  id: number;
  getMorphClass?: () => string;
  attach?: (
    pivotTable: string,
    foreignKey: string,
    relatedKey: string,
    foreignId: number,
    relatedIds: number[]
  ) => Promise<void>;
};

const morphTypeOf = (model: SeedModel): string => {
  if (typeof model.getMorphClass === "function") return model.getMorphClass();
  const ctor = model.constructor as { name?: string } | undefined;
  return String(ctor?.name ?? "Model");
};

const pickRandomIds = (items: SeedModel[], count: number): number[] => {
  const pool = items.map((p) => p.id).filter((id) => typeof id === "number");
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, Math.min(count, pool.length));
};

export async function ${preset.seedName}() {
  console.log("Running seeder: ${preset.seedName}");

  const userFactory = new UserFactory();
  const commentFactory = new CommentFactory();
  ${preset.id === "media"
    ? "const photoFactory = new PhotoFactory();\n  const videoFactory = new VideoFactory();"
    : "const postFactory = new PostFactory();"}

  ${preset.seedBody.join("\n  ")}

  console.log("Seeding completed for ${preset.seedName}");
}
`;
  fs.writeFileSync(seederPath, seedContent, "utf8");
  console.log(chalk.green(`Seeder created: ${seederPath}`));

  writeScenarioManifest(isTest, preset);

  // 4) Migrations
  await makeMigration("all", {
    test: isTest,
    exit: false,
    connectionName: scenarioConnectionName,
  });

  if (options.run) {
    await migrateFresh({
      test: isTest,
      force: true,
      connectionNames: [scenarioConnectionName],
    });
    await dbSeed({
      test: isTest,
      class: preset.seedName,
      close: true,
      exit: false,
      connectionNames: [scenarioConnectionName],
    });
  } else if (presetChanged) {
    console.log(
      chalk.yellow(
        `Scenario preset changed. Run \`eloquent migrate:fresh ${isTest ? "--test " : ""}${useMongo ? "--mongo " : ""}--force\` before \`migrate:run\` to reset old scenario tables and history.`
      )
    );
  }

  console.log(chalk.greenBright("\nScenario generation complete.\n"));
}
