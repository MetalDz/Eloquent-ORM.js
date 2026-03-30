const fs = require("fs");
const path = require("path");

const rootExportNames = [
  "BaseModel",
  "Model",
  "SqlModel",
  "MongoModel",
  "MorphRegistry",
  "PivotHelperMixin",
  "CoreModel",
  "column",
  "validate",
  "relation",
  "mixin",
  "validateSchema",
  "SchemaValidator",
  "SchemaBuilder",
  "CacheManager",
  "setupCache",
  "registerModels",
  "isModelRegistered",
  "setModelRegistryStrictMode",
  "isModelRegistryStrictMode",
];

const modelExportNames = ["SqlModel", "MongoModel"];

function joinLines(lines) {
  return `${lines.join("\n")}\n`;
}

function buildEsmIndexSource() {
  return joinLines([
    'import cjsPackage from "../dist/index.js";',
    'import { Factory } from "./Factory.mjs";',
    "",
    "const {",
    ...rootExportNames.map((name) => `  ${name},`),
    "} = cjsPackage;",
    "",
    "export {",
    ...rootExportNames.map((name) => `  ${name},`),
    "  Factory,",
    "};",
    "",
    "export default {",
    ...rootExportNames.map((name) => `  ${name},`),
    "  Factory,",
    "};",
  ]);
}

function buildEsmFactorySource() {
  return joinLines([
    'import { createRequire } from "node:module";',
    "",
    "const require = createRequire(import.meta.url);",
    "let cachedFaker;",
    "",
    "function getFaker() {",
    "  if (!cachedFaker) {",
    '    cachedFaker = require("@faker-js/faker").faker;',
    "  }",
    "",
    "  return cachedFaker;",
    "}",
    "",
    "export class Factory {",
    "  get faker() {",
    "    return getFaker();",
    "  }",
    "",
    "  async create(attrs = {}, index = 0) {",
    "    const base = this.definition(index);",
    "    const merged = { ...base, ...attrs };",
    "",
    "    if (this.beforeCreate) {",
    "      const modified = await this.beforeCreate(merged, index);",
    '      if (modified && typeof modified === "object") {',
    "        Object.assign(merged, modified);",
    "      }",
    "    }",
    "",
    "    let instance = new this.model();",
    "",
    "    if (this.#hasInstanceCreate(instance)) {",
    "      const created = await instance.create(merged);",
    "      if (created) {",
    "        instance = created;",
    "      }",
    "    } else if (this.#hasStaticCreate(this.model)) {",
    "      return this.model.create(merged);",
    "    } else if (this.#hasInstanceSave(instance)) {",
    "      Object.assign(instance, merged);",
    "      await instance.save();",
    "    } else {",
    '      throw new Error(`Model \'${this.model.name}\' has no valid create/save method.`);',
    "    }",
    "",
    "    if (this.afterCreate) {",
    "      await this.afterCreate(instance);",
    "    }",
    "",
    "    return instance;",
    "  }",
    "",
    "  async createMany(count, callback, concurrency = 1) {",
    "    const results = [];",
    "",
    "    const executeCreate = async (index) => {",
    "      const model = await this.create({}, index);",
    "      if (callback) {",
    "        await callback(model, index);",
    "      }",
    "      results[index] = model;",
    "    };",
    "",
    "    if (concurrency <= 1) {",
    "      for (let index = 0; index < count; index += 1) {",
    "        await executeCreate(index);",
    "      }",
    "      return results;",
    "    }",
    "",
    "    let active = 0;",
    "    let index = 0;",
    "    let settled = false;",
    "",
    "    return new Promise((resolve, reject) => {",
    "      const maybeResolve = () => {",
    "        if (!settled && index >= count && active === 0) {",
    "          settled = true;",
    "          resolve(results);",
    "        }",
    "      };",
    "",
    "      const next = () => {",
    "        if (settled) {",
    "          return;",
    "        }",
    "",
    "        while (active < concurrency && index < count && !settled) {",
    "          const currentIndex = index++;",
    "          active += 1;",
    "",
    "          void executeCreate(currentIndex)",
    "            .catch((error) => {",
    "              if (settled) {",
    "                return;",
    "              }",
    "              settled = true;",
    "              reject(error);",
    "            })",
    "            .finally(() => {",
    "              active -= 1;",
    "              if (settled) {",
    "                return;",
    "              }",
    "              next();",
    "            });",
    "        }",
    "",
    "        maybeResolve();",
    "      };",
    "",
    "      next();",
    "    });",
    "  }",
    "",
    "  async related(factoryOrCtor, count = 1) {",
    "    const factory =",
    '      typeof factoryOrCtor === "function"',
    "        ? new factoryOrCtor()",
    "        : factoryOrCtor;",
    "",
    "    if (count === 1) {",
    "      return factory.create();",
    "    }",
    "",
    "    return factory.createMany(count);",
    "  }",
    "",
    "  async relatedPivot(",
    "    factory,",
    "    pivotTable,",
    "    foreignKey,",
    "    relatedKey,",
    "    foreignId,",
    "    relatedIds,",
    "    extraPivotAttrs",
    "  ) {",
    "    await factory.createPivot(foreignId, relatedIds, extraPivotAttrs);",
    "",
    "    console.log(",
    '      `[Pivot Attached] Table "${pivotTable}" (${foreignKey} -> ${relatedKey})`',
    "    );",
    "  }",
    "",
    "  #hasInstanceCreate(obj) {",
    '    return typeof obj?.create === "function";',
    "  }",
    "",
    "  #hasStaticCreate(ctor) {",
    '    return typeof ctor?.create === "function";',
    "  }",
    "",
    "  #hasInstanceSave(obj) {",
    '    return typeof obj?.save === "function";',
    "  }",
    "}",
  ]);
}

function buildEsmModelSource() {
  return joinLines([
    'import cjsModelPackage from "../dist/Model.js";',
    "",
    "const {",
    ...modelExportNames.map((name) => `  ${name},`),
    "} = cjsModelPackage;",
    "",
    "export {",
    ...modelExportNames.map((name) => `  ${name},`),
    "};",
    "",
    "export default cjsModelPackage;",
  ]);
}

function writeIfChanged(filePath, content) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
  if (existing === content) {
    return false;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

function generateEsmEntrypoints(options = {}) {
  const cwd = options.cwd || process.cwd();
  const outputs = [
    { filePath: path.join(cwd, "esm", "index.mjs"), content: buildEsmIndexSource() },
    { filePath: path.join(cwd, "esm", "Factory.mjs"), content: buildEsmFactorySource() },
    { filePath: path.join(cwd, "esm", "Model.mjs"), content: buildEsmModelSource() },
  ];

  const generatedFiles = outputs.map((entry) => ({
    filePath: entry.filePath,
    changed: writeIfChanged(entry.filePath, entry.content),
  }));

  return { generatedFiles };
}

if (require.main === module) {
  const result = generateEsmEntrypoints();
  for (const file of result.generatedFiles) {
    console.log(`${file.changed ? "Generated" : "Unchanged"}: ${path.relative(process.cwd(), file.filePath)}`);
  }
}

module.exports = {
  rootExportNames,
  modelExportNames,
  buildEsmIndexSource,
  buildEsmFactorySource,
  buildEsmModelSource,
  generateEsmEntrypoints,
};
