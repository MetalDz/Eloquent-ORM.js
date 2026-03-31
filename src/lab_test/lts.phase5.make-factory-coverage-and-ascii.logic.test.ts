import fs from "fs";
import os from "os";
import path from "path";

import { makeFactory } from "../cli/commands/makeFactory.js";
import { PathMap } from "../cli/utils/PathMap.js";
import { ModelIntrospector } from "../cli/utils/ModelIntrospector.js";

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

describe("LTS phase 5 makeFactory coverage and ASCII", () => {
  let tmpRoot = "";
  let templatesDir = "";
  let factoriesDir = "";

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts-make-factory-"));
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

  test("plan tracks the dedicated makeFactory LTS slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-MakeFactory-Coverage-And-ASCII-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 MakeFactory Coverage And ASCII Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/commands/makeFactory.ts");
    expect(content).toContain(
      "src/lab_test/lts.phase5.make-factory-coverage-and-ascii.logic.test.ts",
    );
  });

  test("renders hasMany and unknown relation examples and keeps source ASCII-stable", async () => {
    fs.writeFileSync(
      path.join(templatesDir, "factory.tpl"),
      ["{{#each relationExamples}}", "{{this}}", "{{/each}}"].join("\n"),
      "utf8",
    );

    jest.spyOn(ModelIntrospector, "analyze").mockResolvedValue({
      fields: [],
      relations: [
        { name: "comments", type: "hasMany", target: "Comment" },
        { name: "auditTrail", type: "customRelation" },
      ],
      features: {},
    } as never);

    await makeFactory("Post", { test: true });

    const output = fs.readFileSync(path.join(factoriesDir, "PostFactory.ts"), "utf8");
    expect(output).toContain("create Post and 3 Comment");
    expect(output).toContain("// relation auditTrail (customRelation)");

    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/cli/commands/makeFactory.ts"),
      "utf8",
    );
    expect(source).toContain("WARN:");
    expect(source).toContain("INFO:");
    expect(source).toContain("ERROR:");
    expect(source).not.toContain("âڑ ï¸ڈ");
    expect(source).not.toContain("â„¹ï¸ڈ");
    expect(source).not.toContain("â‌Œ");
  });

  test("covers default options, nullish analysis fallbacks, and app-mode import stability", async () => {
    fs.writeFileSync(
      path.join(templatesDir, "factory.tpl"),
      [
        'import DemoModel from "{{modelImportPath}}";',
        "hasRelations={{hasRelations}}",
      ].join("\n"),
      "utf8",
    );

    jest.spyOn(ModelIntrospector, "analyze").mockResolvedValue({} as never);

    await makeFactory("Defaulted");

    const output = fs.readFileSync(
      path.join(factoriesDir, "DefaultedFactory.ts"),
      "utf8",
    );
    expect(output).toContain('from "../../models/Defaulted"');
    expect(output).toContain("hasRelations=false");
  });

  test("covers morphTo examples, missing field-type fallback, and Error-without-stack", async () => {
    fs.writeFileSync(
      path.join(templatesDir, "factory.tpl"),
      [
        "{{#each fields}}",
        "field:{{name}}={{fakerPath}}",
        "{{/each}}",
        "{{#each relationExamples}}",
        "{{this}}",
        "{{/each}}",
      ].join("\n"),
      "utf8",
    );

    jest.spyOn(ModelIntrospector, "analyze").mockResolvedValueOnce({
      fields: [{ name: "metadata" }],
      relations: [{ name: "owner", type: "morphTo" }],
      features: {},
    } as never);

    await makeFactory("Photo", { test: true });

    const output = fs.readFileSync(path.join(factoriesDir, "PhotoFactory.ts"), "utf8");
    expect(output).toContain("field:metadata=lorem.word()");
    expect(output).toContain("morph example");

    jest.restoreAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    const error = new Error("boom without stack");
    error.stack = "";
    jest.spyOn(ModelIntrospector, "analyze").mockRejectedValueOnce(error);

    await makeFactory("BrokenNoStack", { test: true });

    expect(console.error).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("ERROR: Factory generation failed"),
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("boom without stack"),
    );
  });

  test("falls back to Related when belongsTo or hasMany targets are omitted", async () => {
    fs.writeFileSync(
      path.join(templatesDir, "factory.tpl"),
      ["{{#each relationExamples}}", "{{this}}", "{{/each}}"].join("\n"),
      "utf8",
    );

    jest.spyOn(ModelIntrospector, "analyze").mockResolvedValueOnce({
      fields: [],
      relations: [
        { name: "owner", type: "belongsTo" },
        { name: "children", type: "hasMany" },
      ],
      features: {},
    } as never);

    await makeFactory("Photo", { test: true });

    const output = fs.readFileSync(path.join(factoriesDir, "PhotoFactory.ts"), "utf8");
    expect(output).toContain("with a new Related: PhotoFactory.with('owner', RelatedFactory)");
    expect(output).toContain("and 3 Related: PhotoFactory.with('children', RelatedFactory, 3)");
  });

  test("logs Error instances with both message and stack", async () => {
    const error = new Error("boom");
    error.stack = "stack trace";
    jest.spyOn(ModelIntrospector, "analyze").mockRejectedValue(error);

    await makeFactory("BrokenFactory", { test: true });

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("ERROR: Factory generation failed"),
    );
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("boom"));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("stack trace"));
  });
});
