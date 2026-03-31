import fs from "fs";
import os from "os";
import path from "path";

import {
  acquireMigrationLock,
  deleteAppliedMigration,
  doesCollectionExist,
  ensureMigrationCollection,
  readAppliedMigrations,
  readLastBatch,
  recordAppliedMigration,
  releaseMigrationLock,
  validateMigrationHistory,
} from "../cli/utils/migrations/MongoMigrationTracker.js";

type SortSpec = Record<string, 1 | -1>;

type FakeState = {
  collections: Set<string>;
  docs: Array<Record<string, unknown>>;
  createCollectionError?: Error | null;
  createIndexErrors: Error[];
  failNextLockInsert?: Error | null;
};

function matchesFilter(
  doc: Record<string, unknown>,
  filter: Record<string, unknown>,
): boolean {
  return Object.entries(filter).every(([key, value]) => doc[key] === value);
}

function compareValues(left: unknown, right: unknown): number {
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }

  const normalizedLeft = left === undefined || left === null ? "" : String(left);
  const normalizedRight = right === undefined || right === null ? "" : String(right);
  if (normalizedLeft < normalizedRight) return -1;
  if (normalizedLeft > normalizedRight) return 1;
  return 0;
}

function sortDocs(
  docs: Array<Record<string, unknown>>,
  spec: SortSpec,
): Array<Record<string, unknown>> {
  const entries = Object.entries(spec);
  return [...docs].sort((left, right) => {
    for (const [field, direction] of entries) {
      const comparison = compareValues(left[field], right[field]);
      if (comparison !== 0) {
        return direction === -1 ? -comparison : comparison;
      }
    }
    return 0;
  });
}

function makeMongoDb(state: FakeState): {
  collection: jest.Mock;
  createCollection: jest.Mock;
  listCollections: jest.Mock;
} {
  const collection = {
    createIndex: jest.fn(async () => {
      const nextError = state.createIndexErrors.shift();
      if (nextError) {
        throw nextError;
      }
      return "ok";
    }),
    findOne: jest.fn(async (filter: Record<string, unknown>) => {
      return state.docs.find((doc) => matchesFilter(doc, filter)) ?? null;
    }),
    insertOne: jest.fn(async (doc: Record<string, unknown>) => {
      if (doc._id === "__eloquent_migration_lock__" && state.failNextLockInsert) {
        const error = state.failNextLockInsert;
        state.failNextLockInsert = null;
        throw error;
      }
      state.docs.push({ ...doc });
      return { acknowledged: true };
    }),
    deleteOne: jest.fn(async (filter: Record<string, unknown>) => {
      const index = state.docs.findIndex((doc) => matchesFilter(doc, filter));
      if (index >= 0) {
        state.docs.splice(index, 1);
      }
      return { acknowledged: true };
    }),
    updateOne: jest.fn(async (filter: Record<string, unknown>, update: { $set?: Record<string, unknown> }) => {
      const target = state.docs.find((doc) => matchesFilter(doc, filter));
      if (target && update.$set) {
        Object.assign(target, update.$set);
      }
      return { acknowledged: true };
    }),
    find: jest.fn((filter: Record<string, unknown>) => {
      const filtered = state.docs.filter((doc) => matchesFilter(doc, filter));
      return {
        sort(spec: SortSpec) {
          const sorted = sortDocs(filtered, spec);
          return {
            toArray: async () => sorted.map((doc) => ({ ...doc })),
            limit(count: number) {
              return {
                next: async () => (sorted.slice(0, count)[0] ? { ...sorted[0] } : null),
              };
            },
          };
        },
      };
    }),
  };

  return {
    collection: jest.fn(() => collection),
    createCollection: jest.fn(async (name: string) => {
      if (state.createCollectionError) {
        const error = state.createCollectionError;
        state.createCollectionError = null;
        throw error;
      }
      state.collections.add(name);
      return { collectionName: name };
    }),
    listCollections: jest.fn((filter: { name?: string }) => ({
      toArray: async () =>
        filter.name && state.collections.has(filter.name) ? [{ name: filter.name }] : [],
    })),
  };
}

