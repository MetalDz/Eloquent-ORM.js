import fs from "fs";
import path from "path";

describe("NodeNext source tree migration plan", () => {
  test("plan locks the non-breaking NodeNext migration strategy", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/NodeNext-Source-Tree-Migration-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# NodeNext Source Tree Migration Plan");
    expect(content).toContain("Status: LOCKED");
    expect(content).toContain("source/typecheck/dev flows use NodeNext rules");
    expect(content).toContain("published `dist/*` remains the CommonJS runtime surface");
    expect(content).toContain('`require("@alpha.consultings/eloquent-orm.js")` must keep working');
    expect(content).toContain('`import { ... } from "@alpha.consultings/eloquent-orm.js"` must keep working');
    expect(content).toContain("This is not an ESM-only migration.");
    expect(content).toContain("Split config responsibilities");
    expect(content).toContain("Update source imports and generated templates mechanically");
    expect(content).toContain("Expected Release Type");
    expect(content).toContain("`patch`");
  });
});
