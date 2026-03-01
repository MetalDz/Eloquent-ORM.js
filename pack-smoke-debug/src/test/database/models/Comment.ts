/**
 * Auto-generated Test Model
 * Model: Comment
 * Table: comments
 */

import { SqlModel, ModelInstance } from "../../../core/model/BaseModel";
import { column, validate } from "../../../core/schema/SchemaBlueprint";

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

  constructor() {
    super("comments", process.env.DB_CONNECTION ?? "mysql");
  }
}

export interface Comment extends ModelInstance<CommentAttrs> {}
