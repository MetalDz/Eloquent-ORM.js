import fs from "fs";
import path from "path";

type MigrationIndex = {
  createTables: Set<string>;
  updateTables: Set<string>;
};

function scanMigrationDirectory(connectionDir: string): MigrationIndex {
  const createTables = new Set<string>();
  const updateTables = new Set<string>();
  const files = fs
    .readdirSync(connectionDir)
    .filter((fileName) => fileName.endsWith(".ts") || fileName.endsWith(".js"));

  for (const fileName of files) {
    const createMatch = fileName.match(/^\d+_create_([A-Za-z0-9_]+)_table\.(ts|js)$/);
    if (createMatch) {
      createTables.add(createMatch[1]);
      continue;
    }

    const updateMatch = fileName.match(/^\d+_update_([A-Za-z0-9_]+)_table\.(ts|js)$/);
    if (updateMatch) {
      updateTables.add(updateMatch[1]);
    }
  }

  return { createTables, updateTables };
}

describe("migration file baseline integrity", () => {
  test("each connection migration tree avoids update-only tables (create baseline required)", () => {
    const roots = [
      path.resolve(process.cwd(), "src/app/database/migrations"),
      path.resolve(process.cwd(), "src/test/database/migrations"),
    ];
    const failures: string[] = [];

    for (const root of roots) {
      if (!fs.existsSync(root)) {
        continue;
      }

      const connectionDirs = fs
        .readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(root, entry.name));

      for (const connectionDir of connectionDirs) {
        const { createTables, updateTables } = scanMigrationDirectory(connectionDir);
        for (const tableName of updateTables) {
          if (!createTables.has(tableName)) {
            failures.push(
              `${path.basename(connectionDir)} has update migration(s) for "${tableName}" without a create baseline`
            );
          }
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
