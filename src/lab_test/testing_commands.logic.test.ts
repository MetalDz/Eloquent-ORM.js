import fs from "fs";
import path from "path";

describe("testing command reference", () => {
  const rootDir = process.cwd();

  test("testing_commands.md documents the maintained npm script surface", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(rootDir, "package.json"), "utf8"),
    ) as {
      scripts?: Record<string, string>;
    };
    const documented = fs.readFileSync(
      path.resolve(rootDir, "src", "lab_test", "testing_commands.md"),
      "utf8",
    );

    const expectedScripts = [
      "typecheck",
      "test",
      "test:coverage",
      "coverage:misses",
      "test:critical",
      "test:mysql-smoke",
      "test:pack-smoke",
      "test:pack-smoke:docker",
      "docs:build",
      "docs:validate",
      "docs:lint",
      "build",
      "release",
      "docs:sync-package-metadata",
      "docs:sync-supported",
      "docs:sync-config",
      "dev",
      "cli",
    ];

    for (const scriptName of expectedScripts) {
      expect(packageJson.scripts?.[scriptName]).toBeDefined();
      expect(documented).toContain(`npm run ${scriptName}`);
    }
  });
});
