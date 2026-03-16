import fs from "fs";
import path from "path";

import { dbConfig } from "../config/database";
import { PathMap } from "../cli/utils/PathMap";
import {
  runSeedBootstrapPrecheck,
} from "../cli/utils/SeedBootstrapPrecheck";
import {
  closeAllConnections,
  getAdapter,
  getConnection,
} from "../core/connection/ConnectionFactory";

jest.mock("chalk", () => ({
  __esModule: true,
  default: {
    cyan: (value: string) => value,
    green: (value: string) => value,
    red: (value: string) => value,
    yellow: (value: string) => value,
  },
}));

jest.mock("../core/connection/ConnectionFactory", () => ({
  closeAllConnections: jest.fn(),
  getConnection: jest.fn(),
  getAdapter: jest.fn(),
}));

const mockedCloseAllConnections =
  closeAllConnections as jest.MockedFunction<typeof closeAllConnections>;
const mockedGetConnection =
  getConnection as jest.MockedFunction<typeof getConnection>;
const mockedGetAdapter =
  getAdapter as jest.MockedFunction<typeof getAdapter>;

describe("LTS phase 5 SeedBootstrapPrecheck coverage", () => {
  const originalConnections = dbConfig.connections;
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const dirFixtures = new Map<string, { exists: boolean; files: string[] }>();

  beforeEach(() => {
    jest.clearAllMocks();
    process.exitCode = 0;
    dbConfig.connections = { ...originalConnections };
    dirFixtures.clear();

    mockedCloseAllConnections.mockResolvedValue(undefined);
    mockedGetConnection.mockResolvedValue({} as never);
    mockedGetAdapter.mockResolvedValue({
      query: jest.fn(async () => []),
    } as never);

    jest.spyOn(fs, "existsSync").mockImplementation((target: fs.PathLike) => {
      const normalized = path.resolve(String(target));
      const fixture = dirFixtures.get(normalized);
      if (fixture) return fixture.exists;
      return originalExistsSync(target);
    });

    jest.spyOn(fs, "readdirSync").mockImplementation((target: fs.PathLike) => {
      const normalized = path.resolve(String(target));
      const fixture = dirFixtures.get(normalized);
      if (fixture) {
        return fixture.files as unknown as ReturnType<typeof fs.readdirSync>;
      }
      return originalReaddirSync(target) as unknown as ReturnType<typeof fs.readdirSync>;
    });
  });

  afterEach(() => {
    dbConfig.connections = originalConnections;
    process.exitCode = 0;
    jest.restoreAllMocks();
  });

  test("plan tracks the dedicated SeedBootstrapPrecheck LTS slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-SeedBootstrapPrecheck-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 SeedBootstrapPrecheck Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/SeedBootstrapPrecheck.ts");
    expect(content).toContain(
      "src/lab_test/lts.phase5.seed-bootstrap-precheck-coverage.logic.test.ts",
    );
  });

  test("mongo precheck formats connection errors from Error and non-Error throws", async () => {
    (dbConfig.connections as Record<string, { driver?: string }>).mongo = {
      driver: "mongo",
    };

    mockedGetConnection.mockRejectedValueOnce(new Error("mongo down") as never);
    const errorReport = await runSeedBootstrapPrecheck({
      connectionNames: ["mongo" as never],
    });

    expect(errorReport.clean).toBe(false);
    expect(errorReport.checks[0].reasons).toContain(
      "Unable to connect to MongoDB: mongo down",
    );

    mockedGetConnection.mockRejectedValueOnce("raw mongo failure" as never);
    const stringReport = await runSeedBootstrapPrecheck({
      connectionNames: ["mongo" as never],
    });

    expect(stringReport.clean).toBe(false);
    expect(stringReport.checks[0].reasons).toContain(
      "Unable to connect to MongoDB: raw mongo failure",
    );
  });

  test("sql precheck reports empty migration dirs and unsupported drivers after discovery", async () => {
    (dbConfig.connections as Record<string, { driver?: string }>).oracle = {
      driver: "oracle",
    };

    const migrationsDir = PathMap.migrations(false, "oracle" as never);
    dirFixtures.set(path.resolve(migrationsDir), {
      exists: true,
      files: [],
    });

    const report = await runSeedBootstrapPrecheck({
      connectionNames: ["oracle" as never],
    });

    expect(report.clean).toBe(false);
    expect(report.checks[0].reasons).toContain("No migration files found on disk.");
    expect(report.checks[0].reasons).toContain(
      'Connection "oracle" is not a SQL driver.',
    );
    expect(mockedGetAdapter).not.toHaveBeenCalled();
  });
});
