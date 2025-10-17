import { BaseModel } from "../core/connection/BaseModel";

export class Profile extends BaseModel {
  static tableName = "profiles";
  static connectionName = "mysql";
}
