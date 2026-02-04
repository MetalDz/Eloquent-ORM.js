import path from "path";
import chalk from "chalk";
import { TemplateEngine } from "../utils/TemplateEngine";
import { PathMap } from "../utils/PathMap";
import { writeFileSafe } from "../utils/fileWriter";

export async function makeService(
  modelName: string,
  options: { test?: boolean } = {}
) {
  try {
    const isTest = !!options.test;
    const className = `${capitalize(modelName)}Service`;
    const fileName = `${className}.ts`;
    const servicesDir = path.resolve(
      PathMap.root,
      isTest ? "src/test/services" : "src/app/services"
    );

    const modelImportPath = isTest
      ? `../database/models/${capitalize(modelName)}`
      : `../models/${capitalize(modelName)}`;

    const template = TemplateEngine.load("service");
    const rendered = TemplateEngine.render(template, {
      ModelName: capitalize(modelName),
      modelImportPath,
    });

    const outputPath = path.join(servicesDir, fileName);
    const created = writeFileSafe(outputPath, rendered);
    if (created) {
      const relPath = isTest
        ? `src/test/services/${fileName}`
        : `src/app/services/${fileName}`;
      console.log(chalk.greenBright(`✔ Service created:`), chalk.cyan(relPath));
    }
  } catch (err) {
    console.error(chalk.red(`❌ Failed to create service for model: ${modelName}`));
    console.error(err);
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
