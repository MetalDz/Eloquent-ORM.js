/**
 * Auto-generated Seeder
 * Seeder: {{SeederName}}
 * Linked Model: {{ModelName}}
 * Created at: {{Timestamp}}
 */

import { {{FactoryName}} } from "../factories/{{FactoryName}}"

/**
 * {{SeederName}}
 * Generates sample data for {{ModelName}} using {{FactoryName}}
 */
export async function {{SeederName}}() {
  console.log("Running seeder: {{SeederName}}")

  const factory = new {{FactoryName}}()

  // You can modify the count as needed
  await factory.createMany({{Count}}, (instance, i) => {
    console.log(`Created #${i + 1}:`, instance)
  })

  console.log("Seeding completed for {{ModelName}}")
}
