import fs from "fs";
import os from "os";
import path from "path";

import { makeFactory } from "../cli/commands/makeFactory";
import { PathMap } from "../cli/utils/PathMap";
import { ModelIntrospector } from "../cli/utils/ModelIntrospector";
import { ImportResolver } from "../cli/utils/ImportResolver";

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

describe("makeFactory package import rename support", () => {
  let tmpRoot = "";
  let templatesDir = "";
  let factoriesDir = "";

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-factory-import-rename-"));
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

  test("main and pivot factory templates render the resolved package import path", async () => {
    fs.writeFileSync(
      path.join(templatesDir, "factory.tpl"),
      [
        'import { Factory } from "{{packageImportPath}}";',
        "export const model = \"{{ModelName}}\";",
      ].join("\n"),
      "utf8",
    );
    fs.writeFileSync(
      path.join(templatesDir, "pivot-factory.tpl"),
      [
        'import { BaseModel, Factory, PivotHelperMixin } from "{{packageImportPath}}";',
        'export const pivot = "{{PivotFactoryName}}";',
      ].join("\n"),
      "utf8",
    );

    const importSpy = jest
      .spyOn(ImportResolver, "publicApiImportPath")
      .mockReturnValue("Eloquent-ORM.js");
    jest.spyOn(ModelIntrospector, "analyze").mockResolvedValue({
      fields: [],
      relations: [
        {
          name: "roles",
          type: "belongsToMany",
          target: "Role",
          isPivot: true,
        },
      ],
      features: {},
    } as never);

    await makeFactory("User", { test: true, force: true });

    expect(
      fs.readFileSync(path.join(factoriesDir, "UserFactory.ts"), "utf8"),
    ).toContain('import { Factory } from "Eloquent-ORM.js";');
    expect(
      fs.readFileSync(path.join(factoriesDir, "UserRolePivotFactory.ts"), "utf8"),
    ).toContain(
      'import { BaseModel, Factory, PivotHelperMixin } from "Eloquent-ORM.js";',
    );
    expect(importSpy).toHaveBeenCalledWith(path.join(factoriesDir, "UserFactory.ts"), PathMap.root);
    expect(importSpy).toHaveBeenCalledWith(
      path.join(factoriesDir, "UserRolePivotFactory.ts"),
      PathMap.root,
    );
  });

  test("plan tracks the factory-template rename slice", () => {
    const plan = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "validation tasks/Factory-Template-Package-Import-Rename-Plan.md",
      ),
      "utf8",
    );

    expect(plan).toContain("# Factory Template Package Import Rename Plan");
    expect(plan).toContain("Status: COMPLETED");
    expect(plan).toContain("src/cli/commands/makeFactory.ts");
    expect(plan).toContain("src/cli/templates/factory.tpl");
    expect(plan).toContain("src/cli/templates/pivot-factory.tpl");
    expect(plan).toContain("src/lab_test/make.factory.package-import-rename.logic.test.ts");
  });
});
