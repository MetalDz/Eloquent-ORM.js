import { BaseModel, MorphRegistry, SqlModel } from "../core/model/BaseModel";
import { getAdapter } from "../core/connection/ConnectionFactory";

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
}));

const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;

describe("Branch coverage 100% - phase 28 BaseModel default-arg relation helpers", () => {
  class RelatedModel extends BaseModel {
    constructor() {
      super("related_models", "mysql_test");
    }
  }

  class ParentModel extends BaseModel {
    constructor() {
      super("parent_models", "mysql_test");
    }

    public belongsToWithDefaultOwnerKey() {
      return this.belongsTo(RelatedModel as any, "related_id");
    }

    public hasOneWithDefaultLocalKey() {
      return this.hasOne(RelatedModel as any, "parent_id");
    }

    public hasManyWithDefaultLocalKey() {
      return this.hasMany(RelatedModel as any, "parent_id");
    }

    public belongsToManyWithPivot() {
      return this.belongsToMany(RelatedModel as any, "parent_related", "parent_id", "related_id");
    }

    public morphOneForComments() {
      return this.morphOne(RelatedModel as any, "commentable");
    }

    public morphManyForComments() {
      return this.morphMany(RelatedModel as any, "commentable");
    }

    public morphToCommentable() {
      return this.morphTo("commentable");
    }
  }

  beforeEach(() => {
    MorphRegistry.clear();
    jest.clearAllMocks();
  });

  test("relation helpers use default key = id when optional key is omitted", () => {
    const model = new ParentModel();

    const belongsTo = model.belongsToWithDefaultOwnerKey() as any;
    const hasOne = model.hasOneWithDefaultLocalKey() as any;
    const hasMany = model.hasManyWithDefaultLocalKey() as any;

    expect(belongsTo.localKey).toBe("id");
    expect(hasOne.localKey).toBe("id");
    expect(hasMany.localKey).toBe("id");
  });

  test("morph alias lookup covers static alias, registry alias, and fallback name", () => {
    class StaticAliasModel extends BaseModel {
      static morphAlias = "static_alias";

      constructor() {
        super("static_alias_models", "mysql_test");
      }
    }

    class RegistryAliasModel extends BaseModel {
      constructor() {
        super("registry_alias_models", "mysql_test");
      }
    }

    class FallbackAliasModel extends BaseModel {
      constructor() {
        super("fallback_alias_models", "mysql_test");
      }
    }

    MorphRegistry.register("registry_alias", RegistryAliasModel as any);

    expect(StaticAliasModel.getMorphClass()).toBe("static_alias");
    expect(RegistryAliasModel.getMorphClass()).toBe("registry_alias");
    expect(new RegistryAliasModel().getMorphClass()).toBe("registry_alias");
    expect(FallbackAliasModel.getMorphClass()).toBe("FallbackAliasModel");
    expect(new FallbackAliasModel().getMorphClass()).toBe("FallbackAliasModel");
  });

  test("extra relation helpers return expected relation wiring", () => {
    const model = new ParentModel();

    const belongsToMany = model.belongsToManyWithPivot() as any;
    const morphOne = model.morphOneForComments() as any;
    const morphMany = model.morphManyForComments() as any;
    const morphTo = model.morphToCommentable() as any;

    expect(belongsToMany.constructor.name).toBe("BelongsToMany");
    expect(belongsToMany.pivotTable).toBe("parent_related");
    expect(belongsToMany.foreignPivotKey).toBe("parent_id");
    expect(belongsToMany.relatedPivotKey).toBe("related_id");

    expect(morphOne.constructor.name).toBe("MorphOne");
    expect(morphOne.morphType).toBe("commentable_type");
    expect(morphOne.morphId).toBe("commentable_id");

    expect(morphMany.constructor.name).toBe("MorphMany");
    expect(morphMany.morphType).toBe("commentable_type");
    expect(morphMany.morphId).toBe("commentable_id");

    expect(morphTo.constructor.name).toBe("MorphTo");
    expect(morphTo.morphType).toBe("commentable_type");
    expect(morphTo.morphId).toBe("commentable_id");
  });

  test("SqlModel blocks mongo connection and resolves adapter for SQL connections", async () => {
    const adapter = { kind: "sql-adapter" } as never;
    mockedGetAdapter.mockResolvedValue(adapter);

    class SqlOnlyModel extends SqlModel {
      constructor(connectionName: any = "mysql_test") {
        super("sql_only_models", connectionName);
      }
    }

    await expect(new SqlOnlyModel().getDB()).resolves.toBe(adapter);
    expect(mockedGetAdapter).toHaveBeenCalledWith("mysql_test");
    expect(() => new SqlOnlyModel("mongo")).toThrow("SqlModel cannot use the mongo connection.");
  });
});
