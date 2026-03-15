import fs from "fs";
import path from "path";
import * as ModelSubpath from "../Model";
import { Model, SqlModel, MongoModel } from "../index";

jest.mock("@faker-js/faker", () => ({
  faker: {},
}));

describe("Public Model alias and subpath entry", () => {
  test("root Model alias remains the public SQL alias", () => {
    expect(Model).toBe(SqlModel);
  });

  test("Model subpath exposes named SqlModel and MongoModel exports without a default alias", () => {
    expect(ModelSubpath.SqlModel).toBe(SqlModel);
    expect(ModelSubpath.MongoModel).toBe(MongoModel);
    expect("default" in ModelSubpath).toBe(false);
    expect("Model" in ModelSubpath).toBe(false);
  });

  test("package exports include the Model subpath entry", () => {
    const packageJsonPath = path.resolve(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
      exports?: Record<string, unknown>;
    };

    expect(pkg.exports).toEqual(
      expect.objectContaining({
        "./Model": {
          types: "./dist/Model.d.ts",
          require: "./dist/Model.js",
          default: "./dist/Model.js",
        },
      })
    );
  });

  test("consumer docs describe root alias and named model subpath imports", () => {
    const apiDoc = fs.readFileSync(
      path.resolve(process.cwd(), "src/documentation/api-reference.md"),
      "utf8"
    );
    const installDoc = fs.readFileSync(
      path.resolve(process.cwd(), "src/documentation/installation-and-quickstart.md"),
      "utf8"
    );
    const planDoc = fs.readFileSync(
      path.resolve(process.cwd(), "validation tasks/Public-Model-Alias-And-Entry-Plan.md"),
      "utf8"
    );

    expect(apiDoc).toContain("## Root Package: `eloquentjs`");
    expect(apiDoc).toContain("## Model Subpath: `eloquentjs/Model`");
    expect(apiDoc).toContain("- `eloquentjs/Model` does not expose a default export.");
    expect(apiDoc).toContain("- `eloquentjs/Model` does not expose the root `Model` alias.");
    expect(installDoc).toContain("### Laravel-Style SQL Model Import");
    expect(installDoc).toContain('import { Model, column, registerModels, type ModelInstance } from "eloquentjs";');
    expect(installDoc).toContain('import { SqlModel, MongoModel, type ModelInstance } from "eloquentjs/Model";');
    expect(planDoc).toContain("# Public Model Alias And Entry Plan");
    expect(planDoc).toContain('`eloquentjs/Model`');
  });
});
