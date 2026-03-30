import fs from "fs";
import path from "path";

describe("root esm factory eager-load bug note", () => {
  test("bug note records the cause, non-breaking scope, and release-note wording", () => {
    const notePath = path.resolve(
      process.cwd(),
      "validation tasks/Root-ESM-Factory-Eager-Load-Bug-Note.md",
    );
    const content = fs.readFileSync(notePath, "utf8");

    expect(content).toContain("# Root ESM Factory Eager Load Bug Note");
    expect(content).toContain("Status: LOCKED");
    expect(content).toContain('import { Model } from "@alpha.consultings/eloquent-orm.js"');
    expect(content).toContain("@faker-js/faker");
    expect(content).toContain("Must use import to load ES Module");
    expect(content).toContain('CommonJS `require("@alpha.consultings/eloquent-orm.js")`');
    expect(content).toContain("Does not mean the package should become ESM-only.");
    expect(content).toContain("The published root ESM entry must not eagerly import `Factory`.");
    expect(content).toContain("What's new headline:");
    expect(content).toContain(
      "Patched. Root ESM imports no longer touch Factory eagerly, preserving CommonJS and NodeNext compatibility.",
    );
    expect(content).toContain("Exact update summary:");
    expect(content).toContain(
      "Fix the published root ESM surface so non-factory root imports no longer trigger the factory runtime, preserving CommonJS consumers and stabilizing NodeNext/Jest ESM usage.",
    );
  });
});