describe("ORM hardening phase 2 - MongoMigrationTracker runtime coverage", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test("plan records the dedicated MongoMigrationTracker coverage slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/ORM-Hardening-Phase2-MongoMigrationTracker-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("MongoMigrationTracker");
    expect(content).toContain(
      "src/lab_test/orm.hardening.phase2.mongo-migration-tracker.logic.test.ts",
    );
  });

  test("ensureMigrationCollection bootstraps collection/indexes and tolerates safe existing/index conflicts", async () => {
    const db = makeMongoDb({
      collections: new Set<string>(),
      docs: [],
      createCollectionError: new Error("already exists"),
      createIndexErrors: [
        new Error("index options conflict"),
        new Error("equivalent index already exists"),
      ],
    });

    await expect(ensureMigrationCollection(db as any)).resolves.toBeUndefined();
    expect(db.createCollection).toHaveBeenCalledWith("migrations");
    expect(db.collection).toHaveBeenCalledWith("migrations");
  });

  test("ensureMigrationCollection rethrows unexpected bootstrap errors", async () => {
    const db = makeMongoDb({
      collections: new Set<string>(),
      docs: [],
      createCollectionError: new Error("permission denied"),
      createIndexErrors: [],
    });

    await expect(ensureMigrationCollection(db as any)).rejects.toThrow("permission denied");
  });

  test("migration locking supports direct insert, same-owner recovery, and contention failure", async () => {
    const state: FakeState = {
      collections: new Set<string>(["migrations"]),
      docs: [],
      createIndexErrors: [],
    };
    const db = makeMongoDb(state);

    await acquireMigrationLock(db as any, "owner-1");
    expect(state.docs).toEqual([
      expect.objectContaining({
        _id: "__eloquent_migration_lock__",
        kind: "lock",
        owner: "owner-1",
      }),
    ]);

    await releaseMigrationLock(db as any, "owner-1");
    expect(state.docs).toEqual([]);

    state.failNextLockInsert = new Error("duplicate key");
    state.docs.push({
      _id: "__eloquent_migration_lock__",
      kind: "lock",
      owner: "owner-2",
      run_at: new Date(),
    });
    await expect(acquireMigrationLock(db as any, "owner-2")).resolves.toBeUndefined();

    await expect(acquireMigrationLock(db as any, "owner-3")).rejects.toThrow(
      "Another migration process is already running.",
    );
  });

  test("history read/write helpers normalize rows, batches, inserts, deletes, and collection existence", async () => {
    const state: FakeState = {
      collections: new Set<string>(["migrations", "wifi_snapshots"]),
      docs: [
        {
          _id: "b",
          kind: "history",
          name: "20260314002_update_wifis_table.ts",
          batch: 3,
          checksum: "checksum-b",
          run_at: new Date("2026-03-14T10:00:00.000Z"),
        },
        {
          _id: "a",
          kind: "history",
          name: "20260314001_create_wifis_table.ts",
          batch: 2,
          checksum: null,
          run_at: "2026-03-14T09:00:00.000Z",
        },
      ],
      createIndexErrors: [],
    };
    const db = makeMongoDb(state);

    expect(await doesCollectionExist(db as any, "wifi_snapshots")).toBe(true);
    expect(await doesCollectionExist(db as any, "ghost_collection")).toBe(false);

    const rows = await readAppliedMigrations(db as any);
    expect(rows).toEqual([
      {
        id: "a",
        name: "20260314001_create_wifis_table.ts",
        batch: 2,
        checksum: null,
        run_at: "2026-03-14T09:00:00.000Z",
      },
      {
        id: "b",
        name: "20260314002_update_wifis_table.ts",
        batch: 3,
        checksum: "checksum-b",
        run_at: "2026-03-14T10:00:00.000Z",
      },
    ]);
    expect(await readLastBatch(db as any)).toBe(3);

    await recordAppliedMigration(
      db as any,
      "20260314003_create_wifi_logs_table.ts",
      4,
      "checksum-c",
    );
    expect(state.docs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "history",
          name: "20260314003_create_wifi_logs_table.ts",
          batch: 4,
          checksum: "checksum-c",
        }),
      ]),
    );

    await deleteAppliedMigration(db as any, "20260314001_create_wifis_table.ts");
    expect(state.docs.some((doc) => doc.name === "20260314001_create_wifis_table.ts")).toBe(false);
  });

  test("validateMigrationHistory backfills legacy checksums, relinks generated files, prunes stale generated creates, and keeps orphaned collections", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mongo-tracker-phase2-"));
    try {
      const currentName = "20260314104841001_create_wifi_snapshots_table.ts";
      const relinkedName = "20260314104939001_create_wifi_devices_table.ts";
      const oldRelinkedName = "20260314100000001_create_wifi_devices_table.ts";
      const customName = "wifi_manual_migration.ts";
      fs.writeFileSync(path.join(tempDir, currentName), "export async function up() { return; }\n", "utf8");
      fs.writeFileSync(
        path.join(tempDir, relinkedName),
        "export async function up() { return; }\n",
        "utf8",
      );
      fs.writeFileSync(
        path.join(tempDir, customName),
        "export async function up() { return; }\n",
        "utf8",
      );

      const state: FakeState = {
        collections: new Set<string>(["migrations", "orphankeep"]),
        docs: [
          {
            _id: "legacy",
            kind: "history",
            name: currentName,
            batch: 1,
            checksum: null,
            run_at: "2026-03-14T10:00:00.000Z",
          },
          {
            _id: "relink",
            kind: "history",
            name: oldRelinkedName,
            batch: 1,
            checksum: null,
            run_at: "2026-03-14T10:01:00.000Z",
          },
          {
            _id: "prune",
            kind: "history",
            name: "20260314110000001_create_staleghost_table.ts",
            batch: 1,
            checksum: "checksum-prune",
            run_at: "2026-03-14T10:02:00.000Z",
          },
          {
            _id: "orphan",
            kind: "history",
            name: "20260314110000002_create_orphankeep_table.ts",
            batch: 1,
            checksum: "checksum-orphan",
            run_at: "2026-03-14T10:03:00.000Z",
          },
        ],
        createIndexErrors: [],
      };
      const db = makeMongoDb(state);

      const rows = await validateMigrationHistory(db as any, tempDir);

      expect(rows.some((row) => row.name === currentName && typeof row.checksum === "string")).toBe(true);
      expect(rows.some((row) => row.name === relinkedName && typeof row.checksum === "string")).toBe(true);
      expect(rows.some((row) => row.name === "20260314110000001_create_staleghost_table.ts")).toBe(false);
      expect(rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "20260314110000002_create_orphankeep_table.ts",
            checksum: "checksum-orphan",
          }),
        ]),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Pruned stale migration history entry"),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Keeping orphaned applied migration"),
      );
      expect(state.docs.some((doc) => doc.name === "20260314110000001_create_staleghost_table.ts")).toBe(false);
      expect(state.docs.some((doc) => doc.name === relinkedName)).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("validateMigrationHistory rejects missing manual migrations, missing disk files, and checksum mismatches", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mongo-tracker-phase2-errors-"));
    try {
      const fileName = "20260314104841001_create_wifis_table.ts";
      const filePath = path.join(tempDir, fileName);
      fs.writeFileSync(filePath, "export async function up() { return; }\n", "utf8");

      const missingManualDb = makeMongoDb({
        collections: new Set<string>(["migrations"]),
        docs: [
          {
            _id: "manual",
            kind: "history",
            name: "wifi_manual_missing.ts",
            batch: 1,
            checksum: null,
          },
        ],
        createIndexErrors: [],
      });
      await expect(validateMigrationHistory(missingManualDb as any, tempDir)).rejects.toThrow(
        "cannot be checksum-validated",
      );

      const missingDiskDb = makeMongoDb({
        collections: new Set<string>(["migrations"]),
        docs: [
          {
            _id: "missing-disk",
            kind: "history",
            name: "20260314120000001_update_wifis_table.ts",
            batch: 1,
            checksum: "already-present",
          },
        ],
        createIndexErrors: [],
      });
      await expect(validateMigrationHistory(missingDiskDb as any, tempDir)).rejects.toThrow(
        'Applied migration "20260314120000001_update_wifis_table.ts" is missing from disk.',
      );

      const mismatchDb = makeMongoDb({
        collections: new Set<string>(["migrations"]),
        docs: [
          {
            _id: "mismatch",
            kind: "history",
            name: fileName,
            batch: 1,
            checksum: "wrong-checksum",
          },
        ],
        createIndexErrors: [],
      });
      await expect(validateMigrationHistory(mismatchDb as any, tempDir)).rejects.toThrow(
        `Migration checksum mismatch for "${fileName}".`,
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
