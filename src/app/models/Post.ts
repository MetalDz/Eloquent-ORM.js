/**
 * Auto-generated EloquentJS ORM Model
 * Model: Post
 * Table: posts
 * Mode: DEVELOPMENT
 */

import { SqlModel, ModelInstance } from "../../core/model/BaseModel";
import { column, validate } from "../../core/schema/SchemaBlueprint";

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

  static validationHooks = {
    beforeValidate: async (data: Record<string, unknown>) => {
      console.log(`[beforeValidate] Post`, data);
    },
    afterValidate: async (data: Record<string, unknown>) => {
      console.log(`[afterValidate] Post`, data);
    },
  };

  static customRules = {
    isUnique: async (_value: unknown) => {
      return true;
    },
  };

  static modelEvents = {
    beforeCreate: async (data: Record<string, unknown>) => {
      console.log(`[beforeCreate] Post`, data);
    },
    afterCreate: async (record: Record<string, unknown>) => {
      console.log(`[afterCreate] Post created:`, record);
    },
    beforeUpdate: async (data: Record<string, unknown>) => {
      console.log(`[beforeUpdate] Post`, data);
    },
    afterUpdate: async (data: Record<string, unknown>) => {
      console.log(`[afterUpdate] Post updated:`, data);
    },
    beforeDelete: async (id: number | string) => {
      console.log(`[beforeDelete] Post`, id);
    },
    afterDelete: async (id: number | string) => {
      console.log(`[afterDelete] Post`, id);
    },
  };

  constructor() {
    super("posts", process.env.DB_CONNECTION ?? "mysql");
  }
}

export interface Post extends ModelInstance<PostAttrs> {}
