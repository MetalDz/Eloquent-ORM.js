import { BaseModel } from "../core/connection/BaseModel";
import { HasMany } from "../core/orm/relations/HasMany";
import { Post } from "./Post";

export class User extends BaseModel {
  constructor() {
    super("users", "mysql");
  }

  posts() {
    return new HasMany(Post, "user_id", "id");
  }
}
