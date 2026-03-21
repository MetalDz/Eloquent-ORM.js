import fs from "fs";
import os from "os";
import path from "path";
import { acquireMigrationLock } from "../cli/utils/migrations/MongoMigrationTracker";
import {
  deleteAppliedMigration,
  ensureMigrationCollection,
  readLastBatch,
  readAppliedMigrations,
  recordAppliedMigration,
  releaseMigrationLock,
  validateMigrationHistory,
} from "../cli/utils/migrations/MongoMigrationTracker";

type SortSpec = Record<string, 1 | -1>;

type FakeState = {
  collections: Set<string>;
  docs: Array<Record<string, unknown>>;
  createCollectionError?: Error | null;
  createIndexErrors: Error[];
  listCollectionsSequence?: boolean[];
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
      toArray: async () => {
        const next = state.listCollectionsSequence?.shift();
        const exists =
          typeof next === "boolean"
            ? next
            : Boolean(filter.name && state.collections.has(filter.name));
        return exists && filter.name ? [{ name: filter.name }] : [];
      },
    })),
  };
}

describe("LTS phase 5 MongoMigrationTracker coverage", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test("plan tracks the dedicated MongoMigrationTracker LTS slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-MongoMigrationTracker-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 MongoMigrationTracker Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/migrations/MongoMigrationTracker.ts");
    expect(content).toContain(
      "src/lab_test/lts.phase5.mongo-migration-tracker-coverage.logic.test.ts",
    );
  });

  test("ensureMigrationCollection rethrows unsafe index bootstrap failures", async () => {
    const db = makeMongoDb({
      collections: new Set<string>(),
      docs: [],
      createIndexErrors: [new Error("permission denied")],
    });

    await expect(ensureMigrationCollection(db as never)).rejects.toThrow("permission denied");
  });

  test("ensureMigrationCollection tolerates safe string bootstrap errors", async () => {
    const collection = {
      createIndex: jest
        .fn()
        .mockRejectedValueOnce("equivalent index already exists")
        .mockRejectedValueOnce("already exists"),
    };
    const db = {
      createCollection: jest.fn(async () => {
        throw "already exists";
      }),
      collection: jest.fn(() => collection),
    };

    await expect(ensureMigrationCollection(db as never)).resolves.toBeUndefined();
  });

  test("ensureMigrationCollection tolerates safe Error bootstrap failures and lock insert races", async () => {
    const collection = {
      createIndex: jest
        .fn()
        .mockRejectedValueOnce(new Error("equivalent index already exists"))
        .mockRejectedValueOnce(new Error("already exists")),
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ owner: "owner-1" }),
      insertOne: jest.fn().mockRejectedValueOnce(new Error("duplicate key")),
      deleteOne: jest.fn(async () => ({ acknowledged: true })),
      updateOne: jest.fn(async () => ({ acknowledged: true })),
      find: jest.fn(() => ({
        sort: () => ({
          toArray: async () => [],
          limit: () => ({ next: async () => null }),
        }),
      })),
    };
    const db = {
      createCollection: jest.fn(async () => {
        throw new Error("already exists");
      }),
      collection: jest.fn(() => collection),
      listCollections: jest.fn(() => ({
        toArray: async () => [],
      })),
    };

    await expect(ensureMigrationCollection(db as never)).resolves.toBeUndefined();
    await expect(acquireMigrationLock(db as never, "owner-1")).resolves.toBeUndefined();
  });

  test("ensureMigrationCollection covers safe Error handling when collection creation succeeds", async () => {
    const collection = {
      createIndex: jest
        .fn()
        .mockRejectedValueOnce(new Error("equivalent index already exists"))
        .mockResolvedValueOnce("ok"),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      deleteOne: jest.fn(),
      updateOne: jest.fn(),
      find: jest.fn(() => ({
        sort: () => ({
          toArray: async () => [],
          limit: () => ({ next: async () => null }),
        }),
      })),
    };
    const db = {
      createCollection: jest.fn(async () => ({ collectionName: "migrations" })),
      collection: jest.fn(() => collection),
      listCollections: jest.fn(() => ({
        toArray: async () => [],
      })),
    };

    await expect(ensureMigrationCollection(db as never)).resolves.toBeUndefined();
  });

  test("history readers normalize missing ids, missing batches, and zero last-batch state", async () => {
    const db = makeMongoDb({
      collections: new Set<string>(["migrations"]),
      docs: [
        {
          kind: "history",
          name: "20260315000000000_create_logs_table.ts",
          checksum: undefined,
          batch: undefined,
        },
      ],
      createIndexErrors: [],
    });

    await expect(readAppliedMigrations(db as never)).resolves.toEqual([
      {
        id: undefined,
        name: "20260315000000000_create_logs_table.ts",
        batch: 0,
        checksum: null,
        run_at: undefined,
      },
    ]);
    await expect(readLastBatch(db as never)).resolves.toBe(0);
  });

  test("history readers and writers cover Date normalization and mutation helpers", async () => {
    const db = makeMongoDb({
      collections: new Set<string>(["migrations"]),
      docs: [
        {
          _id: "history-1",
          kind: "history",
          name: "20260315000000006_create_metrics_table.ts",
          checksum: "checksum-1",
          batch: 4,
          run_at: new Date("2026-03-15T01:02:03.000Z"),
        },
      ],
      createIndexErrors: [],
    });

    await expect(readAppliedMigrations(db as never)).resolves.toEqual([
      {
        id: "history-1",
        name: "20260315000000006_create_metrics_table.ts",
        batch: 4,
        checksum: "checksum-1",
        run_at: "2026-03-15T01:02:03.000Z",
      },
    ]);
    await expect(readLastBatch(db as never)).resolves.toBe(4);

    await expect(
      recordAppliedMigration(
        db as never,
        "20260315000000007_create_more_metrics_table.ts",
        5,
        "checksum-2",
      ),
    ).resolves.toBeUndefined();
    await expect(
      deleteAppliedMigration(db as never, "20260315000000007_create_more_metrics_table.ts"),
    ).resolves.toBeUndefined();
    await expect(releaseMigrationLock(db as never, "owner-cleanup")).resolves.toBeUndefined();
  });

  test("acquireMigrationLock throws when another owner holds the lock", async () => {
    const db = makeMongoDb({
      collections: new Set<string>(["migrations"]),
      docs: [{ _id: "__eloquent_migration_lock__", kind: "lock", owner: "owner-a" }],
      createIndexErrors: [],
    });

    await expect(acquireMigrationLock(db as never, "owner-b")).rejects.toThrow(
      "Another migration process is already running.",
    );
  });

  test("validateMigrationHistory prunes stale generated create migrations during checksum backfill", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mongo-tracker-lts-prune-"));

    try {
      const staleName = "20260315000000003_create_staleghost_table.ts";
      const db = makeMongoDb({
        collections: new Set<string>(["migrations"]),
        docs: [
          {
            _id: "stale",
            kind: "history",
            name: staleName,
            batch: 1,
            checksum: null,
          },
        ],
        createIndexErrors: [],
      });

      await expect(validateMigrationHistory(db as never, tempDir)).resolves.toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Pruned stale migration history entry "${staleName}"`),
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("validateMigrationHistory keeps orphaned generated create migrations during checksum backfill when the collection still exists", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mongo-tracker-lts-orphan-"));

    try {
      const orphanName = "20260315000000001_create_orphankeep_table.ts";
      const db = makeMongoDb({
        collections: new Set<string>(["migrations", "orphankeep"]),
        docs: [
          {
            _id: "orphan",
            kind: "history",
            name: orphanName,
            batch: 1,
            checksum: null,
          },
        ],
        createIndexErrors: [],
      });

      const rows = await validateMigrationHistory(db as never, tempDir);

      expect(rows).toEqual([
        expect.objectContaining({
          name: orphanName,
          checksum: null,
        }),
      ]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Keeping orphaned applied migration "${orphanName}"`),
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("validateMigrationHistory rejects when a generated create collection disappears during checksum backfill", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mongo-tracker-lts-vanish-backfill-"));

    try {
      const migrationName = "20260315000000004_create_transientkeep_table.ts";
      const db = makeMongoDb({
        collections: new Set<string>(["migrations", "transientkeep"]),
        docs: [
          {
            _id: "transient-backfill",
            kind: "history",
            name: migrationName,
            batch: 1,
            checksum: null,
          },
        ],
        createIndexErrors: [],
        listCollectionsSequence: [true, false],
      });

      await expect(validateMigrationHistory(db as never, tempDir)).rejects.toThrow(
        `Applied migration "${migrationName}" is missing from disk and cannot be checksum-validated.`,
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("validateMigrationHistory relinks generated migration names during validation when checksum data already exists", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mongo-tracker-lts-relink-"));

    try {
      const nextName = "20260315010000002_create_wifi_devices_table.js";
      const previousName = "20260315000000002_create_wifi_devices_table.js";
      fs.writeFileSync(
        path.join(tempDir, nextName),
        "export async function up() { return; }\n",
        "utf8",
      );

      const db = makeMongoDb({
        collections: new Set<string>(["migrations"]),
        docs: [
          {
            _id: "relink",
            kind: "history",
            name: previousName,
            batch: 1,
            checksum: "legacy-checksum",
          },
        ],
        createIndexErrors: [],
      });

      const rows = await validateMigrationHistory(db as never, tempDir);

      expect(rows).toEqual([
        expect.objectContaining({
          name: nextName,
          checksum: expect.any(String),
        }),
      ]);
      expect(db.collection().updateOne).toHaveBeenCalledWith(
        { kind: "history", name: previousName },
        { $set: { name: nextName, checksum: expect.any(String) } },
      );
      expect(db.collection().find({ kind: "history" }).sort({ batch: 1, run_at: 1, _id: 1 }).toArray).toBeDefined();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("validateMigrationHistory rejects when a generated create collection disappears during validation", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mongo-tracker-lts-vanish-validate-"));

    try {
      const migrationName = "20260315000000005_create_transientvalidate_table.ts";
      const db = makeMongoDb({
        collections: new Set<string>(["migrations", "transientvalidate"]),
        docs: [
          {
            _id: "transient-validate",
            kind: "history",
            name: migrationName,
            batch: 1,
            checksum: "checksum-present",
          },
        ],
        createIndexErrors: [],
        listCollectionsSequence: [true, false],
      });

      await expect(validateMigrationHistory(db as never, tempDir)).rejects.toThrow(
        `Applied migration "${migrationName}" is missing from disk.`,
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
