jest.mock("chalk", () => ({
  __esModule: true,
  default: new Proxy(
    (value: unknown): string => String(value ?? ""),
    {
      get: () => (value: unknown): string => String(value ?? ""),
      apply: (_target, _thisArg, args: unknown[]) => String(args[0] ?? ""),
    },
  ),
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
import os from "os";
import path from "path";

import { makeRegistry } from "../cli/commands/makeRegistry";
import { PathMap } from "../cli/utils/PathMap";
import { ImportResolver } from "../cli/utils/ImportResolver";
import { TemplateEngine } from "../cli/utils/TemplateEngine";
import { overwriteFile, writeFileSafe } from "../cli/utils/fileWriter";

const mockedTemplateEngine = TemplateEngine as jest.Mocked<typeof TemplateEngine>;
const mockedWriteFileSafe = writeFileSafe as jest.MockedFunction<typeof writeFileSafe>;
const mockedOverwriteFile = overwriteFile as jest.MockedFunction<typeof overwriteFile>;

describe("LTS phase 5 makeRegistry coverage", () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts-make-registry-"));
    jest.clearAllMocks();
    mockedTemplateEngine.load.mockReturnValue("template");
    mockedTemplateEngine.render.mockReturnValue("rendered");
    mockedWriteFileSafe.mockReturnValue(true);
    mockedOverwriteFile.mockReturnValue(true);
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(PathMap, "ensureDirs").mockImplementation(() => undefined);
    jest.spyOn(PathMap, "root", "get").mockReturnValue(tempRoot);
    jest.spyOn(ImportResolver, "publicApiImportPath").mockReturnValue("../index");
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test("plan tracks the dedicated makeRegistry LTS slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-MakeRegistry-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 MakeRegistry Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/commands/makeRegistry.ts");
    expect(content).toContain("src/lab_test/lts.phase5.make-registry-coverage.logic.test.ts");
  });

  test("makeRegistry handles a missing models directory and returns quietly when the safe writer skips", async () => {
    const missingModelsDir = path.join(tempRoot, "missing-models");
    jest.spyOn(PathMap, "models").mockReturnValue(missingModelsDir);
    mockedWriteFileSafe.mockReturnValue(false);

    await makeRegistry();

    expect(mockedTemplateEngine.render).toHaveBeenCalledWith(
      "template",
      expect.objectContaining({
        packageImportPath: "../index",
        models: [],
        modelsConstName: "APP_MODELS",
        functionName: "registerAppModels",
      }),
    );
    expect(mockedWriteFileSafe).toHaveBeenCalledWith(
      path.join(tempRoot, "src/app/registerModels.ts"),
      expect.stringContaining("Mode: APP"),
    );
    expect(console.log).not.toHaveBeenCalledWith("Model registry created:", expect.any(String));
  });

  test("makeRegistry logs failures when template loading throws", async () => {
    const modelsDir = path.join(tempRoot, "src/app/models");
    fs.mkdirSync(modelsDir, { recursive: true });
    jest.spyOn(PathMap, "models").mockReturnValue(modelsDir);

    const error = new Error("registry-template-missing");
    mockedTemplateEngine.load.mockImplementation(() => {
      throw error;
    });

    await makeRegistry({ force: true });

    expect(console.error).toHaveBeenCalledWith("Failed to create model registry bootstrap.");
    expect(console.error).toHaveBeenCalledWith(error);
  });
});
