import { MongoModel, ModelInstance } from "../../../core/model/BaseModel.js";
import { column, validate } from "../../../core/schema/SchemaBlueprint.js";

type GeoLocalisationAttrs = {
  id?: number | string;
  name?: string;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
};

export class GeoLocalisation extends MongoModel<GeoLocalisationAttrs> {
  static tableName = "geolocalisations";
  static connectionName = "mongo";
  static morphAlias = "geolocalisations";

  static schema = {
    id: column("increments", undefined, { primary: true }),
    name: validate(column("string", 255), { required: true, min: 3 }),
    created_at: column("timestamp"),
    updated_at: column("timestamp"),
  };

  constructor() {
    super("geolocalisations", "mongo");
  }
}

export interface GeoLocalisation extends ModelInstance<GeoLocalisationAttrs> {}
