import { EagerLoadingMixin, type RelationDefinition } from "../core/orm/mixins/EagerLoadingMixin";

abstract class EmptyBase {}

describe("EagerLoading getRelation contract", () => {
  test("getRelation returns a resolved relation object with runtime hooks", () => {
    class EagerModel extends EagerLoadingMixin(
      EmptyBase as unknown as abstract new (...args: any[]) => object
    ) {
      comments(): RelationDefinition<any> {
        return {
          name: "comments",
          getResults: async () => [{ id: 10 }],
          match: async () => undefined,
        };
      }
    }

    const eager = new (EagerModel as any)();
    const relation = eager.getRelation("comments");

    expect(typeof relation).toBe("object");
    expect(relation?.name).toBe("comments");
    expect(typeof relation?.getResults).toBe("function");
    expect(typeof relation?.match).toBe("function");
  });
});
