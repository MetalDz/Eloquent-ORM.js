import {
  SchemaField,
  ColumnDefinition,
  RelationDefinition,
  MixinDefinition,
  validateSchema,
} from "./SchemaBlueprint";

/**
 * 🧱 SchemaBuilder
 * Converts model blueprints to SQL and validates them.
 */
export class SchemaBuilder {
  static toCreateSQL(
    tableName: string,
    schema: Record<string, SchemaField>
  ): string {
    // Validate schema before generation
    const errors = validateSchema(schema);
    if (errors.length > 0) {
      const message = errors.join("\n");
      throw new Error(`❌ Schema validation failed for ${tableName}:\n${message}`);
    }

    const columns: string[] = [];

    for (const [name, field] of Object.entries(schema)) {
      switch (field.kind) {
        case "column":
          columns.push(this.columnSQL(name, field));
          break;
        case "relation":
          {
            const rel = this.relationSQL(name, field);
            if (rel) columns.push(rel);
          }
          break;
        case "mixin":
          columns.push(...this.mixinSQL(field));
          break;
      }
    }

    return `CREATE TABLE IF NOT EXISTS \`${tableName}\` (${columns.join(", ")});`;
  }

  /* ---------------- COLUMN ---------------- */
  private static columnSQL(name: string, c: ColumnDefinition): string {
    const { type, options } = c;
    const parts: string[] = [];

    switch (type) {
      case "increments":
        parts.push(`\`${name}\` INT AUTO_INCREMENT`);
        break;
      case "uuid":
        parts.push(`\`${name}\` CHAR(36)`);
        break;
      case "string":
        parts.push(`\`${name}\` VARCHAR(${options.length ?? 255})`);
        break;
      case "int":
        parts.push(`\`${name}\` INT`);
        break;
      case "boolean":
        parts.push(`\`${name}\` BOOLEAN`);
        break;
      case "text":
        parts.push(`\`${name}\` TEXT`);
        break;
      case "decimal":
        parts.push(`\`${name}\` DECIMAL(10,2)`);
        break;
      case "json":
        parts.push(`\`${name}\` JSON`);
        break;
      case "timestamp":
        parts.push(`\`${name}\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
        break;
      case "softDeletes":
        return "`deleted_at` TIMESTAMP NULL DEFAULT NULL";
      case "timestamps":
        return "`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP";
      default:
        parts.push(`\`${name}\` TEXT`);
    }

    if (options.notNull) parts.push("NOT NULL");
    if (options.unique) parts.push("UNIQUE");
    if (options.primary) parts.push("PRIMARY KEY");
    if (options.default !== undefined)
      parts.push(
        `DEFAULT ${
          typeof options.default === "string"
            ? `'${options.default}'`
            : options.default
        }`
      );

    return parts.join(" ");
  }

  /* ---------------- RELATIONS ---------------- */
  private static relationSQL(_name: string, r: RelationDefinition): string | null {
    if (r.relation === "belongsTo" && r.options.foreignKey && r.model) {
      return `FOREIGN KEY (\`${r.options.foreignKey}\`) REFERENCES \`${r.model.toLowerCase()}s\`(\`${r.options.localKey ?? "id"}\`)`;
    }
    return null;
  }

  /* ---------------- MIXINS ---------------- */
  private static mixinSQL(m: MixinDefinition): string[] {
    switch (m.name) {
      case "SoftDeletes":
        return ["`deleted_at` TIMESTAMP NULL DEFAULT NULL"];
      case "Casts":
      case "QueryCache":
      case "Hooks":
      case "Scope":
      case "Serialize":
      case "PivotHelper":
      case "EagerLoading":
        return [];
      default:
        return [];
    }
  }
}
