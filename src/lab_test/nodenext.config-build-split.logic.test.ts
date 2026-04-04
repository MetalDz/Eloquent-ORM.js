import fs from "fs";
import path from "path";

describe("NodeNext config and build split", () => {
  test("plan locks the root NodeNext source-of-truth without breaking the dual build", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/NodeNext-Config-Build-Split-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# NodeNext Config Build Split Plan");
    expect(content).toContain("Status: LOCKED");
    expect(content).toContain("root `tsconfig.json` is the NodeNext source-tree truth");
    expect(content).toContain("published `dist/*` build remains CommonJS");
    expect(content).toContain("`tsconfig.base.json`");
    expect(content).toContain("`tsconfig.build.json`");
    expect(content).toContain("`tsconfig.esm.json`");
    expect(content).toContain("`tsconfig.test.json`");
    expect(content).toContain("there is no separate `tsconfig.nodenext.json` source of truth anymore");
    expect(content).toContain("CommonJS build stability stays protected");
  });

  test("package scripts and tsconfig files expose the split explicitly", () => {
    const cwd = process.cwd();
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(cwd, "package.json"), "utf8"),
    ) as {
      scripts?: Record<string, string>;
    };
    const jestConfigSource = fs.readFileSync(path.resolve(cwd, "jest.config.cjs"), "utf8");
    const baseConfig = JSON.parse(
      fs.readFileSync(path.resolve(cwd, "tsconfig.base.json"), "utf8"),
    ) as {
      compilerOptions?: Record<string, unknown>;
    };
    const buildConfig = JSON.parse(
      fs.readFileSync(path.resolve(cwd, "tsconfig.build.json"), "utf8"),
    ) as {
      extends?: string;
      compilerOptions?: Record<string, unknown>;
    };
    const esmBuildConfig = JSON.parse(
      fs.readFileSync(path.resolve(cwd, "tsconfig.esm.json"), "utf8"),
    ) as {
      extends?: string;
      compilerOptions?: Record<string, unknown>;
    };
    const testConfig = JSON.parse(
      fs.readFileSync(path.resolve(cwd, "tsconfig.test.json"), "utf8"),
    ) as {
      extends?: string;
      compilerOptions?: Record<string, unknown>;
    };
    const rootConfig = JSON.parse(
      fs.readFileSync(path.resolve(cwd, "tsconfig.json"), "utf8"),
    ) as {
      extends?: string;
      compilerOptions?: Record<string, unknown>;
    };

    expect(packageJson.scripts?.["typecheck:nodenext"]).toBe(
      "tsc -p . --noEmit --skipLibCheck",
    );
    expect(packageJson.scripts?.build).toContain("tsc -p tsconfig.build.json");
    expect(packageJson.scripts?.build).toContain("tsc -p tsconfig.esm.json");
    expect(packageJson.scripts?.build).not.toContain("generate-esm-entrypoints.cjs");
    expect(baseConfig.compilerOptions?.target).toBe("es2020");
    expect(rootConfig.extends).toBe("./tsconfig.base.json");
    expect(rootConfig.compilerOptions?.module).toBe("NodeNext");
    expect(rootConfig.compilerOptions?.moduleResolution).toBe("NodeNext");
    expect(rootConfig.compilerOptions?.noEmit).toBe(true);
    expect(buildConfig.extends).toBe("./tsconfig.base.json");
    expect(buildConfig.compilerOptions?.module).toBe("CommonJS");
    expect(buildConfig.compilerOptions?.moduleResolution).toBe("node");
    expect(esmBuildConfig.extends).toBe("./tsconfig.base.json");
    expect(esmBuildConfig.compilerOptions?.module).toBe("NodeNext");
    expect(esmBuildConfig.compilerOptions?.moduleResolution).toBe("NodeNext");
    expect(esmBuildConfig.compilerOptions?.outDir).toBe("esm");
    expect(testConfig.extends).toBe("./tsconfig.base.json");
    expect(testConfig.compilerOptions?.module).toBe("CommonJS");
    expect(testConfig.compilerOptions?.moduleResolution).toBe("node");
    expect(testConfig.compilerOptions?.noEmit).toBe(true);
    expect(fs.existsSync(path.resolve(cwd, "tsconfig.nodenext.json"))).toBe(false);
    expect(jestConfigSource).toContain('"^(\\\\.{1,2}/.*)\\\\.js$": "$1"');
    expect(jestConfigSource).toContain('tsconfig: "<rootDir>/tsconfig.test.json"');
  });
});
