import { SchemaValidator, SchemaValidatorOptions } from "../schema/SchemaValidator";
import type { SchemaField, ValidationRule } from "../schema/SchemaBlueprint";

export type CoreModelEventHandler = (payload: unknown) => Promise<unknown> | unknown;

export function shouldSkipModelHooks(envValue?: string): boolean {
  return envValue === "1" || envValue === "true";
}

export function buildValidationRules(options: {
  schema: Record<string, SchemaField>;
  data: Record<string, unknown>;
  partial: boolean;
}): Record<string, ValidationRule> {
  const { schema, data, partial } = options;
  const validationRules: Record<string, ValidationRule> = {};

  for (const [key, field] of Object.entries(schema)) {
    if (field.kind === "column" && field.validate) {
      if (partial && !Object.prototype.hasOwnProperty.call(data, key)) {
        continue;
      }
      validationRules[key] = field.validate;
    }
  }

  return validationRules;
}

export async function validateModelData(options: {
  tableName: string;
  schema?: Record<string, SchemaField>;
  hooks?: SchemaValidatorOptions["hooks"];
  customRules?: SchemaValidatorOptions["customRules"];
  data: Record<string, unknown>;
  partial: boolean;
  skipModelHooks: boolean;
}): Promise<void> {
  const { tableName, schema, hooks, customRules, data, partial, skipModelHooks } = options;

  if (!schema) return;

  const validationRules = buildValidationRules({ schema, data, partial });
  const errors = await SchemaValidator.validateData(data, validationRules, {
    hooks: skipModelHooks ? undefined : hooks,
    customRules,
  });

  if (errors.length > 0) {
    const formatted = errors.map((error) => `- ${error.field} ${error.message}`).join("\n");
    throw new Error(`Validation failed for ${tableName}:\n${formatted}`);
  }
}

export async function fireModelEvent(options: {
  skipModelHooks: boolean;
  handler?: CoreModelEventHandler;
  payload?: unknown;
}): Promise<boolean> {
  const { skipModelHooks, handler, payload } = options;
  if (skipModelHooks || !handler) return true;

  const result = await handler(payload);
  return result !== false;
}
