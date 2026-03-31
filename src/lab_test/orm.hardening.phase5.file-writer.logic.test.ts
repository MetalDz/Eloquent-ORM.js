import fs from "fs";
import os from "os";
import path from "path";

jest.mock("chalk", () => ({
  __esModule: true,
  default: {
    cyan: (value: string) => value,
    yellow: (value: string) => value,
    greenBright: (value: string) => value,
    green: (value: string) => value,
    red: (value: string) => value,
  },
}));

import { overwriteFile, writeFileSafe } from "../cli/utils/fileWriter.js";

describe("ORM hardening phase 5 fileWriter operations", () => {
  const tempDirs: string[] = [];
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  function makeTempDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-phase5-filewriter-"));
    tempDirs.push(dir);
    return dir;
  }

  test("writeFileSafe creates the parent directory and the file once", () => {
    const tempDir = makeTempDir();
    const filePath = path.join(tempDir, "nested", "UserService.ts");

    const created = writeFileSafe(filePath, "export const ok = true;\n");

    expect(created).toBe(true);
    expect(fs.readFileSync(filePath, "utf8")).toBe("export const ok = true;\n");
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Created directory:"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Created file:"));
  });

  test("writeFileSafe skips existing files without changing content", () => {
    const tempDir = makeTempDir();
    const filePath = path.join(tempDir, "UserController.ts");
    fs.writeFileSync(filePath, "original\n", "utf8");

    const created = writeFileSafe(filePath, "changed\n");

    expect(created).toBe(false);
    expect(fs.readFileSync(filePath, "utf8")).toBe("original\n");
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("File already exists, skipped:"));
  });

  test("overwriteFile creates parent directories and replaces existing content", () => {
    const tempDir = makeTempDir();
    const filePath = path.join(tempDir, "nested", "PostController.ts");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "before\n", "utf8");

    const overwritten = overwriteFile(filePath, "after\n");

    expect(overwritten).toBe(true);
    expect(fs.readFileSync(filePath, "utf8")).toBe("after\n");
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Overwritten:"));
  });

  test("writeFileSafe reports write failures and returns false", () => {
    const tempDir = makeTempDir();
    const filePath = path.join(tempDir, "broken", "CommentService.ts");
    const writeSpy = jest.spyOn(fs, "writeFileSync").mockImplementation(() => {
      throw new Error("disk-full");
    });

    const created = writeFileSafe(filePath, "x\n");

    expect(created).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Error writing file:"));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Reason: disk-full"));
    writeSpy.mockRestore();
  });

  test("overwriteFile reports overwrite failures and returns false", () => {
    const tempDir = makeTempDir();
    const filePath = path.join(tempDir, "broken", "UserFactory.ts");
    const writeSpy = jest.spyOn(fs, "writeFileSync").mockImplementation(() => {
      throw new Error("permission denied");
    });

    const overwritten = overwriteFile(filePath, "x\n");

    expect(overwritten).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Error overwriting file:"));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Reason: permission denied"));
    writeSpy.mockRestore();
  });
});
