import fs from "fs";
import os from "os";
import path from "path";
import { __makeRegistryInternals, makeRegistry } from "../cli/commands/makeRegistry.js";
import { PathMap } from "../cli/utils/PathMap.js";
import { ImportResolver } from "../cli/utils/ImportResolver.js";

jest.mock("chalk", () => ({
  __esModule: true,
  default: new Proxy(
    (value: unknown): string => String(value ?? ""),
    {
      get: () => (value: unknown): string => String(value ?? ""),
      apply: (_target, _thisArg, args: unknown[]) => String(args[0] ?? ""),
    },
  ),
}));

describe("make:registry generator", () => {
  let tempRoot: string;
  let appModelsDir: string;
  let testModelsDir: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-make-registry-"));
    appModelsDir = path.join(tempRoot, "src/app/models");
    testModelsDir = path.join(tempRoot, "src/test/database/models");
    fs.mkdirSync(appModelsDir, { recursive: true });
    fs.mkdirSync(testModelsDir, { recursive: true });

    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(PathMap, "ensureDirs").mockImplementation(() => undefined);
    jest.spyOn(PathMap, "root", "get").mockReturnValue(tempRoot);
    jest.spyOn(PathMap, "models").mockImplementation((isTest = false) =>
      isTest ? testModelsDir : appModelsDir,
    );
    jest.spyOn(ImportResolver, "publicApiImportPath").mockReturnValue("../index");
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test("generates app registerModels bootstrap from discovered models", async () => {
    fs.writeFileSync(path.join(appModelsDir, "User.ts"), "export class User {}", "utf8");
    fs.writeFileSync(path.join(appModelsDir, "Wifi.ts"), "export class Wifi {}", "utf8");
    fs.writeFileSync(path.join(appModelsDir, "index.ts"), "export {}", "utf8");

    await makeRegistry({ force: true });

    const outputPath = path.join(tempRoot, "src/app/registerModels.ts");
    expect(fs.existsSync(outputPath)).toBe(true);

    const content = fs.readFileSync(outputPath, "utf8");
    expect(content).toContain('import { registerModels, type RegisterModelsOptions } from "../index";');
    expect(content).toContain('import { User } from "./models/User";');
    expect(content).toContain('import { Wifi } from "./models/Wifi";');
    expect(content).not.toContain('./models/index');
    expect(content).toContain("export const APP_MODELS = [");
    expect(content).toContain("registerModels([...APP_MODELS], options);");
    expect(content).toContain("export function registerAppModels(");
  });

  test("generates .js relative imports for NodeNext-style ESM projects", async () => {
    fs.writeFileSync(path.join(appModelsDir, "User.ts"), "export class User {}", "utf8");
    fs.writeFileSync(
      path.join(tempRoot, "package.json"),
      JSON.stringify({ type: "module" }, null, 2),
      "utf8",
    );
    fs.writeFileSync(
      path.join(tempRoot, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { module: "NodeNext" } }, null, 2),
      "utf8",
    );

    await makeRegistry({ force: true });

    const outputPath = path.join(tempRoot, "src/app/registerModels.ts");
    const content = fs.readFileSync(outputPath, "utf8");

    expect(content).toContain(
      'import { registerModels, type RegisterModelsOptions } from "../index.js";',
    );
    expect(content).toContain('import { User } from "./models/User.js";');
  });

  test("falls back to CommonJS-style imports when package metadata cannot be parsed", async () => {
    fs.writeFileSync(path.join(appModelsDir, "User.ts"), "export class User {}", "utf8");
    fs.writeFileSync(path.join(tempRoot, "package.json"), "{ invalid json", "utf8");
    fs.writeFileSync(path.join(tempRoot, "tsconfig.json"), JSON.stringify({}, null, 2), "utf8");

    await makeRegistry({ force: true });

    const outputPath = path.join(tempRoot, "src/app/registerModels.ts");
    const content = fs.readFileSync(outputPath, "utf8");

    expect(content).toContain(
      'import { registerModels, type RegisterModelsOptions } from "../index";',
    );
    expect(content).toContain('import { User } from "./models/User";');
  });

  test("preserves non-relative public API imports for ESM projects", async () => {
    fs.writeFileSync(path.join(appModelsDir, "User.ts"), "export class User {}", "utf8");
    fs.writeFileSync(
      path.join(tempRoot, "package.json"),
      JSON.stringify({ type: "module" }, null, 2),
      "utf8",
    );
    jest.spyOn(ImportResolver, "publicApiImportPath").mockReturnValue("@alpha.consultings/eloquent-orm.js");

    await makeRegistry({ force: true });

    const outputPath = path.join(tempRoot, "src/app/registerModels.ts");
    const content = fs.readFileSync(outputPath, "utf8");

    expect(content).toContain(
      'import { registerModels, type RegisterModelsOptions } from "@alpha.consultings/eloquent-orm.js";',
    );
    expect(content).toContain('import { User } from "./models/User.js";');
  });

  test("preserves already-extensioned public API imports for ESM projects", async () => {
    fs.writeFileSync(path.join(appModelsDir, "User.ts"), "export class User {}", "utf8");
    fs.writeFileSync(
      path.join(tempRoot, "package.json"),
      JSON.stringify({ type: "module" }, null, 2),
      "utf8",
    );
    jest.spyOn(ImportResolver, "publicApiImportPath").mockReturnValue("../index.js");

    await makeRegistry({ force: true });

    const outputPath = path.join(tempRoot, "src/app/registerModels.ts");
    const content = fs.readFileSync(outputPath, "utf8");

    expect(content).toContain(
      'import { registerModels, type RegisterModelsOptions } from "../index.js";',
    );
    expect(content).toContain('import { User } from "./models/User.js";');
  });

  test("internal ESM helpers cover invalid metadata, tsconfig-only detection, and import-path guards", () => {
    const invalidJsonPath = path.join(tempRoot, "package.json");
    fs.writeFileSync(invalidJsonPath, "{ invalid json", "utf8");

    expect(__makeRegistryInternals.readJsonFile(invalidJsonPath)).toBeNull();

    const tsconfigOnlyRoot = path.join(tempRoot, "tsconfig-only-root");
    fs.mkdirSync(tsconfigOnlyRoot, { recursive: true });
    fs.writeFileSync(
      path.join(tsconfigOnlyRoot, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { module: "Node16", moduleResolution: "Node16" } }, null, 2),
      "utf8",
    );
    expect(__makeRegistryInternals.usesNodeEsmRegistryImports(tsconfigOnlyRoot)).toBe(true);

    const esmRoot = path.join(tempRoot, "esm-root");
    fs.mkdirSync(esmRoot, { recursive: true });
    fs.writeFileSync(
      path.join(esmRoot, "package.json"),
      JSON.stringify({ type: "module" }, null, 2),
      "utf8",
    );

    expect(
      __makeRegistryInternals.withRuntimeRelativeImportExtension(
        "@alpha.consultings/eloquent-orm.js",
        esmRoot,
      ),
    ).toBe("@alpha.consultings/eloquent-orm.js");
    expect(
      __makeRegistryInternals.withRuntimeRelativeImportExtension("../index.js", esmRoot),
    ).toBe("../index.js");
  });

  test("generates test registerModels bootstrap from discovered test models", async () => {
    fs.writeFileSync(path.join(testModelsDir, "Comment.ts"), "export class Comment {}", "utf8");

    await makeRegistry({ test: true, force: true });

    const outputPath = path.join(tempRoot, "src/test/registerModels.ts");
    expect(fs.existsSync(outputPath)).toBe(true);

    const content = fs.readFileSync(outputPath, "utf8");
    expect(content).toContain(
      'import { registerModels, type RegisterModelsOptions } from "../index";',
    );
    expect(content).toContain('import { Comment } from "./database/models/Comment";');
    expect(content).toContain("export const TEST_MODELS = [");
    expect(content).toContain("registerModels([...TEST_MODELS], options);");
    expect(content).toContain("export function registerTestModels(");
  });

  test("generates an empty bootstrap when no model files exist", async () => {
    await makeRegistry({ force: true });

    const outputPath = path.join(tempRoot, "src/app/registerModels.ts");
    const content = fs.readFileSync(outputPath, "utf8");

    expect(content).toContain("export const APP_MODELS = [");
    expect(content).toContain("] as const;");
    expect(content).toContain("registerModels([...APP_MODELS], options);");
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("No model files were found. Generated an empty registerModels bootstrap."),
    );
  });
});
