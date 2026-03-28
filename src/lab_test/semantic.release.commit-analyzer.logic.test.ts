import fs from "fs";
import path from "path";

describe("semantic-release commit analyzer rules", () => {
  const rootDir = process.cwd();
  const releaseConfigPath = path.resolve(rootDir, ".releaserc.json");

  test("docs commits are promoted to a patch release", () => {
    const releaseConfig = JSON.parse(fs.readFileSync(releaseConfigPath, "utf8")) as {
      plugins: Array<string | [string, { preset?: string; releaseRules?: Array<{ type?: string; release?: string }> }]>;
    };

    const commitAnalyzerPlugin = releaseConfig.plugins.find(
      (plugin): plugin is [string, { preset?: string; releaseRules?: Array<{ type?: string; release?: string }> }] =>
        Array.isArray(plugin) && plugin[0] === "@semantic-release/commit-analyzer",
    );

    expect(commitAnalyzerPlugin).toBeDefined();
    expect(commitAnalyzerPlugin?.[1].preset).toBeUndefined();
    expect(commitAnalyzerPlugin?.[1].releaseRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "docs",
          release: "patch",
        }),
      ]),
    );
  });
});
