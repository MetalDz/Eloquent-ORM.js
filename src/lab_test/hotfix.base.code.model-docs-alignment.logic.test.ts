import fs from "fs";
import path from "path";

describe("Hot Fix base code model docs alignment", () => {
  const rootDir = process.cwd();

  test("task doc freezes the SQL and Mongo model-doc scope", () => {
    const plan = fs.readFileSync(
      path.resolve(rootDir, "validation tasks/Hot-Fix-Base-Code-Model-Docs-Alignment.md"),
      "utf8"
    );

    const requiredSnippets = [
      "# Hot Fix Base Code - Model Docs Alignment",
      "Status: IN PROGRESS",
      "keep SQL and Mongo model guidance clearly separated",
      "explain when to choose MySQL, PostgreSQL, SQLite, and Mongo",
      "`belongsTo`",
      "`hasOne`",
      "`hasMany`",
      "`belongsToMany`",
      "`morphOne`",
      "`morphMany`",
      "`morphTo`",
      "Mongo docs state that foreign-key guarantees do not exist",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("runtime and api model docs cover driver choice and relation guidance", () => {
    const runtimeModels = fs.readFileSync(
      path.resolve(rootDir, "src/documentation/runtime-models.md"),
      "utf8"
    );
    const runtimeModelsMdx = fs.readFileSync(
      path.resolve(rootDir, "docs/runtime/models.mdx"),
      "utf8"
    );
    const apiModels = fs.readFileSync(
      path.resolve(rootDir, "docs/api/models.mdx"),
      "utf8"
    );

    const sharedSnippets = [
      "MySQL",
      "PostgreSQL",
      "SQLite",
      "Mongo",
      "`belongsTo`",
      "`hasOne`",
      "`hasMany`",
      "`belongsToMany`",
      "`morphOne`",
      "`morphMany`",
      "`morphTo`",
    ];

    for (const snippet of sharedSnippets) {
      expect(runtimeModels).toContain(snippet);
      expect(runtimeModelsMdx).toContain(snippet);
      expect(apiModels).toContain(snippet);
    }

    expect(runtimeModels).toContain("migration-backed integrity");
    expect(runtimeModels).toContain("no SQL foreign-key guarantees");
    expect(runtimeModelsMdx).toContain("pivot tables");
    expect(runtimeModelsMdx).toContain("document-first");
    expect(apiModels).toContain("constraints, pivot tables, and migration-backed integrity");
    expect(apiModels).toContain("relation support depends on explicit model methods");
  });
});
