import fs from "fs";
import path from "path";
import {
  buildValidationRules,
  fireModelEvent,
  shouldSkipModelHooks,
  validateModelData,
} from "../core/model/CoreModelValidationEvents";
import { column, relation, validate, type SchemaField } from "../core/schema/SchemaBlueprint";

describe("ORM hardening phase 1 CoreModel validation and events extraction", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/ORM-Hardening-Phase1-CoreModel-Validation-And-Events-Extraction-Plan.md"
  );

  test("sub-plan exists and freezes the validation/event extraction scope", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# ORM Hardening Phase 1 CoreModel Validation and Events Extraction Plan",
      "Status: COMPLETED",
      "`ELOQUENT_DISABLE_MODEL_HOOKS` evaluation",
      "validation-rule assembly from schema",
      "validation execution with hooks and custom rules",
      "lifecycle-event execution and cancellation handling",
      "`CoreModel` delegates validation/event orchestration to a dedicated module.",
      "Existing CRUD, validation, and Mongo validation tests still pass.",
      "`npm run typecheck` stays green.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("helper keeps hook-disable semantics and partial validation rule assembly", () => {
    const schema = {
      name: validate(column("string"), { required: true, min: 3 }),
      email: validate(column("string"), { required: true, email: true }),
      owner: relation("belongsTo", "User", { foreignKey: "user_id" }),
    } satisfies Record<string, SchemaField>;

    expect(shouldSkipModelHooks("true")).toBe(true);
    expect(shouldSkipModelHooks("1")).toBe(true);
    expect(shouldSkipModelHooks("false")).toBe(false);
    expect(shouldSkipModelHooks(undefined)).toBe(false);

    expect(
      Object.keys(buildValidationRules({ schema, data: { name: "Alice" }, partial: false }))
    ).toEqual(["name", "email"]);
    expect(
      Object.keys(buildValidationRules({ schema, data: { name: "Alice" }, partial: true }))
    ).toEqual(["name"]);
  });

  test("helper validates data with hooks/custom rules and preserves error shape", async () => {
    const beforeValidate = jest.fn();
    const afterValidate = jest.fn();
    const schema = {
      name: validate(column("string"), { required: true, min: 3 }),
      email: validate(column("string"), { required: true, email: true }),
    } satisfies Record<string, SchemaField>;

    await expect(
      validateModelData({
        tableName: "users",
        schema,
        hooks: { beforeValidate, afterValidate },
        customRules: {},
        data: { name: "Al", email: "bad-email" },
        partial: false,
        skipModelHooks: false,
      })
    ).rejects.toThrow("Validation failed for users:");

    expect(beforeValidate).toHaveBeenCalledTimes(1);
    expect(afterValidate).toHaveBeenCalledTimes(1);

    beforeValidate.mockClear();
    afterValidate.mockClear();

    await expect(
      validateModelData({
        tableName: "users",
        schema,
        hooks: { beforeValidate, afterValidate },
        customRules: {},
        data: { name: "Alice", email: "alice@example.com" },
        partial: false,
        skipModelHooks: true,
      })
    ).resolves.toBeUndefined();

    expect(beforeValidate).not.toHaveBeenCalled();
    expect(afterValidate).not.toHaveBeenCalled();
  });

  test("helper fires lifecycle events and honors explicit cancellation", async () => {
    const handler = jest.fn(async (payload: unknown) => payload);
    const cancel = jest.fn(async () => false);

    await expect(
      fireModelEvent({
        skipModelHooks: false,
        handler,
        payload: { name: "Alice" },
      })
    ).resolves.toBe(true);
    expect(handler).toHaveBeenCalledWith({ name: "Alice" });

    await expect(
      fireModelEvent({
        skipModelHooks: false,
        handler: cancel,
        payload: 7,
      })
    ).resolves.toBe(false);

    await expect(
      fireModelEvent({
        skipModelHooks: true,
        handler,
        payload: { ignored: true },
      })
    ).resolves.toBe(true);

    await expect(
      fireModelEvent({
        skipModelHooks: false,
        payload: { noHandler: true },
      })
    ).resolves.toBe(true);
  });
});
