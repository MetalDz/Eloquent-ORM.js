import fs from "fs";
import os from "os";
import path from "path";

describe("LTS phase 5 ImportResolver coverage", () => {
  const rootDir = process.cwd();
  const packageName = (
    JSON.parse(fs.readFileSync(path.resolve(rootDir, "package.json"), "utf8")) as {
      name?: string;
    }
  ).name ?? "@alpha.consultings/eloquent-orm.js";

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    process.chdir(rootDir);
  });

  test("plan tracks the dedicated ImportResolver coverage slice", () => {
    const planPath = path.resolve(
      rootDir,
      "validation tasks/LTS-Phase5-ImportResolver-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 ImportResolver Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/ImportResolver.ts");
    expect(content).toContain("src/lab_test/lts.phase5.import-resolver-coverage.logic.test.ts");
  });

  test("outside the repo all generator-facing imports resolve through the installed package name", async () => {
    const outsideRepo = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-import-resolver-outside-"));
    const fsModule = require("fs") as typeof import("fs");
    const originalReadFileSync = fsModule.readFileSync.bind(fsModule);
    const readSpy = jest
      .spyOn(fsModule, "readFileSync")
      .mockImplementation(((filePath: fs.PathOrFileDescriptor, ...args: unknown[]) => {
        if (typeof filePath === "string" && filePath.endsWith(`${path.sep}package.json`)) {
          return '{ "name": "custom-eloquent" }' as never;
        }

        return originalReadFileSync(filePath, ...(args as [BufferEncoding?])) as never;
      }) as typeof fs.readFileSync);
    const cwdSpy = jest.spyOn(process, "cwd").mockReturnValue(outsideRepo);

    const { ImportResolver } = await import("../cli/utils/ImportResolver");

    expect(ImportResolver.coreImportPath(true)).toBe("custom-eloquent");
    expect(ImportResolver.schemaImportPath(false)).toBe("custom-eloquent");
    expect(ImportResolver.publicApiImportPath()).toBe("custom-eloquent");

    readSpy.mockRestore();
    cwdSpy.mockRestore();
    fs.rmSync(outsideRepo, { recursive: true, force: true });
  });

  test("package-name read failures fall back to the published package name for installed-package imports", async () => {
    const outsideRepo = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-import-resolver-fallback-"));
    const fsModule = require("fs") as typeof import("fs");
    const originalReadFileSync = fsModule.readFileSync.bind(fsModule);
    const readSpy = jest.spyOn(fsModule, "readFileSync").mockImplementation(
      ((filePath: fs.PathOrFileDescriptor, ...args: unknown[]) => {
        if (typeof filePath === "string" && filePath.endsWith(`${path.sep}package.json`)) {
          throw new Error("package-json-unavailable");
        }

        return originalReadFileSync(filePath, ...(args as [BufferEncoding?])) as never;
      }) as typeof fs.readFileSync,
    );
    const cwdSpy = jest.spyOn(process, "cwd").mockReturnValue(outsideRepo);

    const { ImportResolver } = await import("../cli/utils/ImportResolver");

    expect(ImportResolver.coreImportPath(false)).toBe(packageName);
    expect(ImportResolver.schemaImportPath(true)).toBe(packageName);
    expect(ImportResolver.publicApiImportPath()).toBe(packageName);

    readSpy.mockRestore();
    cwdSpy.mockRestore();
    fs.rmSync(outsideRepo, { recursive: true, force: true });
  });

  test("inside the repo the public API import path remains relative", async () => {
    jest.spyOn(process, "cwd").mockReturnValue(rootDir);

    const { ImportResolver } = await import("../cli/utils/ImportResolver");

    expect(ImportResolver.publicApiImportPath()).toBe("../index");
  });

  test("inside the repo the public API import path resolves relative to the generated file", async () => {
    jest.spyOn(process, "cwd").mockReturnValue(rootDir);

    const { ImportResolver } = await import("../cli/utils/ImportResolver");

    expect(
      ImportResolver.publicApiImportPath(
        path.join(rootDir, "src", "app", "database", "factories", "UserFactory.ts"),
      ),
    ).toBe("../../../index");
    expect(
      ImportResolver.publicApiImportPath(
        path.join(rootDir, "src", "test", "database", "factories", "UserFactory.ts"),
      ),
    ).toBe("../../../index");
    expect(
      ImportResolver.publicApiImportPath(
        path.join(rootDir, "src", "app", "registerModels.ts"),
      ),
    ).toBe("../index");
  });

  test("inside the repo same-directory imports are normalized with a leading ./ prefix", async () => {
    jest.spyOn(process, "cwd").mockReturnValue(rootDir);

    const { ImportResolver } = await import("../cli/utils/ImportResolver");

    expect(
      ImportResolver.publicApiImportPath(
        path.join(rootDir, "src", "registerModels.ts"),
      ),
    ).toBe("./index");
  });
});
