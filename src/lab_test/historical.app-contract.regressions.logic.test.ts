import { column, validate, type SchemaField } from "../core/schema/SchemaBlueprint.js";
import { SchemaBuilder } from "../core/schema/SchemaBuilder.js";

describe("historical app contract regressions", () => {
  test("patient-style pg timestamps stay empty until explicitly set and soft deletes stay null by default", async () => {
    const schema = {
      id: column("uuid", undefined, { primary: true }),
      first_name: validate(column("string", 100, { notNull: true }), {
        required: true,
        max: 100,
      }),
      last_name: validate(column("string", 100, { notNull: true }), {
        required: true,
        max: 100,
      }),
      date_of_birth: column("timestamp", undefined, { useTz: true, defaultNow: false }),
      sex: validate(column("string", 20), {
        in: ["male", "female"],
      }),
      created_at: column("timestamp", undefined, { notNull: true, useTz: true }),
      updated_at: column("timestamp", undefined, { notNull: true, useTz: true }),
      deleted_at: column("softDeletes", undefined, { useTz: true }),
    } satisfies Record<string, SchemaField>;

    const result = await SchemaBuilder.toCreateSQL(
      "patients",
      schema,
      "pg",
      false,
      undefined,
      true,
    );

    expect(result.mainSQL).toContain('"date_of_birth" TIMESTAMPTZ');
    expect(result.mainSQL).not.toContain('"date_of_birth" TIMESTAMPTZ DEFAULT NOW()');
    expect(result.mainSQL).toContain('"created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()');
    expect(result.mainSQL).toContain('"updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()');
    expect(result.mainSQL).toContain('"deleted_at" TIMESTAMPTZ NULL DEFAULT NULL');
    expect(result.mainSQL).not.toContain('"deleted_at" TIMESTAMPTZ DEFAULT NOW()');
  });

  test("file attachments keep storage_key uniqueness on the single intended column", async () => {
    const schema = {
      id: column("uuid", undefined, { primary: true }),
      storage_driver: validate(column("string", 50, { notNull: true }), {
        required: true,
        min: 3,
        max: 50,
      }),
      storage_key: validate(column("string", 255, { notNull: true, unique: true }), {
        required: true,
        min: 3,
        max: 255,
      }),
      mime_type: validate(column("string", 120, { notNull: true }), {
        required: true,
        min: 3,
        max: 120,
      }),
    } satisfies Record<string, SchemaField>;

    const result = await SchemaBuilder.toCreateSQL(
      "file_attachments",
      schema,
      "pg",
      false,
      undefined,
      true,
    );

    expect(result.mainSQL).toContain('"storage_key" VARCHAR(255) NOT NULL UNIQUE');
    expect(result.mainSQL).not.toContain('("storage_driver", "storage_key")');
  });
});
