import path from "path";
import chalk from "chalk";
import { TemplateEngine } from "../utils/TemplateEngine";
import { PathMap } from "../utils/PathMap";
import { overwriteFile, writeFileSafe } from "../utils/fileWriter";

/**
 * Command: eloquent make:controller
 * Generates a controller class with REST methods (index, show, store, update, destroy)
 * Automatically linked to the Model & Service layers
 */
export async function makeController(
  modelName: string,
  options: { soft?: boolean; test?: boolean; force?: boolean } = {}
) {
  try {
    const isTest = !!options.test;
    const softDelete = !!options.soft;
    const forceWrite = !!options.force;

    const className = `${capitalize(modelName)}Controller`;
    const fileName = `${className}.ts`;

    const controllersDir = path.resolve(
      PathMap.root,
      isTest ? "src/test/controllers" : "src/app/controllers"
    );
    const outputPath = path.join(controllersDir, fileName);

    const serviceImportPath = isTest
      ? `../services/${capitalize(modelName)}Service`
      : `../services/${capitalize(modelName)}Service`;
    const modelImportPath = isTest
      ? `../database/models/${capitalize(modelName)}`
      : `../models/${capitalize(modelName)}`;

    const softDeleteBlock = softDelete
      ? `
  // PATCH /${camelCase(modelName)}/:id/restore
  async restore(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params?.id as unknown as string | number | undefined;
      if (id === undefined) {
        res.status(400).json({ error: "Missing id" });
        return;
      }
      await this.service.restore(id);
      res.json({ message: "${capitalize(modelName)} restored successfully" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: message });
    }
  }
`
      : "";

    const template = TemplateEngine.load("controller");
    const rendered = TemplateEngine.render(template, {
      PascalCase: capitalize(modelName),
      camelCase: camelCase(modelName),
      serviceImportPath,
      modelImportPath,
      softDeleteBlock,
    });

    const created = forceWrite
      ? overwriteFile(outputPath, rendered)
      : writeFileSafe(outputPath, rendered);
    if (created) {
      const relPath = isTest
        ? `src/test/controllers/${fileName}`
        : `src/app/controllers/${fileName}`;
      console.log(chalk.greenBright(`✔ Controller created:`), chalk.cyan(relPath));
    }
  } catch (err) {
    console.error(chalk.red(`❌ Failed to create controller for model: ${modelName}`));
    console.error(err);
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function camelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}
