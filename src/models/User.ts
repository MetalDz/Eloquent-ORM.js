import { BaseModel } from "../core/model/CoreModel";
import { HasMany } from "../core/orm/relations/HasMany";
import { Post } from "./Post";

export class User extends BaseModel {
  tableName = "users";

  posts() {
    // No need to specify the relation name — it's auto-detected!
    return new HasMany(Post, "user_id", "id");
  }
}
