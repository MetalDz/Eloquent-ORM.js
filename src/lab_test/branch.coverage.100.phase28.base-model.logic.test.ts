import { BaseModel } from "../core/model/BaseModel";

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
  }

  test("relation helpers use default key = id when optional key is omitted", () => {
    const model = new ParentModel();

    const belongsTo = model.belongsToWithDefaultOwnerKey() as any;
    const hasOne = model.hasOneWithDefaultLocalKey() as any;
    const hasMany = model.hasManyWithDefaultLocalKey() as any;

    expect(belongsTo.localKey).toBe("id");
    expect(hasOne.localKey).toBe("id");
    expect(hasMany.localKey).toBe("id");
  });
});

