import fs from "fs";
import path from "path";

import { dbConfig } from "../config/database";
import { resolveConnectionNamesFromFlags } from "../cli/utils/resolveConnectionFlags";

describe("LTS phase 5 resolveConnectionFlags coverage", () => {
  const originalConnections = { ...dbConfig.connections };

  afterEach(() => {
    (dbConfig as { connections: typeof dbConfig.connections }).connections = {
      ...originalConnections,
    };
  });

  test("plan tracks the dedicated resolveConnectionFlags coverage slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-ResolveConnectionFlags-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 ResolveConnectionFlags Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/resolveConnectionFlags.ts");
    expect(content).toContain(
      "src/lab_test/lts.phase5.resolve-connection-flags-coverage.logic.test.ts",
    );
  });

  test("test-mode resolution falls back to runtime aliases and filters missing ones", () => {
    const fallbackConnections = { ...originalConnections };
    delete (fallbackConnections as Record<string, unknown>).mongo_test;
    (dbConfig as { connections: typeof dbConfig.connections }).connections = fallbackConnections;

    expect(resolveConnectionNamesFromFlags(true, { mongo: true })).toEqual(["mongo"]);

    const missingConnections = { ...fallbackConnections };
    delete (missingConnections as Record<string, unknown>).mongo;
    (dbConfig as { connections: typeof dbConfig.connections }).connections = missingConnections;

    expect(resolveConnectionNamesFromFlags(false, { mongo: true })).toEqual([]);
    expect(
      resolveConnectionNamesFromFlags(
        true,
        { allConnections: true },
        { includeMongoInAllConnections: true },
      ),
    ).toEqual(["mysql_test", "pg_test", "sqlite_test"]);
  });
});
