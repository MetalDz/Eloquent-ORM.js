import { loadAppModel } from "./support/appModelResolver.js";

describe("App model dynamic loading", () => {
  test("loads AppSmoke dynamically from src/app/models", () => {
    const mod = loadAppModel<unknown>("AppSmoke");
    expect(typeof mod.exported).toBe("function");
  });

  test("loads GeoLocalisation dynamically from src/app/models", () => {
    const mod = loadAppModel<unknown>("GeoLocalisation");
    expect(typeof mod.exported).toBe("function");
  });
});
