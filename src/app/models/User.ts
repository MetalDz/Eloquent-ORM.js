/**
 * Auto-generated EloquentJS ORM Model
 * Model: User
 * Table: users
 * Mode: DEVELOPMENT
 */

import { SqlModel, ModelInstance } from "../../core/model/BaseModel";
import { column, validate } from "../../core/schema/SchemaBlueprint";

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

  static validationHooks = {
    beforeValidate: async (data: Record<string, unknown>) => {
      console.log(`[beforeValidate] User`, data);
    },
    afterValidate: async (data: Record<string, unknown>) => {
      console.log(`[afterValidate] User`, data);
    },
  };

  static customRules = {
    isUnique: async (_value: unknown) => {
      return true;
    },
  };

  static modelEvents = {
    beforeCreate: async (data: Record<string, unknown>) => {
      console.log(`[beforeCreate] User`, data);
    },
    afterCreate: async (record: Record<string, unknown>) => {
      console.log(`[afterCreate] User created:`, record);
    },
    beforeUpdate: async (data: Record<string, unknown>) => {
      console.log(`[beforeUpdate] User`, data);
    },
    afterUpdate: async (data: Record<string, unknown>) => {
      console.log(`[afterUpdate] User updated:`, data);
    },
    beforeDelete: async (id: number | string) => {
      console.log(`[beforeDelete] User`, id);
    },
    afterDelete: async (id: number | string) => {
      console.log(`[afterDelete] User`, id);
    },
  };

  constructor() {
    super("users", process.env.DB_CONNECTION ?? "mysql");
  }
}

export interface User extends ModelInstance<UserAttrs> {}
