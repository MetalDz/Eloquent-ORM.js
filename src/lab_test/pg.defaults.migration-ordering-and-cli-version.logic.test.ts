import fs from "fs";
import path from "path";

describe("pg defaults, migration ordering, and cli version contract", () => {
  const rootDir = process.cwd();

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test("validation note records the completed fix scope and semver rule", () => {
    const notePath = path.resolve(
      rootDir,
      "validation tasks/PG-Defaults-Migration-Ordering-And-CLI-Version-Plan.md"
    );
    const note = fs.readFileSync(notePath, "utf8");

    expect(note).toContain("Status: COMPLETED");
    expect(note).toContain("PostgreSQL boolean defaults must emit `TRUE` / `FALSE`");
    expect(note).toContain("static database.foreignKeys");
    expect(note).toContain("CLI banner version text must be resolved from `package.json`");
    expect(note).toContain("CLI-only fixes are `patch`");
  });

  test("public versioning docs lock CLI version tracking and semver classification", () => {
    const sourcePolicy = fs.readFileSync(
      path.resolve(rootDir, "src/documentation/versioning-policy.md"),
      "utf8"
    );
    const publicPolicy = fs.readFileSync(
      path.resolve(rootDir, "docs/support/versioning-policy.mdx"),
      "utf8"
    );

    for (const content of [sourcePolicy, publicPolicy]) {
      expect(content).toContain("CLI");
      expect(content).toContain("package version");
      expect(content).toContain("patch");
      expect(content).toContain("minor");
    }
  });

  test("CliVersion resolves and caches the package version from package.json", () => {
    const readFileSync = jest.fn(() => JSON.stringify({ version: "1.2.3" }));
    jest.doMock("fs", () => ({
      __esModule: true,
      default: { readFileSync },
      readFileSync,
    }));

    let resolveCliVersion!: () => string;
    jest.isolateModules(() => {
      ({ resolveCliVersion } = require("../cli/utils/CliVersion"));
    });

    expect(resolveCliVersion()).toBe("1.2.3");
    expect(resolveCliVersion()).toBe("1.2.3");
    expect(readFileSync).toHaveBeenCalledTimes(1);
  });

  test("CliVersion falls back to 0.0.0 when package.json cannot be read", () => {
    const readFileSync = jest.fn(() => {
      throw new Error("read failed");
    });
    jest.doMock("fs", () => ({
      __esModule: true,
      default: { readFileSync },
      readFileSync,
    }));

    let resolveCliVersion!: () => string;
    jest.isolateModules(() => {
      ({ resolveCliVersion } = require("../cli/utils/CliVersion"));
    });

    expect(resolveCliVersion()).toBe("0.0.0");
    expect(resolveCliVersion()).toBe("0.0.0");
    expect(readFileSync).toHaveBeenCalledTimes(1);
  });

  test("CliVersion falls back to 0.0.0 when package.json has a blank version", () => {
    const readFileSync = jest.fn(() => JSON.stringify({ version: "   " }));
    jest.doMock("fs", () => ({
      __esModule: true,
      default: { readFileSync },
      readFileSync,
    }));

    let resolveCliVersion!: () => string;
    jest.isolateModules(() => {
      ({ resolveCliVersion } = require("../cli/utils/CliVersion"));
    });

    expect(resolveCliVersion()).toBe("0.0.0");
    expect(resolveCliVersion()).toBe("0.0.0");
    expect(readFileSync).toHaveBeenCalledTimes(1);
  });
});
