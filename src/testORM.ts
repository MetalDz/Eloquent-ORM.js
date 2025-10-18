import { BaseModel } from "./core/model/BaseModel";
import { HasOne } from "./core/orm/relations/HasOne";
import { Profile } from "./models/Profile";

export class User extends BaseModel {
  static tableName = "users";
  static connectionName = "mysql"; // or 'pg' or 'sqlite'

  profile() {
    return new HasOne(Profile, "user_id", "id");
  }
}
