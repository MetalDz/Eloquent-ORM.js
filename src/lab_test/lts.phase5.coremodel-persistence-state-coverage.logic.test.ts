import fs from "fs";
import path from "path";

import {
  buildMongoPrimaryFilter,
  getOriginalPrimaryKeyValue,
} from "../core/model/CoreModelPersistenceState.js";

describe("LTS phase 5 CoreModelPersistenceState coverage", () => {
  test("plan tracks the dedicated CoreModelPersistenceState coverage slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-CoreModelPersistenceState-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 CoreModelPersistenceState Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/core/model/CoreModelPersistenceState.ts");
    expect(content).toContain(
      "src/lab_test/lts.phase5.coremodel-persistence-state-coverage.logic.test.ts",
    );
  });

  test("custom primary keys and original id/_id fallbacks are covered directly", () => {
    expect(buildMongoPrimaryFilter("slug", "alpha")).toEqual({ slug: "alpha" });

    expect(getOriginalPrimaryKeyValue({ id: 9 }, "_id")).toBe(9);
    expect(getOriginalPrimaryKeyValue({ _id: "mongo-9" }, "id")).toBe("mongo-9");
  });
});
