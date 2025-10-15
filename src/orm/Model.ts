// src/core/model/BaseModel.ts  (or wherever your base Model lives)
import { HasOne } from "../orm/relations/HasOne"; // path depends on your structure

export abstract class BaseModel {
  // existing fields...
  public tableName: string = ""; // ensure models set this (or `table`)

  // existing methods (all, find, create, etc.) remain

  /**
   * hasOne helper — returns a HasOne instance that can fetch the related row.
   * Example: user.hasOne(Profile, 'user_id', 'id').get(userInstance)
   */
  hasOne(relatedCtor: new () => any, foreignKey?: string, localKey: string = "id") {
    return new HasOne(relatedCtor, foreignKey, localKey);
  }
}
