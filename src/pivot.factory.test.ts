import { PivotHelperMixin } from "./core/orm/mixins/PivotHelperMixin";
import type { DriverAdapter } from "./core/connection/DriverAdapter";

type ExecuteCall = { sql: string; params: unknown[] };

function makeAdapter(calls: ExecuteCall[]): DriverAdapter {
  return {
    name: "mysql",
    kind: "sql",
    query: async () => [],
    queryOne: async () => null,
    execute: async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
    },
    insert: async () => ({ id: undefined }),
    placeholder: () => "?",
    placeholders: (count: number) => Array.from({ length: count }, () => "?").join(", "),
    inClause: (field: string, values: unknown[]) => ({
      sql: `${field} IN (${Array.from({ length: values.length }, () => "?").join(", ")})`,
      params: values,
      nextIndex: values.length + 1,
    }),
    wrapId: (id: string) => `\`${id}\``,
  };
}

class PivotBase {
  tableName = "users";
  connectionName = "mysql";
  private adapter: DriverAdapter;

  constructor(adapter: DriverAdapter) {
    this.adapter = adapter;
  }

  async getDB(): Promise<DriverAdapter> {
    return this.adapter;
  }
}

const PivotModel = PivotHelperMixin(PivotBase);

type PivotModelApi = {
  attach: (
    pivotTable: string,
    foreignKey: string,
    relatedKey: string,
    id: string | number,
    relatedIds: Array<string | number>
  ) => Promise<void>;
  sync: (
    pivotTable: string,
    foreignKey: string,
    relatedKey: string,
    id: string | number,
    relatedIds: Array<string | number>
  ) => Promise<void>;
};

describe("PivotHelperMixin", () => {
  test("attach inserts one row per related id", async () => {
    const calls: ExecuteCall[] = [];
    const adapter = makeAdapter(calls);
    const model = new PivotModel(adapter) as unknown as PivotModelApi;

    await model.attach("post_user_pivot", "user_id", "post_id", 42, [7, 13]);

    expect(calls).toHaveLength(2);
    expect(calls[0].sql).toContain("INSERT INTO `post_user_pivot`");
    expect(calls[0].params).toEqual([42, 7]);
    expect(calls[1].params).toEqual([42, 13]);
  });

  test("sync clears existing rows then inserts the new set", async () => {
    const calls: ExecuteCall[] = [];
    const adapter = makeAdapter(calls);
    const model = new PivotModel(adapter) as unknown as PivotModelApi;

    await model.sync("post_user_pivot", "user_id", "post_id", 9, [100, 200]);

    expect(calls).toHaveLength(3);
    expect(calls[0].sql).toContain("DELETE FROM `post_user_pivot`");
    expect(calls[0].params).toEqual([9]);
    expect(calls[1].sql).toContain("INSERT INTO `post_user_pivot`");
    expect(calls[1].params).toEqual([9, 100]);
    expect(calls[2].params).toEqual([9, 200]);
  });
});
