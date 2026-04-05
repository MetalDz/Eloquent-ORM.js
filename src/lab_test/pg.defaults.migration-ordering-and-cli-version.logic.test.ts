import fs from "fs";
import path from "path";

describe("pg defaults, migration ordering, and cli version contract", () => {
  const rootDir = process.cwd();

  test("validation note records the completed fix scope and semver rule", () => {
    const notePath = path.resolve(
      rootDir,
      "validation tasks/PG-Defaults-Migration-Ordering-And-CLI-Version-Plan.md"
    );
    const note = fs.readFileSync(notePath, "utf8");

    expect(note).toContain("Status: COMPLETED");
    expect(note).toContain("PostgreSQL boolean defaults must emit `TRUE` / `FALSE`");
    expect(note).toContain("static database.foreignKeys");
    expect(note).toContain("CLI banner version text must be resolved from `package.json`");
    expect(note).toContain("CLI-only fixes are `patch`");
  });

  test("public versioning docs lock CLI version tracking and semver classification", () => {
    const sourcePolicy = fs.readFileSync(
      path.resolve(rootDir, "src/documentation/versioning-policy.md"),
      "utf8"
    );
    const publicPolicy = fs.readFileSync(
      path.resolve(rootDir, "docs/support/versioning-policy.mdx"),
      "utf8"
    );

    for (const content of [sourcePolicy, publicPolicy]) {
      expect(content).toContain("CLI");
      expect(content).toContain("package version");
      expect(content).toContain("patch");
      expect(content).toContain("minor");
    }
  });
});
