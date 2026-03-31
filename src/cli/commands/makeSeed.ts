import path from "path";
import chalk from "chalk";
import { TemplateEngine } from "../utils/TemplateEngine.js";
import { PathMap } from "../utils/PathMap.js";
import { ImportResolver } from "../utils/ImportResolver.js";
import { overwriteFile, writeFileSafe } from "../utils/fileWriter.js";

/**
 * makeSeed
 * Generates a seeder for a given model (with its factory)
 */
export async function makeSeed(
  name: string,
  options?: { count?: number; test?: boolean; force?: boolean; mongo?: boolean },
) {
  try {
    PathMap.ensureDirs();

    const ModelName = name.charAt(0).toUpperCase() + name.slice(1);
    const FactoryName = `${ModelName}Factory`;
    const SeederName = `${ModelName}Seeder`;

    const Count = options?.count ?? 10;
    const Timestamp = new Date().toISOString();
    const factoryImportPath = ImportResolver.withRuntimeRelativeImportExtension(
      `../factories/${FactoryName}`,
      PathMap.root,
    );

    const template = TemplateEngine.load("seed");
    const rendered = TemplateEngine.render(template, {
      SeederName,
      FactoryName,
      ModelName,
      Count,
      Timestamp,
      factoryImportPath,
    });

    const outputDir = PathMap.seeds(!!options?.test);
    const filePath = path.resolve(outputDir, `${SeederName}.ts`);

    const ok = options?.force
      ? overwriteFile(filePath, rendered)
      : writeFileSafe(filePath, rendered);
    if (ok) {
      console.log(chalk.greenBright(`OK: Seeder created: ${SeederName}`));
    }
  } catch (err) {
    console.error(chalk.red("ERROR: Failed to create seeder file."));
    if (err instanceof Error) console.error(chalk.red(err.message));
  }
}
