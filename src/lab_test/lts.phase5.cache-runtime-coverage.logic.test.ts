import fs from "fs";
import path from "path";
import { CacheFallbackManager } from "../core/cache/CacheFallbackManager";

type DriverLike = {
  constructor: { name: string };
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  close?: () => Promise<void> | void;
  disconnect?: () => Promise<void> | void;
  end?: () => void;
};

function createDriver(
  name: string,
  overrides: Partial<DriverLike> = {},
): DriverLike {
  return {
    constructor: { name },
    get: async () => null,
    set: async () => undefined,
    delete: async () => undefined,
    clear: async () => undefined,
    ...overrides,
  };
}

async function loadFileCacheDriverWithFsMock(fsMock: Record<string, unknown>) {
  jest.resetModules();
  jest.doMock("fs/promises", () => ({
    __esModule: true,
    default: fsMock,
  }));
  const mod = await import("../core/cache/drivers/FileCacheDriver");
  return mod.FileCacheDriver;
}

describe("LTS phase 5 cache runtime coverage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
  });

  test("plan tracks the dedicated cache runtime coverage slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-Cache-Runtime-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 Cache Runtime Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/core/cache/CacheFallbackManager.ts");
    expect(content).toContain("src/core/cache/drivers/FileCacheDriver.ts");
    expect(content).toContain("src/lab_test/lts.phase5.cache-runtime-coverage.logic.test.ts");
  });

  test("CacheFallbackManager covers delete() and clear() wrapper paths", async () => {
    const deleteSpy = jest.fn(async () => undefined);
    const clearSpy = jest.fn(async () => undefined);
    const driver = createDriver("WrapperDriver", {
      delete: deleteSpy,
      clear: clearSpy,
    });

    CacheFallbackManager.useChain([driver as never]);

    await CacheFallbackManager.delete("cache-key");
    await CacheFallbackManager.clear();

    expect(deleteSpy).toHaveBeenCalledWith("cache-key");
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(CacheFallbackManager.getActiveDriver()).toBe(driver);
  });

  test("FileCacheDriver swallows constructor mkdir failure", async () => {
    const mkdir = jest.fn(async () => Promise.reject(new Error("mkdir failed")));
    const FileCacheDriver = await loadFileCacheDriverWithFsMock({
      mkdir,
      readFile: jest.fn(),
      writeFile: jest.fn(),
      unlink: jest.fn(),
      readdir: jest.fn(),
    });

    expect(() => new FileCacheDriver(".cache-lts5")).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));
    expect(mkdir).toHaveBeenCalledWith(".cache-lts5", { recursive: true });
  });

  test("FileCacheDriver swallows expired-entry unlink failure and returns null", async () => {
    const readFile = jest.fn(async () =>
      JSON.stringify({ value: 1, expiresAt: Date.now() - 1000 }),
    );
    const unlink = jest.fn(async () => Promise.reject(new Error("unlink failed")));
    const FileCacheDriver = await loadFileCacheDriverWithFsMock({
      mkdir: jest.fn(async () => undefined),
      readFile,
      writeFile: jest.fn(),
      unlink,
      readdir: jest.fn(),
    });

    const driver = new FileCacheDriver(".cache-lts5-expired");
    await expect(driver.get("expired")).resolves.toBeNull();
    expect(unlink).toHaveBeenCalled();
  });

  test("FileCacheDriver clear swallows unlink failures for discovered files", async () => {
    const readdir = jest.fn(async () => ["a.json", "b.json"]);
    const unlink = jest
      .fn()
      .mockRejectedValueOnce(new Error("unlink a failed"))
      .mockResolvedValueOnce(undefined);
    const FileCacheDriver = await loadFileCacheDriverWithFsMock({
      mkdir: jest.fn(async () => undefined),
      readFile: jest.fn(),
      writeFile: jest.fn(),
      unlink,
      readdir,
    });

    const driver = new FileCacheDriver(".cache-lts5-clear");
    await expect(driver.clear()).resolves.toBeUndefined();
    expect(readdir).toHaveBeenCalledWith(".cache-lts5-clear");
    expect(unlink).toHaveBeenCalledTimes(2);
  });
});
