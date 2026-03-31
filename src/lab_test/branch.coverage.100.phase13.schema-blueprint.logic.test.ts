import {
  column,
  mixin,
  relation,
  validate,
  validateSchema,
  type SchemaField,
} from "../core/schema/SchemaBlueprint.js";

describe("Branch coverage 100% - phase 13 SchemaBlueprint branches", () => {
  test("builder helpers produce expected shapes and validate mutates column definition", () => {
    const withLength = column("string", 120, { notNull: true, unique: true });
    const withoutLength = column("int", undefined, { default: 1 });
    const validated = validate(column("string", 50), { required: true, min: 2, max: 10 });

    expect(withLength).toEqual({
      kind: "column",
      type: "string",
      options: { length: 120, notNull: true, unique: true },
    });
    expect(withoutLength).toEqual({
      kind: "column",
      type: "int",
      options: { default: 1 },
    });
    expect(validated.validate).toEqual({ required: true, min: 2, max: 10 });

    expect(relation("hasMany", "Post", { foreignKey: "user_id" })).toEqual({
      kind: "relation",
      relation: "hasMany",
      model: "Post",
      options: { foreignKey: "user_id" },
    });
    expect(mixin("SoftDeletes")).toEqual({ kind: "mixin", name: "SoftDeletes" });
  });

  test("validateSchema reports invalid column range and relation/mixin validation errors", () => {
    const schema = {
      age: validate(column("int"), { min: 10, max: 5 }),
      owner: {
        kind: "relation",
        relation: "belongsTo",
        model: "",
        options: {},
      } as any,
      commentable: {
        kind: "relation",
        relation: "morphTo",
        model: "Commentable",
        options: {},
      } as any,
      brokenMixin: {
        kind: "mixin",
        name: "",
      } as any,
    } satisfies Record<string, SchemaField>;

    const errors = validateSchema(schema);
    expect(errors).toContain("Column 'age' has invalid range: min > max.");
    expect(errors).toContain("Relation 'owner' must reference a model name.");
    expect(errors).toContain("Relation 'owner' (belongsTo) requires a foreignKey.");
    expect(errors).toContain("Morph relation 'commentable' should define a morphName.");
    expect(errors).toContain("Mixin 'brokenMixin' is missing a valid name.");
  });

  test("validateSchema accepts valid column/relation/mixin combinations", () => {
    const schema = {
      price: validate(column("decimal"), { min: 1, max: 100 }),
      author: relation("belongsTo", "User", { foreignKey: "user_id" }),
      imageable: relation("morphOne", "Image", { morphName: "imageable" }),
      searchable: mixin("QueryCache"),
    } satisfies Record<string, SchemaField>;

    expect(validateSchema(schema)).toEqual([]);
  });
});

