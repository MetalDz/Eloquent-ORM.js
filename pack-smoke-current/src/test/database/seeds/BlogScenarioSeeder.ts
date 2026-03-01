/**
 * Auto-generated Scenario Seeder
 * Seeder: BlogScenarioSeeder
 */

import { UserFactory } from "../factories/UserFactory";
import { CommentFactory } from "../factories/CommentFactory";
import { PostFactory } from "../factories/PostFactory";

type SeedModel = {
  id: number;
  getMorphClass?: () => string;
  attach?: (
    pivotTable: string,
    foreignKey: string,
    relatedKey: string,
    foreignId: number,
    relatedIds: number[]
  ) => Promise<void>;
};

const morphTypeOf = (model: SeedModel): string => {
  if (typeof model.getMorphClass === "function") return model.getMorphClass();
  const ctor = model.constructor as { name?: string } | undefined;
  return String(ctor?.name ?? "Model");
};

const pickRandomIds = (items: SeedModel[], count: number): number[] => {
  const pool = items.map((p) => p.id).filter((id) => typeof id === "number");
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, Math.min(count, pool.length));
};

export async function BlogScenarioSeeder() {
  console.log("Running seeder: BlogScenarioSeeder");

  const userFactory = new UserFactory();
  const commentFactory = new CommentFactory();
  const postFactory = new PostFactory();

  const users = (await userFactory.createMany(5)) as SeedModel[];
  const allPosts: SeedModel[] = [];
  
  for (const user of users) {
    for (let i = 0; i < 3; i++) {
      const post = (await postFactory.create({ user_id: user.id })) as SeedModel;
      allPosts.push(post);
      for (let j = 0; j < 2; j++) {
        await commentFactory.create({
          commentable_id: post.id,
          commentable_type: morphTypeOf(post),
        });
      }
    }
    await commentFactory.create({
      commentable_id: user.id,
      commentable_type: morphTypeOf(user),
    });
  }
  
  for (const user of users) {
    const favorites = pickRandomIds(allPosts, 2);
    if (typeof user.attach === "function") {
      await user.attach("post_user_pivot", "user_id", "post_id", user.id, favorites);
    }
  }

  console.log("Seeding completed for BlogScenarioSeeder");
}
