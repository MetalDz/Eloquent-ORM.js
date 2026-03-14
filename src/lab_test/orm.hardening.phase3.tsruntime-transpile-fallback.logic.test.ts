import fs from "fs";
import os from "os";
import path from "path";

describe("ORM hardening phase 3 tsRuntime transpile fallback", () => {
  afterEach(() => {
    jest.resetModules();
    jest.unmock("ts-node");
    jest.restoreAllMocks();
  });

  test("loadModule transpiles temp and workspace TypeScript files when ts-node is unavailable", () => {
    jest.doMock("ts-node", () => {
      throw new Error("ts-node unavailable");
    });

    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-phase3-tsruntime-"));
    const depFile = path.join(root, "dep.ts");
    const mainFile = path.join(root, "main.ts");
    const workspaceFixture = path.resolve(
      process.cwd(),
      "src/lab_test/support/tsRuntimeWorkspaceFixture.ts"
    );
    const workspaceImport = workspaceFixture.replace(/\\/g, "/");

    fs.writeFileSync(depFile, "export const tempValue = 8;", "utf8");
    fs.writeFileSync(
      mainFile,
      [
        'import { tempValue } from "./dep";',
        `import { phase3WorkspaceHelper } from "${workspaceImport}";`,
        "export const loaded = phase3WorkspaceHelper() + tempValue;",
      ].join("\n"),
      "utf8"
    );

    try {
      let runtime: typeof import("../cli/utils/typescript/tsRuntime");
      jest.isolateModules(() => {
        runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime");
      });

      expect(runtime!.loadModule(mainFile)).toEqual(
        expect.objectContaining({
          loaded: 20,
        })
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
