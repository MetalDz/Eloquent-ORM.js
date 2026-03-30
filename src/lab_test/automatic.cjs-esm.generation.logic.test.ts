import fs from "fs";
import path from "path";

describe("automatic cjs esm generation plan", () => {
  test("plan locks build-driven regeneration of the dual package surface", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/Automatic-CJS-ESM-Generation-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# Automatic CJS ESM Generation Plan");
    expect(content).toContain("Status: LOCKED");
    expect(content).toContain("Make `npm run build` regenerate the published dual-package surface automatically");
    expect(content).toContain("`dist/*` remains the CommonJS runtime surface");
    expect(content).toContain("`esm/*` becomes generated build output for ESM / NodeNext consumers");
    expect(content).toContain("Do not convert the whole source tree to NodeNext.");
    expect(content).toContain("Do not make the package ESM-only.");
    expect(content).toContain("Regenerate the package root ESM entrypoint.");
    expect(content).toContain("Regenerate the `Factory` ESM subpath entrypoint.");
    expect(content).toContain("Regenerate the `Model` ESM subpath entrypoint.");
    expect(content).toContain("release as `patch`");
  });
});
