import fs from "fs";
import path from "path";
import chalk from "chalk";

export async function makeMigration(name: string) {
  const dir = path.resolve(process.cwd(), "src", "database", "migrations");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[-T:\.Z]/g, "");
  const filePath = path.join(dir, `${timestamp}_${name}.ts`);

  const content = `export const up = async (queryRunner) => {
  // Write your migration "up" logic here
};

export const down = async (queryRunner) => {
  // Write your migration "down" logic here
};
`;

  fs.writeFileSync(filePath, content);
  console.log(chalk.green(`✅ Migration created: ${filePath}`));
}
