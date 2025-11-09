import path from "path";
import chalk from "chalk";
import { TemplateEngine } from "../utils/TemplateEngine";
import { PathMap } from "../utils/PathMap";
import { writeFileSafe } from "../utils/fileWriter";
import { TypeScriptCompiler } from "../utils/typescript/TypeScriptCompiler";

/**
 * 🧩 Command: eloquent make:controller
 * Generates a controller class with REST methods (index, show, store, update, destroy)
 * Automatically linked to the Model & Service layers
 * Supports optional --soft flag to include restore() for SoftDeletes models.
 */

export async function makeController(modelName: string, options: { soft?: boolean; test?: boolean } = {}) {
  try {
    const isTest = !!options.test;
    const softDelete = !!options.soft;

    const className = `${capitalize(modelName)}Controller`;
    const fileName = `${className}.ts`;

    const controllersDir = path.resolve(PathMap.root, "src/app/controllers");
    const outputPath = path.join(controllersDir, fileName);

    // Load & render template
    const template = TemplateEngine.load("controller");
    const rendered = TemplateEngine.render(template, {
      PascalCase: capitalize(modelName),
      camelCase: camelCase(modelName),
      softDelete: softDelete ? "true" : "",
    });

    // Save generated controller
    const created = writeFileSafe(outputPath, rendered);

    if (created) {
      console.log(chalk.greenBright(`✔ Controller created:`), chalk.cyan(`src/app/controllers/${fileName}`));
    }

  } catch (err) {
    console.error(chalk.red(`❌ Failed to create controller for model: ${modelName}`));
    console.error(err);
  }
}

/**
 * Helpers
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function camelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}
