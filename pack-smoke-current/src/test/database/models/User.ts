/**
 * Auto-generated Test Model
 * Model: User
 * Table: users
 */

import { SqlModel, ModelInstance } from "eloquentjs";
import { column, validate } from "eloquentjs";

type UserAttrs = {
  id?: number | null;
  name?: string | null;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
};

export class User extends SqlModel<UserAttrs> {
  static tableName = "users";
  static connectionName = process.env.DB_CONNECTION ?? "mysql";
  static morphAlias = "users";

  static schema = {
    id: column("increments", undefined, { primary: true }),
    name: validate(column("string", 255), { required: true, min: 3 }),
    created_at: column("timestamp"),
    updated_at: column("timestamp"),
    
    posts: {
      kind: "relation",
      relation: "hasMany",
      model: "Post",
      options: { foreignKey: "user_id" },
    },
    favorites: {
      kind: "relation",
      relation: "belongsToMany",
      model: "Post",
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
    super("users", process.env.DB_CONNECTION ?? "mysql");
  }
}

export interface User extends ModelInstance<UserAttrs> {}
