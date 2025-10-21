import { BaseModel } from "../core/model/CoreModel";

export class Profile extends BaseModel {
  static tableName = "profiles";
  static connectionName = "mysql";
}
