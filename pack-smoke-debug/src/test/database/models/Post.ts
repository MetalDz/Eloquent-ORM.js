/**
 * Auto-generated Test Model
 * Model: Post
 * Table: posts
 */

import { SqlModel, ModelInstance } from "../../../core/model/BaseModel";
import { column, validate } from "../../../core/schema/SchemaBlueprint";

type PostAttrs = {
  id?: number | null;
  name?: string | null;
  user_id?: number | null;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
};

export class Post extends SqlModel<PostAttrs> {
  static tableName = "posts";
  static connectionName = process.env.DB_CONNECTION ?? "mysql";
  static morphAlias = "posts";

  static schema = {
    id: column("increments", undefined, { primary: true }),
    name: validate(column("string", 255), { required: true, min: 3 }),
    user_id: column("int", undefined, { notNull: true }),
    created_at: column("timestamp"),
    updated_at: column("timestamp"),
    
    author: {
      kind: "relation",
      relation: "belongsTo",
      model: "User",
      options: { foreignKey: "user_id" },
    },
    favoritedBy: {
      kind: "relation",
      relation: "belongsToMany",
      model: "User",
      options: {},
    },
    comments: {
      kind: "relation",
      relation: "morphMany",
      model: "Comment",
      options: { morphName: "commentable" },
    },
  };

  constructor() {
    super("posts", process.env.DB_CONNECTION ?? "mysql");
  }
}

export interface Post extends ModelInstance<PostAttrs> {}
