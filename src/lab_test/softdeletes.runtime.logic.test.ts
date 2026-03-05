import { BaseModel } from "../core/model/BaseModel";
import type { DriverAdapter } from "../core/connection/DriverAdapter";
import { getAdapter } from "../core/connection/ConnectionFactory";

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
  getConnection: jest.fn(),
}));

const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;

type SqlConnection = "mysql" | "sqlite" | "pg";

function makeAdapter(name: SqlConnection): DriverAdapter & {
  query: jest.Mock;
  queryOne: jest.Mock;
  execute: jest.Mock;
  insert: jest.Mock;
} {
  const query = jest.fn();
  const queryOne = jest.fn();
  const execute = jest.fn();
  const insert = jest.fn();
  const quote = name === "mysql" ? "`" : "\"";

  const wrapId = (id: string) => {
    for (const part of id.split(".")) {
      if (part !== "*" && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) {
        throw new Error(`Unsafe SQL identifier: ${part}`);
      }
    }
    return `${quote}${id}${quote}`;
  };

  return {
    name,
    kind: "sql",
    query,
    queryOne,
    execute,
    insert,
    placeholder: (index: number) => (name === "pg" ? `$${index}` : "?"),
    placeholders: (count: number, startIndex = 1) =>
      Array.from(
        { length: count },
        (_, idx) => (name === "pg" ? `$${startIndex + idx}` : "?")
      ).join(", "),
    inClause: (field: string, values: unknown[], startIndex = 1) =>
      name === "pg"
        ? {
            sql: `${field} = ANY($${startIndex})`,
            params: [values],
            nextIndex: startIndex + 1,
          }
        : {
            sql: `${field} IN (${Array.from({ length: values.length }, () => "?").join(", ")})`,
            params: values,
            nextIndex: startIndex + values.length,
          },
    wrapId,
  };
}

class SoftDeleteModel extends BaseModel {
  constructor(connectionName: SqlConnection) {
    super("users", connectionName);
  }
}

describe.each<SqlConnection>(["mysql", "sqlite", "pg"])(
  "SoftDeletes runtime parity (%s)",
  (driverName) => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test("delete/restore/forceDelete and soft-delete filters behave consistently", async () => {
      const adapter = makeAdapter(driverName);
      adapter.query.mockResolvedValue([
        { id: 1, name: "Active User", deleted_at: null },
        { id: 2, name: "Deleted User", deleted_at: "2026-03-01T00:00:00.000Z" },
      ]);
      adapter.queryOne
        .mockResolvedValueOnce({ id: 1, name: "Active User", deleted_at: null })
        .mockResolvedValueOnce({
          id: 2,
          name: "Deleted User",
          deleted_at: "2026-03-01T00:00:00.000Z",
        });

      mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

      const model = new SoftDeleteModel(driverName);

      const visibleRows = await model.all();
      expect(visibleRows).toHaveLength(1);
      expect((visibleRows[0] as unknown as { id?: unknown }).id).toBe(1);

      const withTrashedRows = await (model as any).withTrashed();
      expect(withTrashedRows).toHaveLength(2);

      const onlyTrashedRows = await (model as any).onlyTrashed();
      expect(onlyTrashedRows).toHaveLength(1);
      expect((onlyTrashedRows[0] as unknown as { id?: unknown }).id).toBe(2);

      const foundVisible = await model.find(1);
      expect(foundVisible).not.toBeNull();
      const foundDeleted = await model.find(2);
      expect(foundDeleted).toBeNull();

      await model.delete(1);
      await (model as any).restore(1);
      await (model as any).forceDelete(1);

      if (driverName === "pg") {
        expect(adapter.execute).toHaveBeenNthCalledWith(
          1,
          expect.stringContaining('UPDATE "users" SET "deleted_at" = $1 WHERE "id" = $2'),
          [expect.any(String), 1]
        );
        expect(adapter.execute).toHaveBeenNthCalledWith(
          2,
          expect.stringContaining('UPDATE "users" SET "deleted_at" = $1 WHERE "id" = $2'),
          [null, 1]
        );
        expect(adapter.execute).toHaveBeenNthCalledWith(
          3,
          expect.stringContaining('DELETE FROM "users" WHERE "id" = $1'),
          [1]
        );
      } else if (driverName === "mysql") {
        expect(adapter.execute).toHaveBeenNthCalledWith(
          1,
          expect.stringContaining("UPDATE `users` SET `deleted_at` = ? WHERE `id` = ?"),
          [expect.any(String), 1]
        );
        expect(adapter.execute).toHaveBeenNthCalledWith(
          2,
          expect.stringContaining("UPDATE `users` SET `deleted_at` = ? WHERE `id` = ?"),
          [null, 1]
        );
        expect(adapter.execute).toHaveBeenNthCalledWith(
          3,
          expect.stringContaining("DELETE FROM `users` WHERE `id` = ?"),
          [1]
        );
      } else {
        expect(adapter.execute).toHaveBeenNthCalledWith(
          1,
          expect.stringContaining('UPDATE "users" SET "deleted_at" = ? WHERE "id" = ?'),
          [expect.any(String), 1]
        );
        expect(adapter.execute).toHaveBeenNthCalledWith(
          2,
          expect.stringContaining('UPDATE "users" SET "deleted_at" = ? WHERE "id" = ?'),
          [null, 1]
        );
        expect(adapter.execute).toHaveBeenNthCalledWith(
          3,
          expect.stringContaining('DELETE FROM "users" WHERE "id" = ?'),
          [1]
        );
      }
    });
  }
);
