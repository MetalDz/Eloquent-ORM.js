import {
  MorphableMixin,
  type MorphableBaseModel,
  type ORMQuery,
} from "../core/orm/mixins/MorphableMixin.js";

abstract class EmptyBase {}

class MorphableModel extends MorphableMixin(EmptyBase) {
  public id = 5;

  public getMorphClass(): string {
    return "users";
  }
}

type MorphableMethods = MorphableBaseModel & {
  morphOne<T extends MorphableBaseModel>(
    RelatedModel: { query(): ORMQuery<T> },
    relationName: string
  ): Promise<T | null>;
  morphMany<T extends MorphableBaseModel>(
    RelatedModel: { query(): ORMQuery<T> },
    relationName: string
  ): Promise<T[]>;
  morphTo(relationName: string): Promise<MorphableBaseModel | null>;
};

describe("MorphableMixin SQL hardening", () => {
  test("morphOne and morphMany reject unsafe relation names before calling query builders", async () => {
    const first = jest.fn<Promise<MorphableBaseModel | null>, []>(async () => ({}));
    const get = jest.fn<Promise<MorphableBaseModel[]>, []>(async () => [{}]);
    const where = jest.fn().mockReturnThis();
    const query = jest.fn(() => ({ where, first, get }));

    const model = new MorphableModel() as unknown as MorphableMethods;
    const RelatedModel = { query };

    await expect(
      model.morphOne(RelatedModel, "commentable_type OR 1=1")
    ).rejects.toThrow("Unsafe relation name");
    await expect(
      model.morphMany(RelatedModel, "commentable;DROP")
    ).rejects.toThrow("Unsafe relation name");

    expect(query).not.toHaveBeenCalled();
    expect(where).not.toHaveBeenCalled();
  });

  test("morphTo rejects unsafe relation names before resolving morph fields", async () => {
    const model = new MorphableModel() as unknown as MorphableMethods;

    await expect(
      model.morphTo("commentable_type OR 1=1")
    ).rejects.toThrow("Unsafe relation name");
  });
});
