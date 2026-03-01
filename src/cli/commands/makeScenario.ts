import fs from "fs";
import path from "path";
import chalk from "chalk";
import { PathMap } from "../utils/PathMap";
import { makeFactory } from "./makeFactory";
import { makeController } from "./makeController";
import { makeService } from "./makeService";
import { makeMigration } from "./makeMigration";
import { migrateRun } from "./migrateRun";
import { dbSeed } from "./dbSeed";
import { ImportResolver } from "../utils/ImportResolver";

type ScenarioOptions = {
  test?: boolean;
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

function renderModel(spec: ModelSpec): string {
  const attrs = spec.attrs.map((line) => `  ${line}`).join("\n");
  const schema = spec.schemaLines.map((line) => `    ${line}`).join("\n");
  const coreImportPath = ImportResolver.coreImportPath(true);
  const schemaImportPath = ImportResolver.schemaImportPath(true);

  return `/**
 * Auto-generated Test Model
 * Model: ${spec.name}
 * Table: ${spec.table}
 */

import { SqlModel, ModelInstance } from "${coreImportPath}";
import { column, validate } from "${schemaImportPath}";

type ${spec.name}Attrs = {
${attrs}
};

export class ${spec.name} extends SqlModel<${spec.name}Attrs> {
  static tableName = "${spec.table}";
  static connectionName = process.env.DB_CONNECTION ?? "mysql";
  static morphAlias = "${spec.table}";

  static schema = {
${schema}
  };

  constructor() {
    super("${spec.table}", process.env.DB_CONNECTION ?? "mysql");
  }
}

export interface ${spec.name} extends ModelInstance<${spec.name}Attrs> {}
`;
}

function writeModelFile(modelDir: string, spec: ModelSpec, force: boolean): void {
  const filePath = path.join(modelDir, `${spec.name}.ts`);
  if (fs.existsSync(filePath) && !force) {
    console.log(chalk.yellow(`Model exists (skipped): ${filePath}`));
    return;
  }
  fs.writeFileSync(filePath, renderModel(spec), "utf8");
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
  if (!isTest) {
    console.log(chalk.yellow("Use --test to generate scenarios in the test folders."));
  }

  const preset = selectPreset(options.preset ?? name);
  console.log(chalk.cyanBright(`\nScenario preset: ${preset.id}`));
  console.log(chalk.gray(preset.description));

  PathMap.ensureDirs();
  const modelsDir = PathMap.models(true);
  const factoriesDir = PathMap.factories(true);
  const seedsDir = PathMap.seeds(true);
  const testControllersDir = path.resolve(PathMap.root, "src/test/controllers");
  const testServicesDir = path.resolve(PathMap.root, "src/test/services");

  if (!fs.existsSync(testControllersDir)) {
    fs.mkdirSync(testControllersDir, { recursive: true });
  }
  if (!fs.existsSync(testServicesDir)) {
    fs.mkdirSync(testServicesDir, { recursive: true });
  }

  // 1) Models
  for (const model of preset.models) {
    writeModelFile(modelsDir, model, options.force === true);
  }

  // 2) Factories
  for (const model of preset.models) {
    await makeFactory(model.name, { test: true, force: true });
  }

  if (options.controllers) {
    for (const model of preset.models) {
      await makeController(model.name, { test: true });
    }
  }

  if (options.services) {
    for (const model of preset.models) {
      await makeService(model.name, { test: true });
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

  // 4) Migrations
  for (const model of preset.models) {
    await makeMigration(model.name, { test: true, exit: false });
  }

  if (options.run) {
    await migrateRun(true, undefined, false, false);
    await dbSeed({ test: true, class: preset.seedName, close: true, exit: false });
  }

  console.log(chalk.greenBright("\nScenario generation complete.\n"));
}
