// src/models/Profile.ts
import { BaseModel } from "../orm/Model";

export class Profile extends BaseModel {
  constructor() {
    super();
    this.tableName = "profiles";
  }
}
