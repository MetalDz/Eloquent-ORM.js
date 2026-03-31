import fs from "fs";
import os from "os";
import path from "path";

import { PathMap } from "../cli/utils/PathMap.js";
import { ModelIntrospector } from "../cli/utils/ModelIntrospector.js";
import { loadModule } from "../cli/utils/typescript/tsRuntime.js";

jest.mock("../cli/utils/typescript/tsRuntime", () => ({
  loadModule: jest.fn(),
}));

const mockedLoadModule = loadModule as jest.MockedFunction<typeof loadModule>;

describe("LTS phase 5 ModelIntrospector coverage", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    jest.restoreAllMocks();
    mockedLoadModule.mockReset();
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  function makeTempDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts-introspector-"));
    tempDirs.push(dir);
    return dir;
  }

  test("plan tracks the dedicated ModelIntrospector LTS slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-ModelIntrospector-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 ModelIntrospector Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/ModelIntrospector.ts");
    expect(content).toContain("src/lab_test/lts.phase5.model-introspector-coverage.logic.test.ts");
  });

  test("analyze() falls back to an empty schema when the loaded model exposes no schema metadata", async () => {
    const tempDir = makeTempDir();
    const modelPath = path.resolve(tempDir, "RuntimeOnly.ts");
    fs.writeFileSync(modelPath, "export class RuntimeOnly {}\n", "utf8");

    jest.spyOn(PathMap, "models").mockReturnValue(tempDir);

    class RuntimeOnly {}

    mockedLoadModule.mockReturnValue({ RuntimeOnly });

    await expect(ModelIntrospector.analyze("RuntimeOnly")).resolves.toEqual({
      fields: [],
      relations: [],
      features: {
        hasTimestamps: false,
        hasSoftDeletes: false,
        isMorphable: false,
        mixins: [],
      },
    });
    expect(mockedLoadModule).toHaveBeenCalledWith(modelPath);
  });

  test("clearModelModuleCache tolerates unresolved paths through the catch branch", () => {
    expect(() =>
      (ModelIntrospector as any).clearModelModuleCache(
        path.resolve(process.cwd(), "missing-model-cache-entry.ts"),
      ),
    ).not.toThrow();
  });
});
