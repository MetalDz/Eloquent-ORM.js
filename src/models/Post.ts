import { BaseModel } from "../core/model/BaseModel";
import { BelongsTo } from "../core/orm/relations/BelongsTo";
import { User } from "./User";

export class Post extends BaseModel {
  constructor() {
    super("posts", "mysql");
  }

  user() {
    return new BelongsTo(User, "user_id", "id");
  }
}
