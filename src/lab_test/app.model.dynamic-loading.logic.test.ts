import path from "path";

import { loadModule } from "../cli/utils/typescript/tsRuntime";

describe("App model dynamic loading", () => {
  test("loads AppSmoke dynamically from src/app/models", () => {
    const filePath = path.resolve(process.cwd(), "src/app/models/AppSmoke.ts");
    const mod = loadModule(filePath) as { AppSmoke?: unknown };
    expect(typeof mod.AppSmoke).toBe("function");
  });

  test("loads GeoLocalisation dynamically from src/app/models", () => {
    const filePath = path.resolve(process.cwd(), "src/app/models/GeoLocalisation.ts");
    const mod = loadModule(filePath) as { GeoLocalisation?: unknown };
    expect(typeof mod.GeoLocalisation).toBe("function");
  });
});
