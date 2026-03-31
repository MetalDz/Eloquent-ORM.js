jest.mock("chalk", () => ({
  __esModule: true,
  default: {
    greenBright: (value: string) => value,
    cyan: (value: string) => value,
    red: (value: string) => value,
  },
}));

jest.mock("../cli/utils/TemplateEngine", () => ({
  TemplateEngine: {
    load: jest.fn(),
    render: jest.fn(),
  },
}));

jest.mock("../cli/utils/fileWriter", () => ({
  writeFileSafe: jest.fn(),
  overwriteFile: jest.fn(),
}));

import fs from "fs";
import path from "path";

import { makeController } from "../cli/commands/makeController.js";
import { TemplateEngine } from "../cli/utils/TemplateEngine.js";
import { writeFileSafe } from "../cli/utils/fileWriter.js";

const mockedTemplateEngine = TemplateEngine as jest.Mocked<typeof TemplateEngine>;
const mockedWriteFileSafe = writeFileSafe as jest.MockedFunction<typeof writeFileSafe>;

describe("LTS phase 5 makeController coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedTemplateEngine.load.mockReturnValue("template");
    mockedTemplateEngine.render.mockReturnValue("rendered");
    mockedWriteFileSafe.mockReturnValue(false);
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("plan tracks the dedicated makeController LTS slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-MakeController-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 MakeController Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/commands/makeController.ts");
    expect(content).toContain("src/lab_test/lts.phase5.make-controller-coverage.logic.test.ts");
  });

  test("makeController does not log a created message when the safe writer skips the file", async () => {
    const logSpy = jest.spyOn(console, "log");

    await makeController("post");

    expect(mockedWriteFileSafe).toHaveBeenCalledWith(
      expect.stringContaining("PostController.ts"),
      "rendered",
    );
    expect(logSpy).not.toHaveBeenCalledWith(
      "Controller created:",
      expect.any(String),
    );
  });
});
