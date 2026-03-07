/**
 * Auto-generated seeder
 * Seeder: {{SeederName}}
 * Linked model: {{ModelName}}
 * Created at: {{Timestamp}}
 */

import { {{FactoryName}} } from "../factories/{{FactoryName}}";

export async function {{SeederName}}() {
  console.log("Running seeder: {{SeederName}}");

  const factory = new {{FactoryName}}();

  await factory.createMany({{Count}}, (instance, i) => {
    console.log(`Created #${i + 1}:`, instance);
  });

  console.log("Seeding completed for {{ModelName}}");
}
