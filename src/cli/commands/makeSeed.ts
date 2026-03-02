import path from "path";
import chalk from "chalk";
import { TemplateEngine } from "../utils/TemplateEngine";
import { PathMap } from "../utils/PathMap";
import { writeFileSafe } from "../utils/fileWriter";

/**
 * 🧩 makeSeed
 * Generates a seeder for a given model (with its factory)
 */
export async function makeSeed(
  name: string,
  options?: { count?: number; test?: boolean }
) {
  try {
    PathMap.ensureDirs();

    const ModelName = name.charAt(0).toUpperCase() + name.slice(1);
    const FactoryName = `${ModelName}Factory`;
    const SeederName = `${ModelName}Seeder`;

    const Count = options?.count ?? 10;
    const Timestamp = new Date().toISOString();

    const template = TemplateEngine.load("seed");
    const rendered = TemplateEngine.render(template, {
      SeederName,
      FactoryName,
      ModelName,
      Count,
      Timestamp,
    });

    const outputDir = PathMap.seeds(!!options?.test);
    const filePath = path.resolve(outputDir, `${SeederName}.ts`);

    const ok = writeFileSafe(filePath, rendered);
    if (ok) {
      console.log(chalk.greenBright(`✅ Seeder created: ${SeederName}`));
    }
  } catch (err) {
    console.error(chalk.red("❌ Failed to create seeder file."));
    if (err instanceof Error) console.error(chalk.red(err.message));
  }
}
