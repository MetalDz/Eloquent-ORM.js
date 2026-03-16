import fs from "fs";
import path from "path";

import { getAdapter, getConnection } from "../core/connection/ConnectionFactory";
import type { DriverAdapter } from "../core/connection/DriverAdapter";
import { BaseModel } from "../core/model/BaseModel";
import { column } from "../core/schema/SchemaBlueprint";

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
  getConnection: jest.fn(),
}));

const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;
const mockedGetConnection = getConnection as jest.MockedFunction<typeof getConnection>;

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
    wrapId: (id: string) => `"${id}"`,
  };
}

describe("orderBy asc/desc contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetConnection.mockReset();
  });

  test("plan records explicit asc and desc support", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/OrderBy-Asc-Desc-Contract-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# OrderBy Asc Desc Contract Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("default `asc`");
    expect(content).toContain("explicit `desc`");
    expect(content).toContain("invalid-direction rejection");
  });

  test("safe finder orderBy supports default asc, explicit desc, and invalid-direction rejection", async () => {
    class OrderModel extends BaseModel {
      static schema = {
        id: column("increments"),
        created_at: column("timestamp"),
      };

      constructor() {
        super("users", "pg_test");
      }
    }

    const adapter = makePgAdapter();
    adapter.query.mockResolvedValue([]);
    mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

    await OrderModel.orderBy("created_at").get();
    await OrderModel.orderBy("created_at", "desc").get();

    expect(adapter.query).toHaveBeenNthCalledWith(
      1,
      'SELECT * FROM "users" ORDER BY "created_at" ASC',
      [],
    );
    expect(adapter.query).toHaveBeenNthCalledWith(
      2,
      'SELECT * FROM "users" ORDER BY "created_at" DESC',
      [],
    );
    expect(() => OrderModel.orderBy("created_at", "sideways" as never)).toThrow(
      "Unsupported sort direction 'sideways'. Use 'asc' or 'desc'.",
    );
  });
});
