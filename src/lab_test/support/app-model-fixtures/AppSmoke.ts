import { SqlModel, ModelInstance } from "../../../core/model/BaseModel";
import { column, validate } from "../../../core/schema/SchemaBlueprint";

type AppSmokeAttrs = {
  id?: number;
  name?: string;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
};

export class AppSmoke extends SqlModel<AppSmokeAttrs> {
  static tableName = "appsmokes";
  static connectionName = process.env.DB_CONNECTION ?? "mysql";
  static morphAlias = "appsmokes";

  static schema = {
    id: column("increments", undefined, { primary: true }),
    name: validate(column("string", 255), { required: true, min: 3 }),
    created_at: column("timestamp"),
    updated_at: column("timestamp"),
  };

  /*
   * SAFE FINDER EXAMPLES
   *   const recent = await AppSmoke.where("name", "Smoke")
   *     .orderBy("created_at", "desc")
   *     .limit(5)
   *     .get();
   *
   *   const active = await AppSmoke.active().first();
   *   const inactive = await AppSmoke.inactive().get();
   *   const published = await AppSmoke.published().limit(10).get();
   *
   * To enable those scopes on this model, add either:
   *   - `status` / `active` / `published` columns to `static schema`
   *   - or `static scopeActive(query)`
   *   - or `static scopeInactive(query)`
   *   - or `static scopePublished(query)`
   */

  constructor() {
    super("appsmokes", process.env.DB_CONNECTION ?? "mysql");
  }
}

export interface AppSmoke extends ModelInstance<AppSmokeAttrs> {}
