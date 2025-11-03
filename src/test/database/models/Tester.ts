/**
 * 🧩 Auto-generated EloquentJS ORM Model
 * Model: Tester
 * Table: testers
 * Mode: TEST
 * Generated at: 2025-11-03T11:30:04.355Z
 */

import { BaseModel } from "../../../core/model/BaseModel";
import { column, validate } from "../../../core/schema/SchemaBlueprint";

export class Tester extends BaseModel {
  /**
   * 🧩 Table configuration
   */
  static tableName = "testers";
  static connectionName = process.env.DB_CONNECTION ?? "mysql";

  /**
   * 🧠 Schema definition
   * Define columns and validation rules
   */

  static schema = {
    id: column("increments", undefined, { primary: true }),
    name: validate(column("string", 255), { required: true, min: 3 }),
    created_at: column("timestamp"),
    updated_at: column("timestamp"),
  };

  /**
   * 🧪 Validation lifecycle hooks
   * beforeValidate, afterValidate
   */
  static validationHooks = {
    beforeValidate: async (data: Record<string, unknown>) => {
      console.log("🧩 [beforeValidate] Tester", data);
    },
    afterValidate: async (data: Record<string, unknown>) => {
      console.log("✅ [afterValidate] Tester", data);
    },
  };

  /**
   * 🧠 Custom validation rules (global + async supported)
   * Add custom named validators reusable across models
   */
  static customRules = {
    isUnique: async (value: unknown) => {
      // Example: add DB check logic here
      return true;
    },
  };

  /**
   * 🪝 Model lifecycle events
   * beforeCreate, afterCreate, beforeUpdate, afterUpdate, beforeDelete, afterDelete
   */
  static modelEvents = {
    beforeCreate: async (data: Record<string, unknown>) => {
      console.log("🚀 [beforeCreate] Tester", data);
      // You can modify the data before insertion
    },
    afterCreate: async (record: Record<string, unknown>) => {
      console.log("✅ [afterCreate] Tester created:", record);
    },
    beforeUpdate: async (data: Record<string, unknown>) => {
      console.log("🔄 [beforeUpdate] Tester", data);
    },
    afterUpdate: async (data: Record<string, unknown>) => {
      console.log("💾 [afterUpdate] Tester updated:", data);
    },
    beforeDelete: async (id: number | string) => {
      console.log("🗑️ [beforeDelete] Tester", id);
    },
    afterDelete: async (id: number | string) => {
      console.log("✅ [afterDelete] Tester", id);
    },
  };

  constructor() {
    super("testers", process.env.DB_CONNECTION ?? "mysql");
  }
}
