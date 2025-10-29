/**
 * 🧩 SchemaBlueprint
 * Defines model schema, validation, relations, and mixins.
 * Designed for functional and future decorator-based usage.
 */

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
  primary?: boolean;
  index?: boolean;
  comment?: string;
}

/** Validation rules applied at runtime or migration-time */
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
  pivotTable?: string;
  pivotLocalKey?: string;
  pivotForeignKey?: string;
  typeColumn?: string;
  idColumn?: string;
  cascade?: boolean;
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

/**
 * Creates a column definition
 */
export function column(
  type: ColumnType,
  length?: number,
  options?: Partial<ColumnOptions>
): ColumnDefinition {
  const finalOptions: ColumnOptions = { ...(length ? { length } : {}), ...(options || {}) };
  return { kind: "column", type, options: finalOptions };
}

/**
 * Adds validation to a column
 */
export function validate(
  columnDef: ColumnDefinition,
  rules: ValidationRule
): ColumnDefinition {
  columnDef.validate = rules;
  return columnDef;
}

/**
 * Creates a relation definition
 */
export function relation(
  rel: RelationType,
  model: string,
  options: RelationOptions = {}
): RelationDefinition {
  return { kind: "relation", relation: rel, model, options };
}

/**
 * Creates a mixin definition
 */
export function mixin(name: MixinName): MixinDefinition {
  return { kind: "mixin", name };
}

/* --------------------------------- Validators --------------------------------- */

/**
 * Validate schema integrity before build
 */
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

    if (field.kind === "relation" && !field.model) {
      errors.push(`Relation '${key}' must reference a model name.`);
    }

    if (field.kind === "mixin" && !field.name) {
      errors.push(`Mixin '${key}' is missing a valid name.`);
    }
  }

  return errors;
}
