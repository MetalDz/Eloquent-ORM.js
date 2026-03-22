import fs from "fs";
import os from "os";
import path from "path";
import { computeMigrationChecksum } from "../cli/utils/migrations/MigrationTracker";
import {
  acquireMigrationLock,
  doesCollectionExist,
  ensureMigrationCollection,
  readAppliedMigrations,
  validateMigrationHistory,
} from "../cli/utils/migrations/MongoMigrationTracker";

type SortSpec = Record<string, 1 | -1>;

type FakeState = {
  collections: Set<string>;
  docs: Array<Record<string, unknown>>;
  createCollectionError?: Error | string | null;
  createIndexErrors: Array<Error | string>;
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

describe("LTS phase 5 MongoMigrationTracker continuation", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test("continuation plan records the Docker-only residual slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-MongoMigrationTracker-Continuation-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 MongoMigrationTracker Continuation Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("line `70`");
    expect(content).toContain("line `387`");
    expect(content).toContain(
      "src/lab_test/lts.phase5.mongo-migration-tracker-continuation.logic.test.ts",
    );
    expect(content).toContain("Focused `MongoMigrationTracker.ts` Docker `v8` snapshot after this slice:");
  });

  test("ensureMigrationCollection rethrows unsafe string collection bootstrap failures", async () => {
    const db = makeMongoDb({
      collections: new Set<string>(),
      docs: [],
      createCollectionError: new Error("permission denied"),
      createIndexErrors: [],
    });

    await expect(ensureMigrationCollection(db as never)).rejects.toThrow("permission denied");
  });

  test("readAppliedMigrations keeps string run_at values as-is", async () => {
    const db = makeMongoDb({
      collections: new Set<string>(["migrations"]),
      docs: [
        {
          _id: "history-string",
          kind: "history",
          name: "20260322000000001_create_string_runs_table.ts",
          batch: 2,
          checksum: "checksum-string",
          run_at: "2026-03-22T00:00:00.000Z",
        },
      ],
      createIndexErrors: [],
    });

    await expect(readAppliedMigrations(db as never)).resolves.toEqual([
      {
        id: "history-string",
        name: "20260322000000001_create_string_runs_table.ts",
        batch: 2,
        checksum: "checksum-string",
        run_at: "2026-03-22T00:00:00.000Z",
      },
    ]);
  });

  test("acquireMigrationLock returns after a successful insert on an empty lock state", async () => {
    const db = makeMongoDb({
      collections: new Set<string>(["migrations"]),
      docs: [],
      createIndexErrors: [],
    });

    await expect(acquireMigrationLock(db as never, "owner-success")).resolves.toBeUndefined();
    expect(db.collection().insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "__eloquent_migration_lock__",
        kind: "lock",
        owner: "owner-success",
      }),
    );
  });

  test("validateMigrationHistory covers manual missing migrations, exact file backfill, and checksum-stable validation", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mongo-tracker-continuation-exact-"));

    try {
      const exactName = "20260322000000002_create_exact_users_table.ts";
      const exactPath = path.join(tempDir, exactName);
      fs.writeFileSync(exactPath, "export async function up() { return; }\n", "utf8");
      const exactChecksum = computeMigrationChecksum(exactPath);

      const state: FakeState = {
        collections: new Set<string>(["migrations"]),
        docs: [
          {
            _id: "manual-missing",
            kind: "history",
            name: "manual_custom_migration.ts",
            batch: 1,
            checksum: null,
          },
        ],
        createIndexErrors: [],
      };
      const db = makeMongoDb(state);

      await expect(validateMigrationHistory(db as never, tempDir)).rejects.toThrow(
        'Applied migration "manual_custom_migration.ts" is missing from disk and cannot be checksum-validated.',
      );

      db.collection().updateOne.mockClear();
      state.docs.splice(0, state.docs.length, {
        _id: "exact-history",
        kind: "history",
        name: exactName,
        batch: 2,
        checksum: null,
      });

      const hydratedRows = await validateMigrationHistory(db as never, tempDir);
      expect(hydratedRows).toEqual([
        expect.objectContaining({
          name: exactName,
          checksum: exactChecksum,
        }),
      ]);
      expect(db.collection().updateOne).toHaveBeenCalledWith(
        { kind: "history", name: exactName },
        { $set: { checksum: exactChecksum } },
      );

      db.collection().updateOne.mockClear();
      state.docs.splice(0, state.docs.length, {
        _id: "exact-validated",
        kind: "history",
        name: exactName,
        batch: 3,
        checksum: exactChecksum,
      });

      const validatedRows = await validateMigrationHistory(db as never, tempDir);
      expect(validatedRows).toEqual([
        expect.objectContaining({
          name: exactName,
          checksum: exactChecksum,
        }),
      ]);
      expect(db.collection().updateOne).not.toHaveBeenCalled();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("validateMigrationHistory relinks generated migrations during checksum backfill before validation", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mongo-tracker-continuation-relink-"));

    try {
      const previousName = "20260322000000005_create_relinkable_table.ts";
      const nextName = "20260322000009999_create_relinkable_table.ts";
      const nextPath = path.join(tempDir, nextName);
      fs.writeFileSync(nextPath, "export async function up() { return; }\n", "utf8");
      const checksum = computeMigrationChecksum(nextPath);

      const state: FakeState = {
        collections: new Set<string>(["migrations"]),
        docs: [
          {
            _id: "relink-during-backfill",
            kind: "history",
            name: previousName,
            batch: 1,
            checksum: null,
          },
        ],
        createIndexErrors: [],
      };
      const db = makeMongoDb(state);

      await expect(validateMigrationHistory(db as never, tempDir)).resolves.toEqual([
        expect.objectContaining({
          name: nextName,
          checksum,
        }),
      ]);
      expect(db.collection().updateOne).toHaveBeenCalledWith(
        { kind: "history", name: previousName },
        { $set: { name: nextName, checksum } },
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("validateMigrationHistory prunes missing generated creates during validation and covers missing-dir generated fallback", async () => {
    const validationDir = fs.mkdtempSync(path.join(os.tmpdir(), "mongo-tracker-continuation-validate-"));
    const missingDir = path.join(validationDir, "missing-subdir");

    try {
      const generatedName = "20260322000000003_create_prunableghost_table.ts";
      const state: FakeState = {
        collections: new Set<string>(["migrations"]),
        docs: [
          {
            _id: "prunable",
            kind: "history",
            name: generatedName,
            batch: 1,
            checksum: "checksum-present",
          },
        ],
        createIndexErrors: [],
      };
      const db = makeMongoDb(state);

      await expect(validateMigrationHistory(db as never, validationDir)).resolves.toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Pruned stale migration history entry "${generatedName}"`),
      );

      state.docs.splice(0, state.docs.length, {
        _id: "generated-missing-dir",
        kind: "history",
        name: "20260322000000004_update_missingdir_table.ts",
        batch: 1,
        checksum: null,
      });

      await expect(validateMigrationHistory(db as never, missingDir)).rejects.toThrow(
        'Applied migration "20260322000000004_update_missingdir_table.ts" is missing from disk and cannot be checksum-validated.',
      );
    } finally {
      fs.rmSync(validationDir, { recursive: true, force: true });
    }
  });

  test("validateMigrationHistory throws on checksum mismatch for an unchanged file name", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mongo-tracker-continuation-mismatch-"));

    try {
      const fileName = "20260322000000006_create_checksum_mismatch_table.ts";
      const filePath = path.join(tempDir, fileName);
      fs.writeFileSync(filePath, "export async function up() { return 1; }\n", "utf8");

      const state: FakeState = {
        collections: new Set<string>(["migrations"]),
        docs: [
          {
            _id: "checksum-mismatch",
            kind: "history",
            name: fileName,
            batch: 1,
            checksum: "old-checksum",
          },
        ],
        createIndexErrors: [],
      };
      const db = makeMongoDb(state);

      await expect(validateMigrationHistory(db as never, tempDir)).rejects.toThrow(
        `Migration checksum mismatch for "${fileName}". The applied migration file was modified after execution.`,
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("doesCollectionExist exposes the collectionExists wrapper", async () => {
    const presentDb = makeMongoDb({
      collections: new Set<string>(["migrations", "widgets"]),
      docs: [],
      createIndexErrors: [],
    });
    const missingDb = makeMongoDb({
      collections: new Set<string>(["migrations"]),
      docs: [],
      createIndexErrors: [],
    });

    await expect(doesCollectionExist(presentDb as never, "widgets")).resolves.toBe(true);
    await expect(doesCollectionExist(missingDb as never, "widgets")).resolves.toBe(false);
  });
});
