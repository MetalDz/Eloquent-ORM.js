/**
 * 🧩 SchemaBlueprint
 * Defines model schema, validation, relations, and mixins.
 * Supports advanced relation metadata for automatic migration generation.
 */

/* --------------------------------- Column Types --------------------------------- */
export type ColumnType =
  | "increments"
  | "bigint"
  | "uuid"
  | "int"
  | "string"
  | "text"
  | "boolean"
  | "decimal"
  | "float"
  | "json"
  | "timestamp"
  | "timestamps"
  | "softDeletes";

/* --------------------------------- Options --------------------------------- */
export interface ColumnOptions {
  length?: number;
  notNull?: boolean;
  unique?: boolean;
  unsigned?: boolean;
  default?: string | number | boolean | null;
  useTz?: boolean;
  defaultNow?: boolean;
  primary?: boolean;
  index?: boolean;
  comment?: string;
}

/* --------------------------------- Validation --------------------------------- */
export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  numeric?: boolean;
  in?: Array<string | number>;
}

/* --------------------------------- Relations --------------------------------- */
export type RelationType =
  | "hasOne"
  | "hasMany"
  | "belongsTo"
  | "belongsToMany"
  | "morphOne"
  | "morphMany"
  | "morphTo";

export interface RelationOptions {
  localKey?: string;
  foreignKey?: string;

  // Pivot configuration
  pivotTable?: string;
  pivotLocalKey?: string;
  pivotForeignKey?: string;

  // Morph configuration
  morphName?: string;
  typeColumn?: string;
  idColumn?: string;

  // Cascade and constraints
  cascade?: boolean;
}

export type RelationalAction = "CASCADE" | "RESTRICT" | "SET NULL" | "NO ACTION" | "SET DEFAULT";

export interface DatabaseForeignKeyDefinition {
  name?: string;
  column: string;
  references: {
    table: string;
    column?: string;
  };
  onDelete?: RelationalAction;
  onUpdate?: RelationalAction;
}

export interface DatabaseIndexDefinition {
  name?: string;
  columns: string[];
  unique?: boolean;
  where?: string;
}

export interface ModelDatabaseDefinition {
  foreignKeys?: DatabaseForeignKeyDefinition[];
  indexes?: DatabaseIndexDefinition[];
}

/* --------------------------------- Mixins --------------------------------- */
export type MixinName =
  | "SoftDeletes"
  | "Casts"
  | "EagerLoading"
  | "Hooks"
  | "Scope"
  | "QueryCache"
  | "Serialize"
  | "PivotHelper";

export interface MixinDefinition {
  kind: "mixin";
  name: MixinName;
}

/* --------------------------------- Definitions --------------------------------- */
export interface ColumnDefinition {
  kind: "column";
  type: ColumnType;
  options: ColumnOptions;
  validate?: ValidationRule;
}

export interface RelationDefinition {
  kind: "relation";
  relation: RelationType;
  model: string;
  options: RelationOptions;
}

export type SchemaField =
  | ColumnDefinition
  | RelationDefinition
  | MixinDefinition;

/* --------------------------------- Builders --------------------------------- */
export function column(
  type: ColumnType,
  length?: number,
  options?: Partial<ColumnOptions>
): ColumnDefinition {
  const finalOptions: ColumnOptions = {
    ...(length ? { length } : {}),
    ...(options || {}),
  };
  return { kind: "column", type, options: finalOptions };
}

export function validate(
  columnDef: ColumnDefinition,
  rules: ValidationRule
): ColumnDefinition {
  columnDef.validate = rules;
  return columnDef;
}

export function relation(
  rel: RelationType,
  model: string,
  options: RelationOptions = {}
): RelationDefinition {
  return { kind: "relation", relation: rel, model, options };
}

export function mixin(name: MixinName): MixinDefinition {
  return { kind: "mixin", name };
}

/* --------------------------------- Validators --------------------------------- */
export function validateSchema(
  schema: Record<string, SchemaField>
): string[] {
  const errors: string[] = [];

  for (const [key, field] of Object.entries(schema)) {
    if (field.kind === "column" && field.validate) {
      const rules = field.validate;
      if (rules.min && rules.max && rules.min > rules.max) {
        errors.push(`Column '${key}' has invalid range: min > max.`);
      }
    }

    if (field.kind === "relation") {
      if (!field.model) {
        errors.push(`Relation '${key}' must reference a model name.`);
      }

      if (field.relation === "belongsTo" && !field.options.foreignKey) {
        errors.push(`Relation '${key}' (belongsTo) requires a foreignKey.`);
      }

      if (
        field.relation === "morphOne" ||
        field.relation === "morphMany" ||
        field.relation === "morphTo"
      ) {
        if (!field.options.morphName) {
          errors.push(`Morph relation '${key}' should define a morphName.`);
        }
      }
    }

    if (field.kind === "mixin" && !field.name) {
      errors.push(`Mixin '${key}' is missing a valid name.`);
    }
  }

  return errors;
}
