export class ImportResolver {
  /**
   * Resolves correct relative import path for generated files
   * depending on whether it's in app/ or test/ mode.
   */
  static coreImportPath(isTest: boolean): string {
    return isTest ? "../../../core/model/BaseModel" : "../../core/model/BaseModel";
  }

  static schemaImportPath(isTest: boolean): string {
    return isTest ? "../../../core/schema/SchemaBlueprint" : "../../core/schema/SchemaBlueprint";
  }
}
