import fs from "fs";
import path from "path";

import { CoreModel } from "../core/model/CoreModel";
import { BaseModelSafeFinderStaticsMixin } from "../core/model/BaseModelSafeFinderStatics";

describe("LTS phase 5 BaseModelSafeFinderStatics coverage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test("plan tracks the dedicated BaseModelSafeFinderStatics coverage slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-BaseModelSafeFinderStatics-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 BaseModelSafeFinderStatics Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/core/model/BaseModelSafeFinderStatics.ts");
    expect(content).toContain(
      "src/lab_test/lts.phase5.basemodel-safefinder-statics-coverage.logic.test.ts",
    );
  });

  test("static safe finder mixin delegates every method to CoreModel with the mixed class context", async () => {
    abstract class DummyBase {}
    const MixedBase = BaseModelSafeFinderStaticsMixin(DummyBase as any);

    class FinderModel extends MixedBase {}

    const whereResult = { type: "where" };
    const withResult = { type: "with" };
    const activeResult = { type: "active" };
    const inactiveResult = { type: "inactive" };
    const publishedResult = { type: "published" };
    const orderByResult = { type: "orderBy" };
    const limitResult = { type: "limit" };
    const getResult = [{ id: 1 }];
    const firstResult = { id: 1 };
    const findByResult = { type: "findBy" };
    const findOneByResult = { id: 2 };
    const findAllByResult = [{ id: 3 }];

    const whereSpy = jest
      .spyOn(CoreModel, "where")
      .mockImplementation(function (this: unknown, field: string, value: unknown) {
        expect(this).toBe(FinderModel);
        expect(field).toBe("name");
        expect(value).toBe("Ada");
        return whereResult as any;
      });
    const withSpy = jest
      .spyOn(CoreModel, "with")
      .mockImplementation(function (this: unknown, ...relations: string[]) {
        expect(this).toBe(FinderModel);
        expect(relations).toEqual(["posts", "profile"]);
        return withResult as any;
      });
    const activeSpy = jest
      .spyOn(CoreModel, "active")
      .mockImplementation(function (this: unknown, ...args: unknown[]) {
        expect(this).toBe(FinderModel);
        expect(args).toEqual(["status"]);
        return activeResult as any;
      });
    const inactiveSpy = jest
      .spyOn(CoreModel, "inactive")
      .mockImplementation(function (this: unknown, ...args: unknown[]) {
        expect(this).toBe(FinderModel);
        expect(args).toEqual(["status"]);
        return inactiveResult as any;
      });
    const publishedSpy = jest
      .spyOn(CoreModel, "published")
      .mockImplementation(function (this: unknown, ...args: unknown[]) {
        expect(this).toBe(FinderModel);
        expect(args).toEqual(["published_at"]);
        return publishedResult as any;
      });
    const orderBySpy = jest
      .spyOn(CoreModel, "orderBy")
      .mockImplementation(function (
        this: unknown,
        field: string,
        direction?: "asc" | "desc",
      ) {
        expect(this).toBe(FinderModel);
        return { field, direction } as any;
      });
    const limitSpy = jest
      .spyOn(CoreModel, "limit")
      .mockImplementation(function (this: unknown, count: number) {
        expect(this).toBe(FinderModel);
        expect(count).toBe(5);
        return limitResult as any;
      });
    const getSpy = jest.spyOn(CoreModel, "get").mockImplementation(async function (this: unknown) {
      expect(this).toBe(FinderModel);
      return getResult as any;
    });
    const firstSpy = jest
      .spyOn(CoreModel, "first")
      .mockImplementation(async function (this: unknown) {
        expect(this).toBe(FinderModel);
        return firstResult as any;
      });
    const findBySpy = jest
      .spyOn(CoreModel, "findBy")
      .mockImplementation(function (this: unknown, field: string, value: unknown) {
        expect(this).toBe(FinderModel);
        expect(field).toBe("email");
        expect(value).toBe("ada@example.com");
        return findByResult as any;
      });
    const findOneBySpy = jest
      .spyOn(CoreModel, "findOneBy")
      .mockImplementation(async function (this: unknown, field: string, value: unknown) {
        expect(this).toBe(FinderModel);
        expect(field).toBe("email");
        expect(value).toBe("ada@example.com");
        return findOneByResult as any;
      });
    const findAllBySpy = jest
      .spyOn(CoreModel, "findAllBy")
      .mockImplementation(async function (this: unknown, filters: Record<string, unknown>) {
        expect(this).toBe(FinderModel);
        expect(filters).toEqual({ status: "active" });
        return findAllByResult as any;
      });
    const existsBySpy = jest
      .spyOn(CoreModel, "existsBy")
      .mockImplementation(async function (this: unknown, filters: Record<string, unknown>) {
        expect(this).toBe(FinderModel);
        expect(filters).toEqual({ status: "active" });
        return true;
      });

    const Model = FinderModel as typeof FinderModel & {
      where(field: string, value: unknown): unknown;
      with(...relations: string[]): unknown;
      active(...args: unknown[]): unknown;
      inactive(...args: unknown[]): unknown;
      published(...args: unknown[]): unknown;
      orderBy(field: string, direction?: "asc" | "desc"): unknown;
      limit(count: number): unknown;
      get(): Promise<unknown[]>;
      first(): Promise<unknown>;
      findBy(field: string, value: unknown): unknown;
      findOneBy(field: string, value: unknown): Promise<unknown>;
      findAllBy(filters: Record<string, unknown>): Promise<unknown[]>;
      existsBy(filters: Record<string, unknown>): Promise<boolean>;
    };

    expect(Model.where("name", "Ada")).toBe(whereResult);
    expect(Model.with("posts", "profile")).toBe(withResult);
    expect(Model.active("status")).toBe(activeResult);
    expect(Model.inactive("status")).toBe(inactiveResult);
    expect(Model.published("published_at")).toBe(publishedResult);
    expect(Model.orderBy("created_at")).toEqual({ field: "created_at", direction: "asc" });
    expect(Model.orderBy("created_at", "desc")).toEqual({
      field: "created_at",
      direction: "desc",
    });
    expect(Model.limit(5)).toBe(limitResult);
    await expect(Model.get()).resolves.toEqual(getResult);
    await expect(Model.first()).resolves.toEqual(firstResult);
    expect(Model.findBy("email", "ada@example.com")).toBe(findByResult);
    await expect(Model.findOneBy("email", "ada@example.com")).resolves.toEqual(
      findOneByResult,
    );
    await expect(Model.findAllBy({ status: "active" })).resolves.toEqual(findAllByResult);
    await expect(Model.existsBy({ status: "active" })).resolves.toBe(true);

    expect(whereSpy).toHaveBeenCalledTimes(1);
    expect(withSpy).toHaveBeenCalledTimes(1);
    expect(activeSpy).toHaveBeenCalledTimes(1);
    expect(inactiveSpy).toHaveBeenCalledTimes(1);
    expect(publishedSpy).toHaveBeenCalledTimes(1);
    expect(orderBySpy).toHaveBeenNthCalledWith(1, "created_at", "asc");
    expect(orderBySpy).toHaveBeenNthCalledWith(2, "created_at", "desc");
    expect(limitSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(firstSpy).toHaveBeenCalledTimes(1);
    expect(findBySpy).toHaveBeenCalledTimes(1);
    expect(findOneBySpy).toHaveBeenCalledTimes(1);
    expect(findAllBySpy).toHaveBeenCalledTimes(1);
    expect(existsBySpy).toHaveBeenCalledTimes(1);
  });
});
