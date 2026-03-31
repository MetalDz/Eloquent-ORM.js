/**
 * 🧠 SchemaValidator
 * Runtime validation engine for models with hooks and custom rules.
 */

import type { ValidationRule } from "./SchemaBlueprint.js";

export interface ValidationError {
  field: string;
  message: string;
}

export type CustomRuleResult = string | null | boolean;
export type CustomRuleFunction = (
  value: unknown,
  field: string,
  data: Record<string, unknown>
) => CustomRuleResult | Promise<CustomRuleResult>;

export interface ValidationHooks {
  beforeValidate?: (data: Record<string, unknown>) => Promise<void> | void;
  afterValidate?: (data: Record<string, unknown>, errors: ValidationError[]) => Promise<void> | void;
}

export interface SchemaValidatorOptions {
  hooks?: ValidationHooks;
  customRules?: Record<string, CustomRuleFunction>;
}

export class SchemaValidator {
  static async validateData(
    data: Record<string, unknown>,
    rules: Record<string, ValidationRule>,
    options: SchemaValidatorOptions = {}
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // 🪝 Run beforeValidate hook
    if (options.hooks?.beforeValidate) {
      await options.hooks.beforeValidate(data);
    }

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];

      // Required
      if (rule.required && (value === undefined || value === null || value === "")) {
        errors.push({ field, message: "is required" });
        continue;
      }

      // Skip validation for missing optional fields
      if (value === undefined || value === null) continue;

      // Built-in checks
      if (rule.numeric && typeof value !== "number") {
        errors.push({ field, message: "must be numeric" });
      }

      if (rule.min !== undefined) {
        if (typeof value === "string" && value.length < rule.min)
          errors.push({ field, message: `must be at least ${rule.min} characters` });
        if (typeof value === "number" && value < rule.min)
          errors.push({ field, message: `must be >= ${rule.min}` });
      }

      if (rule.max !== undefined) {
        if (typeof value === "string" && value.length > rule.max)
          errors.push({ field, message: `must be less than ${rule.max} characters` });
        if (typeof value === "number" && value > rule.max)
          errors.push({ field, message: `must be <= ${rule.max}` });
      }

      if (rule.pattern && typeof value === "string" && !rule.pattern.test(value)) {
        errors.push({ field, message: "has invalid format" });
      }

      if (rule.email && typeof value === "string") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push({ field, message: "is not a valid email address" });
        }
      }

      if (rule.in && !rule.in.includes(value as never)) {
        errors.push({ field, message: `must be one of: ${rule.in.join(", ")}` });
      }

      // Custom rule functions (from model)
      if (options.customRules) {
        for (const [ruleName, fn] of Object.entries(options.customRules)) {
          const result = await fn(value, field, data);
          if (result === null || result === undefined || result === true) continue;
          if (result === false) {
            errors.push({ field, message: `${ruleName} failed` });
            continue;
          }
          errors.push({ field, message: String(result) });
        }
      }
    }

    // 🪝 Run afterValidate hook
    if (options.hooks?.afterValidate) {
      await options.hooks.afterValidate(data, errors);
    }

    return errors;
  }
}
