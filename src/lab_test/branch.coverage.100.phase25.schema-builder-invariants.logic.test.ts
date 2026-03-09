import { dbConfig } from "../config/database";
import { SchemaBuilder } from "../core/schema/SchemaBuilder";
import { column, mixin, type SchemaField } from "../core/schema/SchemaBlueprint";

describe("Branch coverage 100% - phase 25 SchemaBuilder invariant branches", () => {
  const originalDefault = dbConfig.default;

  afterEach(() => {
    dbConfig.default = originalDefault;
    jest.restoreAllMocks();
  });

  test("covers unsupported default fallback when explicit dialect is omitted", async () => {
    dbConfig.default = "mongo" as any;

    const schema = {
      id: column("increments"),
    } satisfies Record<string, SchemaField>;

    await expect(
      SchemaBuilder.toCreateSQL(
        "users",
        schema,
        undefined,
        false,
        undefined,
        true
      )
    ).rejects.toThrow("Unsupported dialect");
  });

  test("covers non-SoftDeletes mixin branch in mixin handling", async () => {
    const schema = {
      id: column("increments"),
      hooks: mixin("Hooks" as any),
    } satisfies Record<string, SchemaField>;

    const result = await SchemaBuilder.toCreateSQL(
      "users",
      schema,
      "mysql",
      false,
      undefined,
      true
    );

    expect(result.mainSQL).toContain("CREATE TABLE IF NOT EXISTS `users`");
    expect(result.mainSQL).not.toContain("deleted_at");
  });

  test("covers boolean-false default literal and pg USER-DEFINED with udt_name branch", () => {
    const SB = SchemaBuilder as any;

    expect(SB.formatDefaultLiteral(false)).toBe("0");
    expect(
      SB.pgTypeSQL({
        data_type: "USER-DEFINED",
        udt_name: "status_enum",
        character_maximum_length: null,
        numeric_precision: null,
        numeric_scale: null,
      })
    ).toBe("status_enum");
  });
});
