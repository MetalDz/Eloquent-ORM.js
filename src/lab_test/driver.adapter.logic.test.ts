import { createAdapter } from "../core/connection/DriverAdapter";

describe("DriverAdapter parity", () => {
  test("mysql adapter uses question-mark placeholders and mysql query semantics", async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([[{ id: 1 }, { id: 2 }]])
      .mockResolvedValueOnce([[{ id: 3 }]])
      .mockResolvedValueOnce([undefined])
      .mockResolvedValueOnce([{ insertId: 42 }]);

    const adapter = createAdapter(
      "mysql_test",
      { query } as never
    );

    expect(adapter.placeholder(1)).toBe("?");
    expect(adapter.placeholders(3, 5)).toBe("?, ?, ?");
    expect(adapter.inClause("id", [10, 11], 4)).toEqual({
      sql: "id IN (?, ?)",
      params: [10, 11],
      nextIndex: 6,
    });
    expect(adapter.wrapId("users.name")).toBe("`users`.`name`");
    expect(adapter.wrapId("users.*")).toBe("`users`.*");

    await expect(adapter.query("SELECT * FROM users")).resolves.toEqual([
      { id: 1 },
      { id: 2 },
    ]);
    await expect(adapter.queryOne("SELECT * FROM users WHERE id = ?", [3])).resolves.toEqual({
      id: 3,
    });
    await expect(adapter.execute("DELETE FROM users WHERE id = ?", [3])).resolves.toBeUndefined();
    await expect(adapter.insert("INSERT INTO users (name) VALUES (?)", ["A"])).resolves.toEqual({
      id: 42,
    });

    expect(query).toHaveBeenNthCalledWith(1, "SELECT * FROM users", []);
    expect(query).toHaveBeenNthCalledWith(2, "SELECT * FROM users WHERE id = ?", [3]);
    expect(query).toHaveBeenNthCalledWith(3, "DELETE FROM users WHERE id = ?", [3]);
    expect(query).toHaveBeenNthCalledWith(4, "INSERT INTO users (name) VALUES (?)", ["A"]);
  });

  test("sqlite adapter uses sqlite methods and quoted identifiers", async () => {
    const all = jest.fn().mockResolvedValue([{ id: 1 }]);
    const get = jest.fn().mockResolvedValue({ id: 2 });
    const run = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ lastID: 99 });

    const adapter = createAdapter(
      "sqlite_test",
      { all, get, run } as never
    );

    expect(adapter.placeholder(1)).toBe("?");
    expect(adapter.placeholders(2, 3)).toBe("?, ?");
    expect(adapter.inClause('"id"', [1, 2, 3], 1)).toEqual({
      sql: '"id" IN (?, ?, ?)',
      params: [1, 2, 3],
      nextIndex: 4,
    });
    expect(adapter.wrapId("users.name")).toBe('"users"."name"');

    await expect(adapter.query("SELECT * FROM users")).resolves.toEqual([{ id: 1 }]);
    await expect(adapter.queryOne("SELECT * FROM users WHERE id = ?", [2])).resolves.toEqual({
      id: 2,
    });
    await expect(adapter.execute("DELETE FROM users WHERE id = ?", [2])).resolves.toBeUndefined();
    await expect(adapter.insert("INSERT INTO users (name) VALUES (?)", ["B"])).resolves.toEqual({
      id: 99,
    });

    expect(all).toHaveBeenCalledWith("SELECT * FROM users", []);
    expect(get).toHaveBeenCalledWith("SELECT * FROM users WHERE id = ?", [2]);
    expect(run).toHaveBeenNthCalledWith(1, "DELETE FROM users WHERE id = ?", [2]);
    expect(run).toHaveBeenNthCalledWith(2, "INSERT INTO users (name) VALUES (?)", ["B"]);
  });

  test("pg adapter uses numbered placeholders, ANY clauses, and RETURNING", async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] })
      .mockResolvedValueOnce({ rows: [{ id: 3 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 55, name: "C" }] });

    const adapter = createAdapter(
      "pg_test",
      { query } as never
    );

    expect(adapter.placeholder(1)).toBe("$1");
    expect(adapter.placeholders(3, 2)).toBe("$2, $3, $4");
    expect(adapter.inClause('"id"', [7, 8], 3)).toEqual({
      sql: '"id" = ANY($3)',
      params: [[7, 8]],
      nextIndex: 4,
    });
    expect(adapter.inClause('"id"', [], 5)).toEqual({
      sql: "1=0",
      params: [],
      nextIndex: 5,
    });
    expect(adapter.wrapId("public.users")).toBe('"public"."users"');

    await expect(adapter.query("SELECT * FROM users")).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    await expect(adapter.queryOne("SELECT * FROM users WHERE id = $1", [3])).resolves.toEqual({
      id: 3,
    });
    await expect(adapter.execute("DELETE FROM users WHERE id = $1", [3])).resolves.toBeUndefined();
    await expect(
      adapter.insert("INSERT INTO users (name) VALUES ($1)", ["C"])
    ).resolves.toEqual({
      id: 55,
      row: { id: 55, name: "C" },
    });

    expect(query).toHaveBeenNthCalledWith(1, "SELECT * FROM users", []);
    expect(query).toHaveBeenNthCalledWith(2, "SELECT * FROM users WHERE id = $1", [3]);
    expect(query).toHaveBeenNthCalledWith(3, "DELETE FROM users WHERE id = $1", [3]);
    expect(query).toHaveBeenNthCalledWith(
      4,
      "INSERT INTO users (name) VALUES ($1) RETURNING *",
      ["C"]
    );
  });

  test("adapter rejects unsafe identifiers and mongo adapter creation", () => {
    const mysqlAdapter = createAdapter(
      "mysql_test",
      { query: jest.fn() } as never
    );

    expect(() => mysqlAdapter.wrapId("users;DROP TABLE users")).toThrow(
      "Unsafe SQL identifier"
    );
    expect(() => createAdapter("mongo", {} as never)).toThrow(
      "Mongo driver does not support SQL adapter APIs."
    );
  });
});
