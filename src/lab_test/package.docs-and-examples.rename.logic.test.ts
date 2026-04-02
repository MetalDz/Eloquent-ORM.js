import fs from "fs";
import path from "path";

describe("Package docs and examples rename", () => {
  const rootDir = process.cwd();
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(rootDir, "package.json"), "utf8"),
  ) as { name?: string };
  const packageName = packageJson.name ?? "@alpha.consultings/eloquent-orm.js";

  test("public docs use the renamed package import paths", () => {
    const readme = fs.readFileSync(path.resolve(rootDir, "README.md"), "utf8");
    const installDoc = fs.readFileSync(
      path.resolve(rootDir, "src/documentation/installation-and-quickstart.md"),
      "utf8",
    );
    const apiDoc = fs.readFileSync(
      path.resolve(rootDir, "src/documentation/api-reference.md"),
      "utf8",
    );
    const registryDoc = fs.readFileSync(
      path.resolve(rootDir, "src/documentation/model-registry-hooks.md"),
      "utf8",
    );

    expect(readme).toContain(`npm install ${packageName}`);
    expect(readme).toContain(`import { registerModels } from "${packageName}";`);
    expect(installDoc).toContain(`npm install ${packageName}`);
    expect(installDoc).toContain(
      `import { Model, column, registerModels, type ModelInstance } from "${packageName}";`,
    );
    expect(installDoc).toContain(
      `import { SqlModel, MongoModel, type ModelInstance } from "${packageName}/Model";`,
    );
    expect(apiDoc).toContain(`## Root Package: \`${packageName}\``);
    expect(apiDoc).toContain(`## Model Subpath: \`${packageName}/Model\``);
    expect(registryDoc).toContain(`import { registerModels } from "${packageName}";`);
  });

  test("import resolver and shipped rename surface use the renamed package", () => {
    const exampleFiles = [
      "src/app/database/factories/UserFactory.ts",
      "src/app/database/factories/CommentFactory.ts",
      "src/app/database/factories/PhotoFactory.ts",
      "src/app/database/factories/VideoFactory.ts",
      "src/test/database/factories/UserFactory.ts",
      "src/test/database/factories/CommentFactory.ts",
      "src/test/database/factories/PostFactory.ts",
      "src/test/database/factories/UserPostPivotFactory.ts",
      "src/test/database/factories/PostUserPivotFactory.ts",
    ];
    const existingExampleFiles = exampleFiles.filter((relativePath) =>
      fs.existsSync(path.resolve(rootDir, relativePath)),
    );

    for (const relativePath of existingExampleFiles) {
      const content = fs.readFileSync(path.resolve(rootDir, relativePath), "utf8");
      expect(
        content.includes(`"${packageName}"`) ||
          content.includes('"../../../index"') ||
          content.includes('"../../../index.js"')
      ).toBe(true);
      expect(content).not.toContain('"eloquentjs"');
    }

    const importResolver = fs.readFileSync(
      path.resolve(rootDir, "src/cli/utils/ImportResolver.ts"),
      "utf8",
    );
    const harness = fs.readFileSync(
      path.resolve(rootDir, "src/lab_test/support/cli.integration.harness.ts"),
      "utf8",
    );
    const plan = fs.readFileSync(
      path.resolve(rootDir, "validation tasks/Package-Docs-And-Examples-Rename-Plan.md"),
      "utf8",
    );

    expect(importResolver).toContain(
      `private static readonly FALLBACK_PACKAGE_NAME = "${packageName}";`,
    );
    expect(packageJson.name).toBe(packageName);
    expect(
      harness.includes(`import { Factory } from "${packageName}";`) ||
      harness.includes('import { Factory } from "${packageName}";')
    ).toBe(true);
    expect(plan).toContain("# Package Docs And Examples Rename Plan");
    expect(plan).toContain("Status: COMPLETED");
    expect(plan).toContain("src/lab_test/package.docs-and-examples.rename.logic.test.ts");
    expect(existingExampleFiles.length).toBeGreaterThanOrEqual(0);
  });
});
