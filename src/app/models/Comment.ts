/**
 * Auto-generated EloquentJS ORM Model
 * Model: Comment
 * Table: comments
 * Mode: DEVELOPMENT
 */

import { SqlModel, ModelInstance } from "../../core/model/BaseModel";
import { column, validate } from "../../core/schema/SchemaBlueprint";

type CommentAttrs = {
  id?: number | null;
  name?: string | null;
  commentable_id?: number | null;
  commentable_type?: string | null;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
};

export class Comment extends SqlModel<CommentAttrs> {
  static tableName = "comments";
  static connectionName = process.env.DB_CONNECTION ?? "mysql";
  static morphAlias = "comments";

  static schema = {
    id: column("increments", undefined, { primary: true }),
    name: validate(column("string", 255), { required: true, min: 3 }),
    commentable_id: column("int", undefined, { notNull: true }),
    commentable_type: column("string", 255, { notNull: true }),
    created_at: column("timestamp"),
    updated_at: column("timestamp"),

    commentable: {
      kind: "relation",
      relation: "morphTo",
      model: "Commentable",
      options: { morphName: "commentable" },
    },
  };

  static validationHooks = {
    beforeValidate: async (data: Record<string, unknown>) => {
      console.log(`[beforeValidate] Comment`, data);
    },
    afterValidate: async (data: Record<string, unknown>) => {
      console.log(`[afterValidate] Comment`, data);
    },
  };

  static customRules = {
    isUnique: async (_value: unknown) => {
      return true;
    },
  };

  static modelEvents = {
    beforeCreate: async (data: Record<string, unknown>) => {
      console.log(`[beforeCreate] Comment`, data);
    },
    afterCreate: async (record: Record<string, unknown>) => {
      console.log(`[afterCreate] Comment created:`, record);
    },
    beforeUpdate: async (data: Record<string, unknown>) => {
      console.log(`[beforeUpdate] Comment`, data);
    },
    afterUpdate: async (data: Record<string, unknown>) => {
      console.log(`[afterUpdate] Comment updated:`, data);
    },
    beforeDelete: async (id: number | string) => {
      console.log(`[beforeDelete] Comment`, id);
    },
    afterDelete: async (id: number | string) => {
      console.log(`[afterDelete] Comment`, id);
    },
  };

  constructor() {
    super("comments", process.env.DB_CONNECTION ?? "mysql");
  }
}

export interface Comment extends ModelInstance<CommentAttrs> {}
