import fs from "fs";
import path from "path";
import { MorphRegistry } from "../core/orm/mixins/MorphRegistry.js";
import { MorphableMixin } from "../core/orm/mixins/MorphableMixin.js";

describe("LTS phase 5 MorphableMixin coverage and ASCII", () => {
  afterEach(() => {
    MorphRegistry.clear();
    jest.restoreAllMocks();
  });

  test("plan tracks the dedicated MorphableMixin coverage and ASCII slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-MorphableMixin-Coverage-And-ASCII-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 MorphableMixin Coverage and ASCII Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/core/orm/mixins/MorphableMixin.ts");
    expect(content).toContain(
      "src/lab_test/lts.phase5.morphable-mixin.coverage-and-ascii.logic.test.ts",
    );
  });

  test("source file uses ASCII comments and normalized ERROR text", () => {
    const filePath = path.resolve(process.cwd(), "src/core/orm/mixins/MorphableMixin.ts");
    const content = fs.readFileSync(filePath, "utf8");

    expect(content).toContain("Base interface for all morphable ORM models.");
    expect(content).toContain("Type for ORM-like query builders.");
    expect(content).toContain("ERROR: Model");
    expect(content).not.toContain("â");
    expect(content).not.toContain("ً");
  });

  test("constructor registers a morphable subclass only once", () => {
    class EmptyBase {}
    class MorphModel extends MorphableMixin(EmptyBase) {}

    const registerSpy = jest.spyOn(MorphRegistry, "register");

    new MorphModel();
    new MorphModel();

    expect(registerSpy).toHaveBeenCalledTimes(1);
  });

  test("morph helpers reject related models without query() or where()", async () => {
    class EmptyBase {}
    class MorphModel extends MorphableMixin(EmptyBase) {
      id = 7;
    }

    const model = new MorphModel() as unknown as {
      morphOne(related: Record<string, never>, relationName: string): Promise<unknown>;
      morphMany(related: Record<string, never>, relationName: string): Promise<unknown[]>;
    };

    await expect(model.morphOne({}, "commentable")).rejects.toThrow(
      "ERROR: Model 'AnonymousModel' does not implement query()/where().",
    );
    await expect(model.morphMany({}, "commentable")).rejects.toThrow(
      "ERROR: Model 'AnonymousModel' does not implement query()/where().",
    );
  });
});
