/**
 * Auto-generated Seeder
 * Seeder: UserSeeder
 * Linked Model: User
 * Created at: 2026-03-02T10:17:41.636Z
 */

import { UserFactory } from "../factories/UserFactory"

/**
 * UserSeeder
 * Generates sample data for User using UserFactory
 */
export async function UserSeeder() {
  console.log("Running seeder: UserSeeder")

  const factory = new UserFactory()

  // You can modify the count as needed
  await factory.createMany(5, (instance, i) => {
    console.log(`Created #${i + 1}:`, instance)
  })

  console.log("Seeding completed for User")
}