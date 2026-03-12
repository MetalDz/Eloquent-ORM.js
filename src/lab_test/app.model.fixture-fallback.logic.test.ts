import path from "path";

import { loadAppModel, resolveAppModelPath } from "./support/appModelResolver";

describe("App model fixture fallback", () => {
  test("can force AppSmoke fixture resolution", () => {
    const filePath = resolveAppModelPath("AppSmoke", { preferFixture: true });
    expect(filePath).toContain(
      path.join("src", "lab_test", "support", "app-model-fixtures", "AppSmoke.ts")
    );

    const mod = loadAppModel<unknown>("AppSmoke", { preferFixture: true });
    expect(typeof mod.exported).toBe("function");
  });

  test("can force GeoLocalisation fixture resolution", () => {
    const filePath = resolveAppModelPath("GeoLocalisation", { preferFixture: true });
    expect(filePath).toContain(
      path.join(
        "src",
        "lab_test",
        "support",
        "app-model-fixtures",
        "GeoLocalisation.ts"
      )
    );

    const mod = loadAppModel<unknown>("GeoLocalisation", { preferFixture: true });
    expect(typeof mod.exported).toBe("function");
  });
});
