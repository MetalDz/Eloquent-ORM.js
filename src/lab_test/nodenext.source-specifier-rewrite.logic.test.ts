import fs from "fs";
import os from "os";
import path from "path";

describe("NodeNext source specifier rewrite", () => {
  test("plan tracks the task 6 mechanical rewrite slice", () => {
    const plan = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "validation tasks/NodeNext-Source-Specifier-Rewrite-Plan.md",
      ),
      "utf8",
    );

    expect(plan).toContain("# NodeNext Source Specifier Rewrite Plan");
    expect(plan).toContain("Status: COMPLETED");
    expect(plan).toContain("scripts/rewrite-nodenext-source-specifiers.cjs");
    expect(plan).toContain("src/lab_test/nodenext.source-specifier-rewrite.logic.test.ts");
  });

  test("codemod rewrites resolvable relative ESM specifiers and leaves others alone", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      rewriteNodeNextSourceSpecifiers,
      resolveNodeNextRuntimeSpecifier,
    } = require("../../scripts/rewrite-nodenext-source-specifiers.cjs") as {
      rewriteNodeNextSourceSpecifiers: (options?: {
        cwd?: string;
        roots?: string[];
        write?: boolean;
      }) => {
        filesChanged: number;
        specifierChanges: number;
      };
      resolveNodeNextRuntimeSpecifier: (specifier: string, sourceFilePath: string) => string;
    };

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-nodenext-rewrite-"));
    const srcDir = path.join(tempRoot, "src");
    const nestedDir = path.join(srcDir, "nested");
    const servicesDir = path.join(srcDir, "services");
    fs.mkdirSync(nestedDir, { recursive: true });
    fs.mkdirSync(servicesDir, { recursive: true });

    fs.writeFileSync(path.join(srcDir, "beta.ts"), "export const beta = 1;\n", "utf8");
    fs.writeFileSync(path.join(srcDir, "gamma.ts"), "export const gamma = 1;\n", "utf8");
    fs.writeFileSync(path.join(srcDir, "delta.ts"), "export const delta = 1;\n", "utf8");
    fs.writeFileSync(path.join(srcDir, "epsilon.ts"), "export type Epsilon = string;\n", "utf8");
    fs.writeFileSync(path.join(srcDir, "zeta.ts"), "export const zeta = 1;\n", "utf8");
    fs.writeFileSync(path.join(nestedDir, "index.ts"), "export const nested = 1;\n", "utf8");

    const entryPath = path.join(servicesDir, "entry.ts");
    fs.writeFileSync(
      entryPath,
      [
        'import fs from "fs";',
        'import { beta } from "../beta";',
        'export { gamma } from "../gamma";',
        'export * from "../nested";',
        'const lazy = () => import("../delta");',
        'type Imported = import("../epsilon").Epsilon;',
        'const already = () => import("../zeta.js");',
        'const req = require("../zeta");',
        "void fs;",
        "void beta;",
        "void lazy;",
        "void already;",
        "void req;",
      ].join("\n"),
      "utf8",
    );

    try {
      expect(resolveNodeNextRuntimeSpecifier("../beta", entryPath)).toBe("../beta.js");
      expect(resolveNodeNextRuntimeSpecifier("../nested", entryPath)).toBe("../nested/index.js");
      expect(resolveNodeNextRuntimeSpecifier("../zeta.js", entryPath)).toBe("../zeta.js");

      const summary = rewriteNodeNextSourceSpecifiers({
        cwd: tempRoot,
        roots: ["src"],
      });

      expect(summary.filesChanged).toBe(1);
      expect(summary.specifierChanges).toBe(5);

      const rewritten = fs.readFileSync(entryPath, "utf8");
      expect(rewritten).toContain('import { beta } from "../beta.js";');
      expect(rewritten).toContain('export { gamma } from "../gamma.js";');
      expect(rewritten).toContain('export * from "../nested/index.js";');
      expect(rewritten).toContain('const lazy = () => import("../delta.js");');
      expect(rewritten).toContain('type Imported = import("../epsilon.js").Epsilon;');
      expect(rewritten).toContain('const already = () => import("../zeta.js");');
      expect(rewritten).toContain('const req = require("../zeta");');
      expect(rewritten).toContain('import fs from "fs";');
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
