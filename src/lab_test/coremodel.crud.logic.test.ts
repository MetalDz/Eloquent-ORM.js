import { CoreModel } from "../core/model/CoreModel";
import type { DriverAdapter } from "../core/connection/DriverAdapter";
import { getAdapter } from "../core/connection/ConnectionFactory";

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
  getConnection: jest.fn(),
}));

const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;

type CrudConnection = "mysql" | "sqlite";

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

  const wrapId = (id: string) => {
    for (const part of id.split(".")) {
      if (part !== "*" && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) {
        throw new Error(`Unsafe SQL identifier: ${part}`);
      }
    }
    return `\`${id}\``;
  };

  return {
    name,
    kind: "sql",
    query,
    queryOne,
    execute,
    insert,
    placeholder: () => "?",
    placeholders: (count: number) =>
      Array.from({ length: count }, () => "?").join(", "),
    inClause: (field: string, values: unknown[]) => ({
      sql: `${field} IN (${Array.from({ length: values.length }, () => "?").join(", ")})`,
      params: values,
      nextIndex: values.length + 1,
    }),
    wrapId,
  };
}

class CrudModel extends CoreModel {
  constructor(connectionName: CrudConnection = "mysql") {
    super("users", connectionName);
  }
}

describe.each<CrudConnection>(["mysql", "sqlite"])(
  "CoreModel CRUD logic (%s)",
  (driverName) => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test("create/find/all/update/delete use adapter and hydrate model instances", async () => {
      const adapter = makeAdapter(driverName);
      adapter.insert.mockResolvedValue({ id: 7 });
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
      expect(adapter.insert).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO `users`"),
        ["Alice"]
      );

      const found = await model.find(7);
      expect(found).toBeInstanceOf(CrudModel);
      expect(found).not.toBeNull();
      const foundRow = found as unknown as { id?: unknown; name?: unknown };
      expect(foundRow.id).toBe(7);
      expect(foundRow.name).toBe("Alice");
      expect(adapter.queryOne).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM `users` WHERE `id` = ?"),
        [7]
      );

      const allRows = await model.all();
      expect(allRows).toHaveLength(2);
      expect(allRows[0]).toBeInstanceOf(CrudModel);
      const secondRow = allRows[1] as unknown as { name?: unknown };
      expect(secondRow.name).toBe("Bob");
      expect(adapter.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM `users`")
      );

      await model.update(7, { name: "Alice 2" });
      expect(adapter.execute).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("UPDATE `users` SET `name` = ? WHERE `id` = ?"),
        ["Alice 2", 7]
      );

      await model.delete(7);
      expect(adapter.execute).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("DELETE FROM `users` WHERE `id` = ?"),
        [7]
      );

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

      expect(adapter.insert).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO `users`"),
        [payload]
      );

      await expect(
        model.create({ ["name); DROP TABLE users; --"]: payload })
      ).rejects.toThrow("Unsafe SQL identifier");
      await expect(model.find(1, "id OR 1=1")).rejects.toThrow("Unsafe SQL identifier");
      await expect(model.update(1, { name: "safe" }, "id; DELETE")).rejects.toThrow(
        "Unsafe SQL identifier"
      );
      await expect(model.delete(1, "id desc")).rejects.toThrow("Unsafe SQL identifier");
    });
  }
);
