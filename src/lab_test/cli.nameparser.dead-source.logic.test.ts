import fs from "fs";
import path from "path";

describe("CLI nameParser dead source removal", () => {
  const rootDir = process.cwd();

  test("plan records the dead-source removal decision", () => {
    const plan = fs.readFileSync(
      path.resolve(rootDir, "validation tasks/CLI-NameParser-Dead-Source-Removal-Plan.md"),
      "utf8",
    );

    expect(plan).toContain("# CLI NameParser Dead Source Removal Plan");
    expect(plan).toContain("Status: COMPLETED");
    expect(plan).toContain("src/cli/utils/nameParser.ts");
    expect(plan).toContain("unreferenced zero-byte source file");
  });

  test("nameParser source file is removed from the repo", () => {
    expect(
      fs.existsSync(path.resolve(rootDir, "src/cli/utils/nameParser.ts")),
    ).toBe(false);
  });
});
