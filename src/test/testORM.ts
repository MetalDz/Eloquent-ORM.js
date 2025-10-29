import { CoreModel } from "../core/model/CoreModel";
import { HasOne } from "../core/orm/relations/HasOne";


export class User extends CoreModel {
  static tableName = "users";
  static connectionName = "mysql"; // or 'pg' or 'sqlite'

 
}
