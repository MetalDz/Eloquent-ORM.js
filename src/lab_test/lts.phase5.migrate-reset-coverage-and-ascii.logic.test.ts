import fs from "fs";
import path from "path";

const passthroughChalk = {
  __esModule: true,
  default: {
    cyan: (value: string) => value,
  },
};

describe("LTS phase 5 migrateReset coverage and ASCII", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.clearAllMocks();
  });

  test("plan tracks the dedicated migrateReset LTS slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-MigrateReset-Coverage-And-ASCII-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 MigrateReset Coverage And ASCII Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/commands/migrateReset.ts");
    expect(content).toContain(
      "src/lab_test/lts.phase5.migrate-reset-coverage-and-ascii.logic.test.ts",
    );
  });

  test("migrateReset uses the resolved default connection and default allMigrations=true", async () => {
    jest.doMock("chalk", () => passthroughChalk);

    const migrateRollback = jest.fn(async () => undefined);
    const resolveConnectionName = jest.fn(() => "sqlite_test" as never);

    jest.doMock("../cli/commands/migrateRollback", () => ({
      migrateRollback,
    }));
    jest.doMock("../core/connection/resolveConnectionName", () => ({
      resolveConnectionName,
    }));

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const { migrateReset } = await import("../cli/commands/migrateReset.js");

    await migrateReset();

    expect(resolveConnectionName).toHaveBeenCalledWith(undefined, { test: false });
    expect(logSpy).toHaveBeenCalledWith(
      "\nRESET: development database (all batches) on sqlite_test...\n",
    );
    expect(migrateRollback).toHaveBeenCalledWith({
      test: false,
      connectionNames: ["sqlite_test"],
      allMigrations: true,
      step: Number.MAX_SAFE_INTEGER,
      auditCommand: "migrate:reset",
    });
  });

  test("migrateReset passes through explicit allMigrations=false", async () => {
    jest.doMock("chalk", () => passthroughChalk);

    const migrateRollback = jest.fn(async () => undefined);
    const resolveConnectionName = jest.fn(() => "unused_connection" as never);

    jest.doMock("../cli/commands/migrateRollback", () => ({
      migrateRollback,
    }));
    jest.doMock("../core/connection/resolveConnectionName", () => ({
      resolveConnectionName,
    }));

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const { migrateReset } = await import("../cli/commands/migrateReset.js");

    await migrateReset({
      test: true,
      connectionNames: ["mongo_test" as never],
      allMigrations: false,
    });

    expect(resolveConnectionName).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      "\nRESET: test database (all batches) on mongo_test...\n",
    );
    expect(migrateRollback).toHaveBeenCalledWith({
      test: true,
      connectionNames: ["mongo_test"],
      allMigrations: false,
      step: Number.MAX_SAFE_INTEGER,
      auditCommand: "migrate:reset",
    });
  });

  test("migrateReset source uses the normalized ASCII banner", () => {
    const commandPath = path.resolve(process.cwd(), "src/cli/commands/migrateReset.ts");
    const content = fs.readFileSync(commandPath, "utf8");

    expect(content).toContain("RESET:");
    expect(content).not.toContain("â");
    expect(content).not.toContain("ً");
  });
});
