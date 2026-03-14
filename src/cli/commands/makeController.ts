import { TemplateEngine } from "../utils/TemplateEngine";
import { overwriteFile, writeFileSafe } from "../utils/fileWriter";
import {
  camelCaseScaffoldName,
  logScaffoldCreated,
  logScaffoldFailure,
  resolveScaffoldArtifact,
} from "../utils/ScaffoldGeneratorSupport";

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
    const artifact = resolveScaffoldArtifact("controller", modelName, { test: isTest });

    const serviceImportPath = `../services/${artifact.modelClassName}Service`;
    const modelImportPath = isTest
      ? `../database/models/${artifact.modelClassName}`
      : `../models/${artifact.modelClassName}`;

    const softDeleteBlock = softDelete
      ? `
  // PATCH /${camelCaseScaffoldName(modelName)}/:id/restore
  async restore(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params?.id as unknown as string | number | undefined;
      if (id === undefined) {
        res.status(400).json({ error: "Missing id" });
        return;
      }
      await this.service.restore(id);
      res.json({ message: "${artifact.modelClassName} restored successfully" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: message });
    }
  }
`
      : "";

    const template = TemplateEngine.load("controller");
    const rendered = TemplateEngine.render(template, {
      PascalCase: artifact.modelClassName,
      camelCase: camelCaseScaffoldName(modelName),
      serviceImportPath,
      modelImportPath,
      softDeleteBlock,
    });

    const created = forceWrite
      ? overwriteFile(artifact.outputPath, rendered)
      : writeFileSafe(artifact.outputPath, rendered);

    if (created) {
      logScaffoldCreated("controller", artifact.relativePath);
    }
  } catch (err) {
    logScaffoldFailure("controller", modelName, err);
  }
}
