import { CoreModel } from "../core/model/CoreModel.js";
import type { DriverAdapter } from "../core/connection/DriverAdapter.js";
import { getAdapter } from "../core/connection/ConnectionFactory.js";
import { column, validate } from "../core/schema/SchemaBlueprint.js";

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
  getConnection: jest.fn(),
}));

const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;

type CrudConnection = "mysql" | "sqlite" | "pg";

function makeAdapter(name: CrudConnection): DriverAdapter & {
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

class CrudModel extends CoreModel {
  constructor(connectionName: CrudConnection = "mysql") {
    super("users", connectionName);
  }
}

class ValidatedCrudModel extends CoreModel {
  static schema = {
    name: validate(column("string", 255), { required: true, min: 3 }),
    email: validate(column("string", 255), { required: true, email: true }),
  };

  constructor(connectionName: CrudConnection = "mysql") {
    super("users", connectionName);
  }
}

describe.each<CrudConnection>(["mysql", "sqlite", "pg"])(
  "CoreModel CRUD logic (%s)",
  (driverName) => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test("create/find/all/update/delete use adapter and hydrate model instances", async () => {
      const adapter = makeAdapter(driverName);
      if (driverName === "pg") {
        adapter.insert.mockResolvedValue({ id: 7, row: { id: 7, name: "Alice" } });
      } else {
        adapter.insert.mockResolvedValue({ id: 7 });
      }
      adapter.queryOne.mockResolvedValue({ id: 7, name: "Alice" });
      adapter.query.mockResolvedValue([
        { id: 7, name: "Alice" },
        { id: 8, name: "Bob" },
      ]);

      mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

      const model = new CrudModel(driverName);

      const created = await model.create({ name: "Alice" });
      expect(created).toBeInstanceOf(CrudModel);
      expect(created).not.toBeNull();
      const createdRow = created as unknown as { id?: unknown; name?: unknown };
      expect(createdRow.id).toBe(7);
      expect(createdRow.name).toBe("Alice");
      if (driverName === "pg") {
        expect(adapter.insert).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO "users" ("name") VALUES ($1)'),
          ["Alice"]
        );
      } else if (driverName === "mysql") {
        expect(adapter.insert).toHaveBeenCalledWith(
          expect.stringContaining("INSERT INTO `users`"),
          ["Alice"]
        );
      } else {
        expect(adapter.insert).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO "users"'),
          ["Alice"]
        );
      }

      const found = await model.find(7);
      expect(found).toBeInstanceOf(CrudModel);
      expect(found).not.toBeNull();
      const foundRow = found as unknown as { id?: unknown; name?: unknown };
      expect(foundRow.id).toBe(7);
      expect(foundRow.name).toBe("Alice");
      if (driverName === "pg") {
        expect(adapter.queryOne).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM "users" WHERE "id" = $1'),
          [7]
        );
      } else if (driverName === "mysql") {
        expect(adapter.queryOne).toHaveBeenCalledWith(
          expect.stringContaining("SELECT * FROM `users` WHERE `id` = ?"),
          [7]
        );
      } else {
        expect(adapter.queryOne).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM "users" WHERE "id" = ?'),
          [7]
        );
      }

      const allRows = await model.all();
      expect(allRows).toHaveLength(2);
      expect(allRows[0]).toBeInstanceOf(CrudModel);
      const secondRow = allRows[1] as unknown as { name?: unknown };
      expect(secondRow.name).toBe("Bob");
      if (driverName === "pg") {
        expect(adapter.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM "users"')
        );
      } else if (driverName === "mysql") {
        expect(adapter.query).toHaveBeenCalledWith(
          expect.stringContaining("SELECT * FROM `users`")
        );
      } else {
        expect(adapter.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM "users"')
        );
      }

      await model.update(7, { name: "Alice 2" });
      if (driverName === "pg") {
        expect(adapter.execute).toHaveBeenNthCalledWith(
          1,
          expect.stringContaining('UPDATE "users" SET "name" = $1 WHERE "id" = $2'),
          ["Alice 2", 7]
        );
      } else if (driverName === "mysql") {
        expect(adapter.execute).toHaveBeenNthCalledWith(
          1,
          expect.stringContaining("UPDATE `users` SET `name` = ? WHERE `id` = ?"),
          ["Alice 2", 7]
        );
      } else {
        expect(adapter.execute).toHaveBeenNthCalledWith(
          1,
          expect.stringContaining('UPDATE "users" SET "name" = ? WHERE "id" = ?'),
          ["Alice 2", 7]
        );
      }

      await model.delete(7);
      if (driverName === "pg") {
        expect(adapter.execute).toHaveBeenNthCalledWith(
          2,
          expect.stringContaining('DELETE FROM "users" WHERE "id" = $1'),
          [7]
        );
      } else if (driverName === "mysql") {
        expect(adapter.execute).toHaveBeenNthCalledWith(
          2,
          expect.stringContaining("DELETE FROM `users` WHERE `id` = ?"),
          [7]
        );
      } else {
        expect(adapter.execute).toHaveBeenNthCalledWith(
          2,
          expect.stringContaining('DELETE FROM "users" WHERE "id" = ?'),
          [7]
        );
      }

      expect(mockedGetAdapter).toHaveBeenCalledWith(driverName);
    });

    test("update with empty payload does not execute SQL", async () => {
      const adapter = makeAdapter(driverName);
      mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);
      const model = new CrudModel(driverName);

      await model.update(9, {});

      expect(adapter.execute).not.toHaveBeenCalled();
    });

    test("malicious values remain bound params and unsafe identifiers are rejected", async () => {
      const adapter = makeAdapter(driverName);
      adapter.insert.mockResolvedValue({ id: 9 });
      mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);
      const model = new CrudModel(driverName);

      const payload = "x'; DROP TABLE users; --";
      await model.create({ name: payload });

      if (driverName === "pg") {
        expect(adapter.insert).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO "users" ("name") VALUES ($1)'),
          [payload]
        );
      } else if (driverName === "mysql") {
        expect(adapter.insert).toHaveBeenCalledWith(
          expect.stringContaining("INSERT INTO `users`"),
          [payload]
        );
      } else {
        expect(adapter.insert).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO "users"'),
          [payload]
        );
      }

      await expect(
        model.create({ ["name); DROP TABLE users; --"]: payload })
      ).rejects.toThrow("Unsafe SQL identifier");
      await expect(model.find(1, "id OR 1=1")).rejects.toThrow("Unsafe SQL identifier");
      await expect(model.update(1, { name: "safe" }, "id; DELETE")).rejects.toThrow(
        "Unsafe SQL identifier"
      );
      await expect(model.delete(1, "id desc")).rejects.toThrow("Unsafe SQL identifier");
    });

    test("patch-style updates validate only provided fields while create remains strict", async () => {
      const adapter = makeAdapter(driverName);
      if (driverName === "pg") {
        adapter.insert.mockResolvedValue({ id: 10, row: { id: 10, name: "Alice" } });
      } else {
        adapter.insert.mockResolvedValue({ id: 10 });
      }

      mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

      const model = new ValidatedCrudModel(driverName);

      await expect(model.update(10, { name: "Alice" })).resolves.toBeUndefined();
      await expect(model.update(10, { email: "not-an-email" })).rejects.toThrow(
        "is not a valid email address"
      );
      await expect(model.create({ name: "Alice" })).rejects.toThrow("email is required");

      if (driverName === "pg") {
        expect(adapter.execute).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE "users" SET "name" = $1 WHERE "id" = $2'),
          ["Alice", 10]
        );
      } else if (driverName === "mysql") {
        expect(adapter.execute).toHaveBeenCalledWith(
          expect.stringContaining("UPDATE `users` SET `name` = ? WHERE `id` = ?"),
          ["Alice", 10]
        );
      } else {
        expect(adapter.execute).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE "users" SET "name" = ? WHERE "id" = ?'),
          ["Alice", 10]
        );
      }
    });

    test("ELOQUENT_DISABLE_MODEL_HOOKS bypasses validation hooks and model events", async () => {
      const adapter = makeAdapter(driverName);
      if (driverName === "pg") {
        adapter.insert.mockResolvedValue({ id: 12, row: { id: 12, name: "Alice" } });
      } else {
        adapter.insert.mockResolvedValue({ id: 12 });
      }
      mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

      const beforeValidate = jest.fn();
      const afterValidate = jest.fn();
      const beforeCreate = jest.fn();
      const afterCreate = jest.fn();

      class HookAwareModel extends CoreModel {
        static schema = {
          name: validate(column("string", 255), { required: true, min: 1 }),
        };

        static validationHooks = {
          beforeValidate,
          afterValidate,
        };

        static modelEvents = {
          beforeCreate,
          afterCreate,
        };

        constructor(connectionName: CrudConnection = "mysql") {
          super("users", connectionName);
        }
      }

      const originalDisableHooks = process.env.ELOQUENT_DISABLE_MODEL_HOOKS;
      process.env.ELOQUENT_DISABLE_MODEL_HOOKS = "true";

      try {
        const model = new HookAwareModel(driverName);
        await model.create({ name: "Alice" });
      } finally {
        if (originalDisableHooks === undefined) {
          delete process.env.ELOQUENT_DISABLE_MODEL_HOOKS;
        } else {
          process.env.ELOQUENT_DISABLE_MODEL_HOOKS = originalDisableHooks;
        }
      }

      expect(beforeValidate).not.toHaveBeenCalled();
      expect(afterValidate).not.toHaveBeenCalled();
      expect(beforeCreate).not.toHaveBeenCalled();
      expect(afterCreate).not.toHaveBeenCalled();
      expect(adapter.insert).toHaveBeenCalledTimes(1);
    });
  }
);
