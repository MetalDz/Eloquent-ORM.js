import fs from "fs";
import path from "path";

import { SafeFinderQuery } from "../core/model/SafeFinder.js";
import {
  applySafeFinderFilters,
  createSafeFinderQuery,
} from "../core/model/CoreModelSafeFinderSupport.js";

describe("ORM hardening phase 1 - CoreModel safe finder support extraction", () => {
  test("plan records the extracted CoreModel safe finder support seam", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/ORM-Hardening-Phase1-CoreModel-SafeFinder-Support-Extraction-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/core/model/CoreModelSafeFinderSupport.ts");
    expect(content).toContain("src/core/model/CoreModel.ts");
    expect(content).toContain(
      "src/lab_test/orm.hardening.phase1.coremodel-safefinder-support.logic.test.ts",
    );
  });

  test("createSafeFinderQuery builds the shared safe finder query instance", () => {
    class DummyModel {
      tableName = "dummy_models";
      connectionName = "sqlite" as const;

      async getDB(): Promise<unknown> {
        return null;
      }
    }

    const model = new DummyModel();
    const finder = createSafeFinderQuery(model, {
      name: "DummyModel",
      schema: {
        id: { kind: "column", type: "integer" } as any,
      },
      hydrateRow: (row) => (row ? Object.assign(new DummyModel(), row) : null),
      hydrateMany: (rows) => rows.map((row) => Object.assign(new DummyModel(), row)),
    });

    expect(finder).toBeInstanceOf(SafeFinderQuery);
    expect((finder as any).model).toBe(model);
    expect((finder as any).modelClass.name).toBe("DummyModel");
  });

  test("applySafeFinderFilters reuses a shared loop for keyed filter maps", () => {
    const finder = {
      where: jest.fn().mockReturnThis(),
    } as any;

    const result = applySafeFinderFilters(finder, {
      status: "active",
      published: true,
    });

    expect(result).toBe(finder);
    expect(finder.where).toHaveBeenNthCalledWith(1, "status", "active");
    expect(finder.where).toHaveBeenNthCalledWith(2, "published", true);
  });

  test("CoreModel delegates safe finder setup through the extracted support module", () => {
    const modelPath = path.resolve(process.cwd(), "src/core/model/CoreModel.ts");
    const content = fs.readFileSync(modelPath, "utf8");

    expect(content).toContain(
      'import { applySafeFinderFilters, createSafeFinderQuery } from "./CoreModelSafeFinderSupport.js";',
    );
    expect(content).toContain("return createSafeFinderQuery(");
    expect(content).toContain("return applySafeFinderFilters(this.safeFinder(), filters).get();");
    expect(content).toContain(
      "return (await applySafeFinderFilters(this.safeFinder(), filters).first()) !== null;",
    );
    expect(content).not.toContain("return new SafeFinderQuery(");
  });
});
