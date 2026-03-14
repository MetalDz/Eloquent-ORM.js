import fs from "fs";
import path from "path";

describe("CLI bootstrap process.env compatibility", () => {
  test("CliBootstrapEnv remains structurally compatible with process.env", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/cli/utils/CliBootstrapSupport.ts"),
      "utf8"
    );

    const requiredSnippets = [
      "export type CliBootstrapEnv = {",
      "[key: string]: string | undefined;",
      "DB_CONNECTION?: string;",
      "DB_TEST_CONNECTION?: string;",
    ];

    for (const snippet of requiredSnippets) {
      expect(source).toContain(snippet);
    }
  });
});
