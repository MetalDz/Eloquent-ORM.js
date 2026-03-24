import fs from "fs";
import path from "path";

describe("package build map trim", () => {
  test("publish build disables source maps while keeping declarations", () => {
    const tsconfigBuildPath = path.resolve(process.cwd(), "tsconfig.build.json");
    const config = JSON.parse(fs.readFileSync(tsconfigBuildPath, "utf8")) as {
      compilerOptions?: {
        noEmit?: boolean;
        declaration?: boolean;
        declarationMap?: boolean;
        sourceMap?: boolean;
      };
    };

    expect(config.compilerOptions?.noEmit).toBe(false);
    expect(config.compilerOptions?.declaration).toBe(true);
    expect(config.compilerOptions?.declarationMap).toBe(false);
    expect(config.compilerOptions?.sourceMap).toBe(false);
  });
});
