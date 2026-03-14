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

import path from "path";
import { makeController } from "../cli/commands/makeController";
import { makeService } from "../cli/commands/makeService";
import { TemplateEngine } from "../cli/utils/TemplateEngine";
import { overwriteFile } from "../cli/utils/fileWriter";
import { PathMap } from "../cli/utils/PathMap";
import {
  normalizeScaffoldModelName,
  resolveScaffoldArtifact,
} from "../cli/utils/ScaffoldGeneratorSupport";

const mockedTemplateEngine = TemplateEngine as jest.Mocked<typeof TemplateEngine>;
const mockedOverwriteFile = overwriteFile as jest.MockedFunction<typeof overwriteFile>;

describe("ORM hardening phase 5 scaffold suffix normalization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedTemplateEngine.load.mockReturnValue("template");
    mockedTemplateEngine.render.mockReturnValue("rendered");
    mockedOverwriteFile.mockReturnValue(true);
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("shared scaffold helper strips only the matching trailing suffix", () => {
    expect(normalizeScaffoldModelName("controller", "UserController")).toBe("User");
    expect(normalizeScaffoldModelName("service", "UserService")).toBe("User");
    expect(normalizeScaffoldModelName("controller", "UserService")).toBe("UserService");
    expect(normalizeScaffoldModelName("service", "UserController")).toBe("UserController");
  });

  test("resolveScaffoldArtifact keeps controller and service suffixes single when already present", () => {
    expect(resolveScaffoldArtifact("controller", "UserController")).toEqual(
      expect.objectContaining({
        modelClassName: "User",
        className: "UserController",
        fileName: "UserController.ts",
      })
    );

    expect(resolveScaffoldArtifact("service", "UserService")).toEqual(
      expect.objectContaining({
        modelClassName: "User",
        className: "UserService",
        fileName: "UserService.ts",
      })
    );
  });

  test("makeController and makeService use normalized names for imports, class names, and routes", async () => {
    await makeController("UserController", { force: true });
    await makeService("UserService", { force: true });

    expect(mockedTemplateEngine.render).toHaveBeenNthCalledWith(
      1,
      "template",
      expect.objectContaining({
        PascalCase: "User",
        camelCase: "user",
        serviceImportPath: "../services/UserService",
        modelImportPath: "../models/User",
      })
    );
    expect(mockedOverwriteFile).toHaveBeenNthCalledWith(
      1,
      path.resolve(PathMap.root, "src/app/controllers/UserController.ts"),
      "rendered"
    );

    expect(mockedTemplateEngine.render).toHaveBeenNthCalledWith(
      2,
      "template",
      expect.objectContaining({
        ModelName: "User",
        modelImportPath: "../models/User",
      })
    );
    expect(mockedOverwriteFile).toHaveBeenNthCalledWith(
      2,
      path.resolve(PathMap.root, "src/app/services/UserService.ts"),
      "rendered"
    );
  });
});
