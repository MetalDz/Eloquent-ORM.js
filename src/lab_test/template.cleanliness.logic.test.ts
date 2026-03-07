import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const templatesDir = path.resolve(rootDir, "src/cli/templates");

describe("CLI template cleanliness contract", () => {
  test("all template files are ASCII, tab-free, and have stable formatting", () => {
    const files = fs
      .readdirSync(templatesDir)
      .filter((entry) => entry.endsWith(".tpl"))
      .sort((a, b) => a.localeCompare(b));

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const fullPath = path.join(templatesDir, file);
      const content = fs.readFileSync(fullPath, "utf8");

      expect(content).not.toMatch(/[^\x00-\x7F]/);
      expect(content).not.toContain("\t");
      expect(content).toMatch(/\n$/);

      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        expect(line).toBe(line.replace(/\s+$/u, ""));
      }
    }
  });
});
