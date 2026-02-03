/**
 *  Auto-generated Seeder
 * Seeder: UserSeeder
 * Linked Model: User
 * Created at: 2026-02-03T12:39:26.104Z
 */

import { UserFactory } from "../factories/UserFactory"
import { PostFactory } from "../factories/PostFactory"
import { CommentFactory } from "../factories/CommentFactory"

/**
 *  UserSeeder
 * Scenario:
 * - 5 users
 * - each user has 3 posts
 * - each post has 2 comments (morph)
 * - each user has 1 comment (morph)
 * - favorites pivot between users and posts
 */
export async function UserSeeder() {
  console.log("Running seeder: UserSeeder")

  const userFactory = new UserFactory()
  const postFactory = new PostFactory()
  const commentFactory = new CommentFactory()

  type SeedModel = {
    id: number
    getMorphClass?: () => string
    attach?: (
      pivotTable: string,
      foreignKey: string,
      relatedKey: string,
      foreignId: number,
      relatedIds: number[]
    ) => Promise<void>
  }

  const users = (await userFactory.createMany(5)) as SeedModel[]
  const allPosts: SeedModel[] = []

  const morphTypeOf = (model: SeedModel): string => {
    if (typeof model.getMorphClass === "function") return model.getMorphClass()
    const ctor = model.constructor as { name?: string } | undefined
    return String(ctor?.name ?? "Model")
  }

  for (const user of users) {
    // user gets 3 posts
    for (let i = 0; i < 3; i++) {
      const post = (await postFactory.create({
        user_id: user.id,
      })) as SeedModel

      allPosts.push(post)

      // post gets 2 comments (morph)
      for (let j = 0; j < 2; j++) {
        await commentFactory.create({
          commentable_id: post.id,
          commentable_type: morphTypeOf(post),
        })
      }
    }

    // add 1 comment directly on user (morph)
    await commentFactory.create({
      commentable_id: user.id,
      commentable_type: morphTypeOf(user),
    })
  }

  const pickRandomIds = (items: SeedModel[], count: number): number[] => {
    const pool = items.map((p) => p.id).filter((id) => typeof id === "number")
    // Fisher-Yates shuffle for unbiased sampling.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = pool[i]
      pool[i] = pool[j]
      pool[j] = tmp
    }
    return pool.slice(0, Math.min(count, pool.length))
  }

  // pivot: user favorites posts (many-to-many)
  for (const user of users) {
    const favorites = pickRandomIds(allPosts, 2)
    if (typeof user.attach === "function") {
      await user.attach("post_user_pivot", "user_id", "post_id", user.id, favorites)
    }
  }

  console.log("Seeding completed for User")
}
