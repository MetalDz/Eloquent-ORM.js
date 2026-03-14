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
import { overwriteFile, writeFileSafe } from "../cli/utils/fileWriter";
import { PathMap } from "../cli/utils/PathMap";

const mockedTemplateEngine = TemplateEngine as jest.Mocked<typeof TemplateEngine>;
const mockedWriteFileSafe = writeFileSafe as jest.MockedFunction<typeof writeFileSafe>;
const mockedOverwriteFile = overwriteFile as jest.MockedFunction<typeof overwriteFile>;

describe("ORM hardening phase 5 scaffold generators", () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedTemplateEngine.load.mockReturnValue("template");
    mockedTemplateEngine.render.mockReturnValue("rendered");
    mockedWriteFileSafe.mockReturnValue(true);
    mockedOverwriteFile.mockReturnValue(true);
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("makeController writes app controller output and omits restore block by default", async () => {
    await makeController("post");

    expect(mockedTemplateEngine.load).toHaveBeenCalledWith("controller");
    expect(mockedTemplateEngine.render).toHaveBeenCalledWith(
      "template",
      expect.objectContaining({
        PascalCase: "Post",
        camelCase: "post",
        serviceImportPath: "../services/PostService",
        modelImportPath: "../models/Post",
        softDeleteBlock: "",
      })
    );
    expect(mockedWriteFileSafe).toHaveBeenCalledWith(
      path.resolve(PathMap.root, "src/app/controllers/PostController.ts"),
      "rendered"
    );
    expect(logSpy).toHaveBeenCalledWith(
      "Controller created:",
      "src/app/controllers/PostController.ts"
    );
  });

  test("makeController writes test controller output and renders the soft-delete restore block", async () => {
    await makeController("user", { test: true, soft: true, force: true });

    expect(mockedTemplateEngine.render).toHaveBeenCalledWith(
      "template",
      expect.objectContaining({
        PascalCase: "User",
        camelCase: "user",
        serviceImportPath: "../services/UserService",
        modelImportPath: "../database/models/User",
        softDeleteBlock: expect.stringContaining("async restore(req: Request, res: Response)"),
      })
    );
    expect(mockedOverwriteFile).toHaveBeenCalledWith(
      path.resolve(PathMap.root, "src/test/controllers/UserController.ts"),
      "rendered"
    );
    expect(logSpy).toHaveBeenCalledWith(
      "Controller created:",
      "src/test/controllers/UserController.ts"
    );
  });

  test("makeService writes app/test service outputs and uses overwrite when forced", async () => {
    await makeService("comment");
    await makeService("comment", { test: true, force: true });

    expect(mockedTemplateEngine.load).toHaveBeenCalledWith("service");
    expect(mockedTemplateEngine.render).toHaveBeenNthCalledWith(
      1,
      "template",
      expect.objectContaining({
        ModelName: "Comment",
        modelImportPath: "../models/Comment",
      })
    );
    expect(mockedWriteFileSafe).toHaveBeenNthCalledWith(
      1,
      path.resolve(PathMap.root, "src/app/services/CommentService.ts"),
      "rendered"
    );
    expect(mockedOverwriteFile).toHaveBeenNthCalledWith(
      1,
      path.resolve(PathMap.root, "src/test/services/CommentService.ts"),
      "rendered"
    );
    expect(logSpy).toHaveBeenCalledWith(
      "Service created:",
      "src/app/services/CommentService.ts"
    );
    expect(logSpy).toHaveBeenCalledWith(
      "Service created:",
      "src/test/services/CommentService.ts"
    );
  });

  test("makeController and makeService log failures when template generation throws", async () => {
    const error = new Error("template-missing");
    mockedTemplateEngine.load.mockImplementation(() => {
      throw error;
    });

    await makeController("broken");
    await makeService("broken");

    expect(errorSpy).toHaveBeenCalledWith("Failed to create controller for model: broken");
    expect(errorSpy).toHaveBeenCalledWith("Failed to create service for model: broken");
    expect(errorSpy).toHaveBeenCalledWith(error);
  });
});
