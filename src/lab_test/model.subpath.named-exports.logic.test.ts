import fs from "fs";
import path from "path";
import * as ModelSubpath from "../Model";
import { SqlModel, MongoModel } from "../index";

jest.mock("@faker-js/faker", () => ({
  faker: {},
}));

describe("Model subpath named exports", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"),
  ) as { name?: string };
  const packageName = packageJson.name ?? "@alpha.consultings/eloquent-orm.js";

  test(`${packageName}/Model exposes named SQL and Mongo model bases`, () => {
    expect(ModelSubpath.SqlModel).toBe(SqlModel);
    expect(ModelSubpath.MongoModel).toBe(MongoModel);
  });

  test(`${packageName}/Model no longer exposes a default or named Model alias`, () => {
    expect("default" in ModelSubpath).toBe(false);
    expect("Model" in ModelSubpath).toBe(false);
  });

  test("plan and docs lock the named-export-only subpath contract", () => {
    const plan = fs.readFileSync(
      path.resolve(process.cwd(), "validation tasks/Model-Subpath-Named-Exports-Plan.md"),
      "utf8",
    );
    const apiDoc = fs.readFileSync(
      path.resolve(process.cwd(), "src/documentation/api-reference.md"),
      "utf8",
    );
    const installDoc = fs.readFileSync(
      path.resolve(process.cwd(), "src/documentation/installation-and-quickstart.md"),
      "utf8",
    );

    expect(plan).toContain("# Model Subpath Named Exports Plan");
    expect(plan).toContain(`\`${packageName}/Model\``);
    expect(plan).toContain("Removed the default export from `src/Model.ts`.");
    expect(apiDoc).toContain(`\`${packageName}/Model\` does not expose a default export.`);
    expect(installDoc).toContain(
      `import { SqlModel, MongoModel, type ModelInstance } from "${packageName}/Model";`,
    );
  });
});
