import fs from "fs";
import path from "path";

describe("release docs commit policy", () => {
  const rootDir = process.cwd();
  const publicCadencePath = path.resolve(rootDir, "docs", "release", "cadence.mdx");
  const sourceCadencePath = path.resolve(rootDir, "src", "documentation", "release-cadence.md");

  test("release cadence docs explain the docs commit release rule", () => {
    const publicCadence = fs.readFileSync(publicCadencePath, "utf8");
    const sourceCadence = fs.readFileSync(sourceCadencePath, "utf8");

    for (const content of [publicCadence, sourceCadence]) {
      expect(content).toContain("semantic-release evaluates commit message types, not changed files");
      expect(content).toContain("`docs:` commits are configured to publish a patch release");
      expect(content).toContain("use `docs:` for documentation changes that should ship to consumers");
      expect(content).toContain("do not use `chore:` for releasable documentation updates");
      expect(content).toContain("`chore:` remains non-releasing unless another configured rule says otherwise");
    }
  });
});
