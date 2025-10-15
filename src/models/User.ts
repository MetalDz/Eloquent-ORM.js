// src/models/User.ts
import { BaseModel } from "../orm/Model";

export class User extends BaseModel {
  constructor() {
    super();
    this.tableName = "users"; // important: actual DB table
  }

  // helper method: returns relation object (not the related data yet)
  profileRelation() {
    // Profile will be loaded through hasOne
    const { Profile } = require("./Profile");
    return this.hasOne(Profile, "user_id", "id");
  }
}
