import fs from "fs";
import os from "os";
import path from "path";

describe("NodeNext blocker inventory", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.unmock("fs");
  });

  test("generated inventory snapshot stays in sync with the audit generator", () => {
    const actualFs = jest.requireActual("fs") as typeof fs;
    const {
      buildNodeNextBlockerInventory,
      renderMarkdownReport,
    } = jest.requireActual("../../scripts/generate-nodenext-blocker-inventory.cjs") as {
      buildNodeNextBlockerInventory: (options?: { cwd?: string }) => unknown;
      renderMarkdownReport: (inventory: unknown) => string;
    };

    const cwd = process.cwd();
    const inventory = buildNodeNextBlockerInventory({ cwd });
    const expectedJson = `${JSON.stringify(inventory, null, 2)}\n`;
    const expectedMarkdown = renderMarkdownReport(inventory);

    const committedJson = actualFs.readFileSync(
      path.resolve(cwd, "validation tasks", "NodeNext-Blocker-Inventory.json"),
      "utf8",
    );
    const committedMarkdown = actualFs.readFileSync(
      path.resolve(cwd, "validation tasks", "NodeNext-Blocker-Inventory.md"),
      "utf8",
    );

    expect(committedJson).toBe(expectedJson);
    expect(committedMarkdown).toBe(expectedMarkdown);
  });

  test("AST-based source scan counts real imports and ignores comment examples", () => {
    const actualFs = jest.requireActual("fs") as typeof fs;
    const {
      buildNodeNextBlockerInventory,
    } = jest.requireActual("../../scripts/generate-nodenext-blocker-inventory.cjs") as {
      buildNodeNextBlockerInventory: (options?: { cwd?: string }) => {
        source: {
          totalMatches: number;
          byKind: Array<{ kind: string; matches: number }>;
        };
      };
    };

    const tempRoot = actualFs.mkdtempSync(
      path.join(os.tmpdir(), "eloquent-nodenext-blocker-inventory-"),
    );
    const srcDir = path.join(tempRoot, "src");
    actualFs.mkdirSync(srcDir, { recursive: true });
    actualFs.writeFileSync(
      path.join(tempRoot, "package.json"),
      JSON.stringify({ name: "@alpha.consultings/eloquent-orm.js" }, null, 2),
      "utf8",
    );
    actualFs.writeFileSync(path.join(srcDir, "dep.ts"), "export const dep = 1;\n", "utf8");
    actualFs.writeFileSync(path.join(srcDir, "lazy.ts"), "export const lazy = 1;\n", "utf8");
    actualFs.writeFileSync(path.join(srcDir, "types.ts"), "export type LazyType = string;\n", "utf8");
    actualFs.writeFileSync(path.join(srcDir, "legacy.ts"), "module.exports = 1;\n", "utf8");
    actualFs.writeFileSync(
      path.join(srcDir, "entry.ts"),
      [
        'import { dep } from "./dep.js";',
        'const lazy = () => import("./lazy.js");',
        'type LazyType = import("./types.js").LazyType;',
        'const legacy = require("./legacy");',
        '// import { fake } from "./fake";',
        'const note = "import(\'./not-real\')";',
        "void dep;",
        "void lazy;",
        "void legacy;",
      ].join("\n"),
      "utf8",
    );

    try {
      const inventory = buildNodeNextBlockerInventory({ cwd: tempRoot });
      const byKind = Object.fromEntries(
        inventory.source.byKind.map((entry) => [entry.kind, entry.matches]),
      );

      expect(inventory.source.totalMatches).toBe(4);
      expect(byKind["runtime-qualified import/export local specifiers"]).toBe(1);
      expect(byKind["runtime-qualified dynamic local specifiers"]).toBe(2);
      expect(byKind["local require() calls"]).toBe(1);
      expect(byKind["extensionless import/export local specifiers"]).toBeUndefined();
    } finally {
      actualFs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
