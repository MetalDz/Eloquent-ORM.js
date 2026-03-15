import fs from "fs";
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

import { writeFileSafe } from "../cli/utils/fileWriter";

describe("LTS phase 5 fileWriter coverage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("plan tracks the dedicated fileWriter LTS slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-FileWriter-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 FileWriter Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/fileWriter.ts");
    expect(content).toContain("src/lab_test/lts.phase5.file-writer-coverage.logic.test.ts");
  });

  test("writeFileSafe logs only the primary error line when fs throws a non-Error value", () => {
    const existsSpy = jest.spyOn(fs, "existsSync").mockImplementation((target) => {
      const value = String(target);
      if (value.endsWith("broken")) {
        return true;
      }
      return false;
    });
    const writeSpy = jest.spyOn(fs, "writeFileSync").mockImplementation(() => {
      throw "disk-full";
    });
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const created = writeFileSafe(path.join("broken", "UserService.ts"), "x\n");

    expect(created).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Error writing file:"));
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining("Reason:"));

    writeSpy.mockRestore();
    existsSpy.mockRestore();
  });
});
