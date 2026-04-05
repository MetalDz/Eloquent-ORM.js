import { column, relation, type SchemaField } from "../core/schema/SchemaBlueprint.js";
import {
  sortModelsByDependencies,
  type DependencySortableModel,
} from "../cli/utils/migrations/ModelDependencySorter.js";

function makeModel(
  modelClassName: string,
  tableName: string,
  schema: Record<string, SchemaField>,
  database?: DependencySortableModel["ModelClass"]["database"]
): DependencySortableModel {
  return {
    modelClassName,
    ModelClass: {
      tableName,
      schema,
      database,
    },
  };
}

describe("model dependency sorter", () => {
  test("orders belongsTo models before dependents", () => {
    const ordered = sortModelsByDependencies([
      makeModel("Post", "posts", {
        id: column("increments"),
        author: relation("belongsTo", "User", { foreignKey: "user_id" }),
      }),
      makeModel("User", "users", {
        id: column("increments"),
      }),
    ]);

    expect(ordered.map((item) => item.modelClassName)).toEqual(["User", "Post"]);
  });

  test("orders static database foreign key dependencies before dependents", () => {
    const ordered = sortModelsByDependencies([
      makeModel(
        "AccountAppeal",
        "account_appeals",
        {
          id: column("uuid"),
          restriction_id: column("uuid"),
        },
        {
          foreignKeys: [
            {
              column: "restriction_id",
              references: { table: "account_restrictions", column: "id" },
            },
          ],
        }
      ),
      makeModel("AccountRestriction", "account_restrictions", {
        id: column("uuid"),
      }),
    ]);

    expect(ordered.map((item) => item.modelClassName)).toEqual([
      "AccountRestriction",
      "AccountAppeal",
    ]);
  });

  test("stops on cyclic or self dependencies without duplicating models", () => {
    const ordered = sortModelsByDependencies([
      makeModel("User", "users", {
        id: column("increments"),
        post: relation("belongsTo", "Post"),
      }),
      makeModel(
        "Post",
        "posts",
        {
          id: column("increments"),
          author: relation("belongsTo", "User"),
          post_id: column("uuid"),
        },
        {
          foreignKeys: [
            {
              column: "post_id",
              references: { table: "posts", column: "id" },
            },
          ],
        }
      ),
    ]);

    expect(ordered).toHaveLength(2);
    expect(new Set(ordered.map((item) => item.modelClassName))).toEqual(
      new Set(["User", "Post"])
    );
  });
});
