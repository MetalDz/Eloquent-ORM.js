import fs from "fs";
import path from "path";

describe("database metadata docs", () => {
  const rootDir = process.cwd();

  test("official docs publish the schema versus database contract", () => {
    const page = fs.readFileSync(
      path.resolve(rootDir, "docs/orm/database-metadata.mdx"),
      "utf8"
    );
    const relations = fs.readFileSync(
      path.resolve(rootDir, "docs/orm/relations.mdx"),
      "utf8"
    );
    const migrations = fs.readFileSync(
      path.resolve(rootDir, "docs/orm/migrations.mdx"),
      "utf8"
    );
    const mint = fs.readFileSync(path.resolve(rootDir, "mint.json"), "utf8");

    expect(page).toContain("`static schema`");
    expect(page).toContain("`static database`");
    expect(page).toContain("foreign keys");
    expect(page).toContain("composite unique indexes");
    expect(page).toContain("composite normal indexes");
    expect(page).toContain("named PostgreSQL foreign key");
    expect(page).toContain("Do not restate simple columns inside `static database`.");
    expect(page).toContain("Do not rely on `relation(...)` alone for critical database enforcement.");
    expect(page).toContain("1. update the model");
    expect(page).toContain("2. generate migrations with `eloquent make:migration`");
    expect(page).toContain("4. rerun generation and expect no schema differences");
    expect(page).toContain('relation("belongsToMany", "Tag", {');
    expect(page).toContain('pivotTable: "post_tags"');

    expect(relations).toContain("[Database metadata](./database-metadata)");
    expect(relations).toContain("Use [`static database`](./database-metadata) for physical foreign keys and composite indexes.");
    expect(migrations).toContain("define them in [`static database`](./database-metadata)");
    expect(mint).toContain('"orm/database-metadata"');
  });
});
