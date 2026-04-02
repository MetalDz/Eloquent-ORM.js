import fs from "fs";
import type { DriverAdapter } from "../core/connection/DriverAdapter.js";
import { loadAppModel, resolveAppModelPath } from "./support/appModelResolver.js";
import {
  clearRuntimeConnectionFactoryHarnessCache,
  loadRuntimeConnectionFactoryModule,
} from "./support/runtimeConnectionFactoryHarness.js";

function loadAppSmokeModel() {
  return loadAppModel<{
    new (): {
      tableName: string;
      connectionName: string;
    };
    where(field: string, value: unknown): {
      orderBy(field: string, direction?: "asc" | "desc"): {
        limit(count: number): {
          get(): Promise<unknown[]>;
        };
      };
    };
    findOneBy(field: string, value: unknown): Promise<unknown>;
  }>("AppSmoke").exported;
}

function makePgAdapter(): DriverAdapter & {
  query: jest.Mock;
  queryOne: jest.Mock;
  execute: jest.Mock;
  insert: jest.Mock;
} {
  const query = jest.fn();
  const queryOne = jest.fn();
  const execute = jest.fn();
  const insert = jest.fn();

  return {
    name: "pg_test",
    kind: "sql",
    query,
    queryOne,
    execute,
    insert,
    placeholder: (index: number) => `$${index}`,
    placeholders: (count: number, startIndex = 1) =>
      Array.from({ length: count }, (_, idx) => `$${startIndex + idx}`).join(", "),
    inClause: (field: string, values: unknown[], startIndex = 1) => ({
      sql: `${field} = ANY($${startIndex})`,
      params: [values],
      nextIndex: startIndex + 1,
    }),
    wrapId: (id: string) => {
      for (const part of id.split(".")) {
        if (part !== "*" && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) {
          throw new Error(`Unsafe SQL identifier: ${part}`);
        }
      }
      return `"${id}"`;
    },
  };
}

function pinGeneratedSqlConnection(filePath: string, connectionName = "pg_test"): () => void {
  const original = fs.readFileSync(filePath, "utf8");
  const pinned = original.replace(
    /process\.env\.DB_CONNECTION\s*\?\?\s*"[^"]+"/g,
    `"${connectionName}"`
  );
  fs.writeFileSync(filePath, pinned, "utf8");
  return () => {
    fs.writeFileSync(filePath, original, "utf8");
  };
}

describe("AppSmoke safe finder integration", () => {
  const originalDbConnection = process.env.DB_CONNECTION;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DB_CONNECTION = "pg_test";
    clearRuntimeConnectionFactoryHarnessCache();
  });

  afterAll(() => {
    if (originalDbConnection === undefined) {
      delete process.env.DB_CONNECTION;
    } else {
      process.env.DB_CONNECTION = originalDbConnection;
    }
  });

  test("real app model inherits safe finder methods for schema-backed fields", async () => {
    const runtimeConnectionFactory = loadRuntimeConnectionFactoryModule();
    const adapter = makePgAdapter();
    adapter.query.mockResolvedValue([{ id: 1, name: "Smoke" }]);
    adapter.queryOne.mockResolvedValue({ id: 2, name: "Smoke" });
    runtimeConnectionFactory.getAdapter = jest.fn(
      async () => adapter as unknown as DriverAdapter
    );
    runtimeConnectionFactory.getConnection = jest.fn(
      async () => adapter as unknown as DriverAdapter
    );
    runtimeConnectionFactory.closeAllConnections = jest.fn(async () => undefined);
    const appSmokePath = resolveAppModelPath("AppSmoke");
    const restoreAppSmoke = pinGeneratedSqlConnection(appSmokePath, "pg_test");

    try {
      process.env.DB_CONNECTION = "pg_test";
      const AppSmoke = loadAppSmokeModel();

      const rows = await AppSmoke.where("name", "Smoke")
        .orderBy("created_at", "desc")
        .limit(5)
        .get();
      expect(rows[0]).toBeInstanceOf(AppSmoke);
      expect(adapter.query).toHaveBeenCalledWith(
        'SELECT * FROM "appsmokes" WHERE "name" = $1 ORDER BY "created_at" DESC LIMIT 5',
        ["Smoke"]
      );

      const first = await AppSmoke.findOneBy("name", "Smoke");
      expect(first).toBeInstanceOf(AppSmoke);
      expect(adapter.queryOne).toHaveBeenCalledWith(
        'SELECT * FROM "appsmokes" WHERE "name" = $1 LIMIT 1',
        ["Smoke"]
      );
    } finally {
      restoreAppSmoke();
    }
  });

  test("AppSmoke model file documents active/inactive/published opt-in usage", () => {
    const filePath = resolveAppModelPath("AppSmoke");
    const content = fs.readFileSync(filePath, "utf8");

    const requiredSnippets = [
      "SAFE FINDER EXAMPLES",
      'const active = await AppSmoke.active().first();',
      'const inactive = await AppSmoke.inactive().get();',
      'const published = await AppSmoke.published().limit(10).get();',
      "To enable those scopes on this model",
      "`static scopeActive(query)`",
      "`static scopeInactive(query)`",
      "`static scopePublished(query)`",
    ];

    for (const snippet of requiredSnippets) {
      expect(content).toContain(snippet);
    }
  });
});
