import fs from "fs";
import os from "os";
import path from "path";
import { makeFactory } from "../cli/commands/makeFactory";
import { PathMap } from "../cli/utils/PathMap";
import { ModelIntrospector } from "../cli/utils/ModelIntrospector";

jest.mock("chalk", () => ({
  __esModule: true,
  default: new Proxy(
    (value: unknown): string => String(value ?? ""),
    {
      get: () => (value: unknown): string => String(value ?? ""),
      apply: (_target, _thisArg, args: unknown[]) => String(args[0] ?? ""),
    }
  ),
}));

describe("Branch coverage 100% - phase 38 makeFactory branches", () => {
  let tmpRoot = "";
  let templatesDir = "";
  let factoriesDir = "";

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-phase38-make-factory-"));
    templatesDir = path.join(tmpRoot, "templates");
    factoriesDir = path.join(tmpRoot, "factories");
    fs.mkdirSync(templatesDir, { recursive: true });

    jest.spyOn(PathMap, "factories").mockReturnValue(factoriesDir);
    jest.spyOn(PathMap, "template").mockImplementation((name: string) => {
      const fileName = name.endsWith(".tpl") ? name : `${name}.tpl`;
      return path.join(templatesDir, fileName);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  function writeTemplate(name: string, content: string): void {
    fs.writeFileSync(path.join(templatesDir, `${name}.tpl`), content, "utf8");
  }

  test("aborts cleanly when model metadata is unavailable", async () => {
    jest.spyOn(ModelIntrospector, "analyze").mockResolvedValue(null as never);

    await makeFactory("User", { test: true });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('No metadata found for model "User"')
    );
  });

  test("aborts when factory template is missing", async () => {
    jest.spyOn(ModelIntrospector, "analyze").mockResolvedValue({
      fields: [],
      relations: [],
      features: {
        hasTimestamps: false,
        hasSoftDeletes: false,
        isMorphable: false,
      },
    } as any);

    await makeFactory("Post", { test: true });

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Factory template not found")
    );
    expect(fs.existsSync(factoriesDir)).toBe(false);
  });

  test("generates main and pivot factories, including test import rewrite", async () => {
    writeTemplate(
      "factory",
      [
        'import DemoModel from "../../models/DemoModel";',
        "{{#each relationImports}}",
        "{{this}}",
        "{{/each}}",
        "export const model = \"{{ModelName}}\";",
        "{{#each fields}}",
        "field:{{name}}={{fakerPath}}",
        "{{/each}}",
        "{{#if hasRelations}}",
        "{{#each relationExamples}}",
        "{{this}}",
        "{{/each}}",
        "{{/if}}",
      ].join("\n")
    );
    writeTemplate(
      "pivot-factory",
      'export const pivot = "{{PivotFactoryName}}|{{pivotTable}}|{{foreignKey}}|{{relatedKey}}";'
    );

    jest.spyOn(ModelIntrospector, "analyze").mockResolvedValue({
      fields: [
        { name: "title", type: "string" },
        { name: "meta", type: "unknown-type" },
      ],
      relations: [
        { name: "user", type: "belongsTo", target: "User" },
        {
          name: "tags",
          type: "belongsToMany",
          target: "Tag",
          isPivot: true,
          pivotTable: "posts_tags",
          foreignKey: "post_id",
          relatedKey: "tag_id",
        },
        { name: "comments", type: "morphMany", target: "Comment" },
      ],
      features: {
        hasTimestamps: true,
        hasSoftDeletes: false,
        isMorphable: false,
      },
    } as any);

    await makeFactory("Post", { test: true });

    const mainPath = path.join(factoriesDir, "PostFactory.ts");
    const pivotPath = path.join(factoriesDir, "PostTagPivotFactory.ts");
    expect(fs.existsSync(mainPath)).toBe(true);
    expect(fs.existsSync(pivotPath)).toBe(true);

    const main = fs.readFileSync(mainPath, "utf8");
    const pivot = fs.readFileSync(pivotPath, "utf8");

    expect(main).toContain('from "../models/DemoModel"');
    expect(main).toContain('import { UserFactory } from "../factories/UserFactory";');
    expect(main).toContain('import { TagFactory } from "../factories/TagFactory";');
    expect(main).toContain('import { CommentFactory } from "../factories/CommentFactory";');
    expect(main).toContain("field:title=person.fullName()");
    expect(main).toContain("field:meta=lorem.word()");
    expect(main).toContain("create Post with a new User");
    expect(main).toContain("attach existing Tag");
    expect(main).toContain("morph example");

    expect(pivot).toContain("PostTagPivotFactory|posts_tags|post_id|tag_id");
  });

  test("skips overwrite when files already exist and overwrites with --force", async () => {
    writeTemplate("factory", 'export const value = "{{ModelName}}";');
    writeTemplate(
      "pivot-factory",
      'export const pivot = "{{PivotFactoryName}}|{{pivotTable}}|{{foreignKey}}|{{relatedKey}}";'
    );

    jest.spyOn(ModelIntrospector, "analyze").mockResolvedValue({
      fields: [],
      relations: [
        {
          name: "tags",
          type: "belongsToMany",
          target: "Tag",
          isPivot: true,
        },
      ],
      features: {
        hasTimestamps: false,
        hasSoftDeletes: false,
        isMorphable: false,
      },
    } as any);

    fs.mkdirSync(factoriesDir, { recursive: true });
    const mainPath = path.join(factoriesDir, "PostFactory.ts");
    const pivotPath = path.join(factoriesDir, "PostTagPivotFactory.ts");
    fs.writeFileSync(mainPath, "legacy-main", "utf8");
    fs.writeFileSync(pivotPath, "legacy-pivot", "utf8");

    await makeFactory("Post", { test: true });
    expect(fs.readFileSync(mainPath, "utf8")).toBe("legacy-main");
    expect(fs.readFileSync(pivotPath, "utf8")).toBe("legacy-pivot");

    await makeFactory("Post", { test: true, force: true });
    expect(fs.readFileSync(mainPath, "utf8")).toContain('export const value = "Post";');
    expect(fs.readFileSync(pivotPath, "utf8")).toContain("PostTagPivotFactory");
  });

  test("warns when pivot template is missing and catches non-Error failures", async () => {
    writeTemplate("factory", 'export const value = "{{ModelName}}";');
    jest.spyOn(ModelIntrospector, "analyze").mockResolvedValue({
      fields: [],
      relations: [
        {
          name: "tags",
          type: "belongsToMany",
          target: "Tag",
          isPivot: true,
        },
      ],
      features: {
        hasTimestamps: false,
        hasSoftDeletes: false,
        isMorphable: false,
      },
    } as any);

    await makeFactory("Post", { test: true });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Pivot template not found")
    );

    jest.spyOn(ModelIntrospector, "analyze").mockRejectedValue("raw failure");
    await makeFactory("BrokenFactory", { test: true });

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Factory generation failed"));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("raw failure"));
  });
});
