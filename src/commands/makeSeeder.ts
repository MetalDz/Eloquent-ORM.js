import fs from "fs";
import path from "path";
import chalk from "chalk";

export async function makeSeeder(name: string) {
  const dir = path.resolve(process.cwd(), "src", "database", "seeders");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = path.join(dir, `${name}Seeder.ts`);

  const content = `export class ${name}Seeder {
  async run() {
    console.log("Seeding data for ${name}...");
  }
}
`;

  fs.writeFileSync(filePath, content);
  console.log(chalk.green(`✅ Seeder created: ${filePath}`));
}
