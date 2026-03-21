import fs from "fs";
import path from "path";

describe("Mintlify theme contract", () => {
  const rootDir = process.cwd();

  test("root mint.json uses a supported Mintlify theme", () => {
    const mintConfig = JSON.parse(
      fs.readFileSync(path.resolve(rootDir, "mint.json"), "utf8")
    ) as { theme?: string };

    expect(mintConfig.theme).toBeDefined();
    expect([
      "mint",
      "maple",
      "palm",
      "willow",
      "linden",
      "almond",
      "aspen",
      "luma",
      "sequoia",
    ]).toContain(mintConfig.theme);
  });
});
