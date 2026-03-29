import fs from "fs";
import path from "path";

describe("release open bugs tracker", () => {
  const rootDir = process.cwd();

  test("docs and source docs both track the current open-bug count", () => {
    const docsPage = fs.readFileSync(
      path.resolve(rootDir, "docs", "release", "open-bugs.mdx"),
      "utf8",
    );
    const sourcePage = fs.readFileSync(
      path.resolve(rootDir, "src", "documentation", "open-bugs.md"),
      "utf8",
    );

    expect(docsPage).toContain("Tracked open bugs: `0`");
    expect(sourcePage).toContain("Tracked open bugs: `0`");
    expect(docsPage).toContain("No unresolved reproducible ORM bugs are currently tracked");
    expect(sourcePage).toContain("No unresolved reproducible ORM bugs are currently tracked");
  });

  test("readme quick info links What's new to the stable official release summary page", () => {
    const readme = fs.readFileSync(path.resolve(rootDir, "README.md"), "utf8");

    expect(readme).toContain(
      "https://alphaconsultings.mintlify.app/release/latest-release-summary",
    );
  });
});
