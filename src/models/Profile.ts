import { BaseModel } from "../core/model/BaseModel";

export class Profile extends BaseModel {
  static tableName = "profiles";
  static connectionName = "mysql";
}
