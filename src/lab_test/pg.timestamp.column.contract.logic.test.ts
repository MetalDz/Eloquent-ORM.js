import { SchemaBuilder } from "../core/schema/SchemaBuilder.js";
import { SQLDialect } from "../core/schema/SQLDialect.js";
import { column, type SchemaField } from "../core/schema/SchemaBlueprint.js";

describe("PostgreSQL timestamp column contract", () => {
  test("supports timezone-aware business timestamps without implicit now defaults", async () => {
    const schema = {
      reviewed_at: column("timestamp", undefined, {
        useTz: true,
        defaultNow: false,
      }),
      expires_at: column("timestamp", undefined, {
        useTz: true,
        defaultNow: false,
        notNull: true,
      }),
      audit: column("timestamps", undefined, {
        useTz: true,
        defaultNow: false,
      }),
    } satisfies Record<string, SchemaField>;

    const result = await SchemaBuilder.toCreateSQL(
      "reviews",
      schema,
      "pg",
      false,
      undefined,
      true
    );

    expect(result.mainSQL).toContain('"reviewed_at" TIMESTAMPTZ');
    expect(result.mainSQL).not.toContain('"reviewed_at" TIMESTAMPTZ DEFAULT NOW()');
    expect(result.mainSQL).toContain('"expires_at" TIMESTAMPTZ NOT NULL');
    expect(result.mainSQL).not.toContain('"expires_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()');
    expect(result.mainSQL).toContain('"created_at" TIMESTAMPTZ');
    expect(result.mainSQL).toContain('"updated_at" TIMESTAMPTZ');
    expect(result.mainSQL).not.toContain('"created_at" TIMESTAMPTZ DEFAULT NOW()');
    expect(result.mainSQL).not.toContain('"updated_at" TIMESTAMPTZ DEFAULT NOW()');
  });

  test("keeps legacy timestamp defaults while allowing explicit timezone and explicit defaults", () => {
    const SB = SchemaBuilder as any;
    const pg = new SQLDialect("pg");
    const mysql = new SQLDialect("mysql");
    const sqlite = new SQLDialect("sqlite");

    expect(SB.timestampSqlType("mysql", {})).toBe("TIMESTAMP");
    expect(SB.timestampSqlType("sqlite", {})).toBe("DATETIME");
    expect(SB.timestampSqlType("pg", {})).toBe("TIMESTAMP");
    expect(SB.timestampSqlType("pg", { useTz: true })).toBe("TIMESTAMPTZ");

    expect(SB.currentTimestampSql("mysql")).toBe("CURRENT_TIMESTAMP");
    expect(SB.currentTimestampSql("sqlite")).toBe("CURRENT_TIMESTAMP");
    expect(SB.currentTimestampSql("pg")).toBe("NOW()");

    expect(
      SB.columnSQL("created_at", column("timestamp"), "pg", pg)
    ).toContain('"created_at" TIMESTAMP DEFAULT NOW()');
    expect(
      SB.columnSQL(
        "created_at",
        column("timestamp", undefined, { useTz: true }),
        "pg",
        pg
      )
    ).toContain('"created_at" TIMESTAMPTZ DEFAULT NOW()');
    expect(
      SB.columnSQL(
        "published_at",
        column("timestamp", undefined, { useTz: true, default: null }),
        "pg",
        pg
      )
    ).toContain('"published_at" TIMESTAMPTZ DEFAULT NULL');
    expect(
      SB.columnSQL("created_at", column("timestamp"), "mysql", mysql)
    ).toContain("`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    expect(
      SB.columnSQL("created_at", column("timestamp"), "sqlite", sqlite)
    ).toContain('"created_at" DATETIME DEFAULT CURRENT_TIMESTAMP');
  });

  test("never defaults soft delete columns to the current time", () => {
    const SB = SchemaBuilder as any;
    const pg = new SQLDialect("pg");
    const mysql = new SQLDialect("mysql");

    expect(
      SB.columnSQL(
        "deleted_at",
        column("softDeletes", undefined, { useTz: true }),
        "pg",
        pg
      )
    ).toBe('"deleted_at" TIMESTAMPTZ NULL DEFAULT NULL');
    expect(
      SB.mixinSQL({ kind: "mixin", name: "SoftDeletes" }, "pg", pg)
    ).toEqual(['"deleted_at" TIMESTAMP NULL DEFAULT NULL']);
    expect(
      SB.mixinSQL({ kind: "mixin", name: "SoftDeletes" }, "mysql", mysql)
    ).toEqual(["`deleted_at` TIMESTAMP NULL DEFAULT NULL"]);
  });
});
