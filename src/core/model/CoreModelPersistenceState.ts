import type { SchemaField } from "../schema/SchemaBlueprint.js";

export type PersistenceUsage = "fill" | "patch";

export function buildMongoPrimaryFilter(
  pk: string,
  id: number | string
): Record<string, unknown> {
  if (pk === "_id") {
    return { _id: id };
  }
  if (pk === "id") {
    return { $or: [{ id }, { _id: id }] };
  }
  return { [pk]: id };
}

export function getPersistenceSchema(
  modelName: string,
  schema?: Record<string, SchemaField>
): Record<string, SchemaField> {
  if (!schema) {
    throw new Error(`${modelName} must define a schema to use fill(), save(), or patch().`);
  }
  return schema;
}

export function getColumnFieldNames(schema: Record<string, SchemaField>): string[] {
  return Object.entries(schema)
    .filter(([, field]) => field.kind === "column")
    .map(([fieldName]) => fieldName);
}

export function resolvePrimaryKey(schema?: Record<string, SchemaField>): string {
  if (schema) {
    for (const [fieldName, field] of Object.entries(schema)) {
      if (field.kind === "column" && field.options.primary) {
        return fieldName;
      }
    }
    if (schema._id?.kind === "column") return "_id";
    if (schema.id?.kind === "column") return "id";
  }

  return "id";
}

export function getPrimaryKeyValue(record: Record<string, unknown>, pk: string): unknown {
  if (pk === "_id") {
    return record._id ?? record.id;
  }
  if (pk === "id") {
    return record.id ?? record._id;
  }
  return record[pk];
}

export function getOriginalPrimaryKeyValue(
  originalAttributes: Record<string, unknown>,
  pk: string
): unknown {
  if (Object.prototype.hasOwnProperty.call(originalAttributes, pk)) {
    return originalAttributes[pk];
  }
  if (pk === "_id" && Object.prototype.hasOwnProperty.call(originalAttributes, "id")) {
    return originalAttributes.id;
  }
  if (pk === "id" && Object.prototype.hasOwnProperty.call(originalAttributes, "_id")) {
    return originalAttributes._id;
  }
  return undefined;
}

export function createPersistedSnapshot(options: {
  source: Record<string, unknown>;
  schema?: Record<string, SchemaField>;
  primaryKey: string;
}): Record<string, unknown> {
  const { source, schema, primaryKey } = options;

  if (!schema) {
    return Object.fromEntries(
      Object.entries(source).filter(([field]) => !field.startsWith("_"))
    );
  }

  const snapshot: Record<string, unknown> = {};
  for (const [fieldName, field] of Object.entries(schema)) {
    if (field.kind !== "column") continue;
    if (Object.prototype.hasOwnProperty.call(source, fieldName)) {
      snapshot[fieldName] = source[fieldName];
    }
  }

  if (!Object.prototype.hasOwnProperty.call(snapshot, primaryKey)) {
    if (primaryKey === "_id" && source.id !== undefined) {
      snapshot._id = source.id;
    } else if (primaryKey === "id" && source._id !== undefined) {
      snapshot.id = source._id;
    }
  }

  return snapshot;
}

function assertAssignableField(options: {
  field: string;
  usage: PersistenceUsage;
  schema: Record<string, SchemaField>;
  modelName: string;
}): void {
  const { field, usage, schema, modelName } = options;
  const definition = schema[field];

  if (!definition || definition.kind !== "column") {
    throw new Error(`Unknown ${usage} field '${field}' on ${modelName}.`);
  }
}

export function sanitizeAssignableData(options: {
  data: Record<string, unknown>;
  usage: PersistenceUsage;
  schema: Record<string, SchemaField>;
  modelName: string;
}): Record<string, unknown> {
  const { data, usage, schema, modelName } = options;

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`${usage}() expects a plain object payload.`);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(data)) {
    assertAssignableField({ field, usage, schema, modelName });
    sanitized[field] = value;
  }

  return sanitized;
}

export function extractPersistableAttributes(options: {
  record: Record<string, unknown>;
  columnFieldNames: string[];
}): Record<string, unknown> {
  const { record, columnFieldNames } = options;
  const attributes: Record<string, unknown> = {};

  for (const fieldName of columnFieldNames) {
    if (Object.prototype.hasOwnProperty.call(record, fieldName)) {
      attributes[fieldName] = record[fieldName];
    }
  }

  return attributes;
}

export function assertPrimaryKeyNotMutated(options: {
  exists: boolean;
  primaryKey: string;
  currentPrimaryKey: unknown;
  originalPrimaryKey: unknown;
  modelName: string;
}): void {
  const { exists, primaryKey, currentPrimaryKey, originalPrimaryKey, modelName } = options;
  if (!exists) return;

  if (!Object.is(currentPrimaryKey, originalPrimaryKey)) {
    throw new Error(`Cannot change persisted primary key '${primaryKey}' on ${modelName}.`);
  }
}

export function getDirtyAttributes(options: {
  currentAttributes: Record<string, unknown>;
  originalAttributes: Record<string, unknown>;
  primaryKey: string;
}): Record<string, unknown> {
  const { currentAttributes, originalAttributes, primaryKey } = options;
  const dirtyAttributes: Record<string, unknown> = {};

  for (const [field, value] of Object.entries(currentAttributes)) {
    if (field === primaryKey) continue;
    if (!Object.is(originalAttributes[field], value)) {
      dirtyAttributes[field] = value;
    }
  }

  return dirtyAttributes;
}
