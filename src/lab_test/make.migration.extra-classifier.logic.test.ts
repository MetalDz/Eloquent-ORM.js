import { classifyExtraMigrationSql } from "../cli/utils/migrations/ExtraMigrationClassifier.js";

describe("makeMigration extra SQL classifier", () => {
  test("classifies real pivot table SQL from the table name", () => {
    expect(
      classifyExtraMigrationSql(
        'CREATE TABLE IF NOT EXISTS "post_tags" ("post_id" INTEGER, "tag_id" INTEGER);'
      )
    ).toEqual({
      targetName: "post_tags",
      fileSuffix: "create_post_tags_table",
      headerLabel: "post_tags",
      logLabel: "Pivot migration",
      fallbackRollbackSql: "DROP TABLE IF EXISTS post_tags;",
    });
  });

  test("classifies helper index SQL from the target table", () => {
    expect(
      classifyExtraMigrationSql(
        'CREATE UNIQUE INDEX user_provider_unique ON "users" ("email", "provider");'
      )
    ).toEqual({
      targetName: "users",
      fileSuffix: "add_users_indexes",
      headerLabel: "users indexes",
      logLabel: "Helper migration",
      fallbackRollbackSql: "DROP INDEX IF EXISTS user_provider_unique;",
    });
  });

  test("classifies generic schema extras when SQL is not a table or index", () => {
    expect(
      classifyExtraMigrationSql(
        'ALTER TABLE "users" ADD CONSTRAINT users_email_check CHECK ("email" <> \'\');'
      )
    ).toEqual({
      targetName: "schema_extras",
      fileSuffix: "add_schema_extras",
      headerLabel: "schema extras",
      logLabel: "Helper migration",
      fallbackRollbackSql: "-- rollback SQL unavailable for schema extras",
    });
  });
});
