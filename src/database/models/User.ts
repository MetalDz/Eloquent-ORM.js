import { BaseModel } from "../../core/model/BaseModel";
import { Post } from "./Post";

export class User extends BaseModel {
  constructor() {
    super("users");
  }
  posts() {
    return this.hasMany(Post, "user_id");
  }
}
