import { TemplateEngine } from "../utils/TemplateEngine";
import { overwriteFile, writeFileSafe } from "../utils/fileWriter";
import {
  logScaffoldCreated,
  logScaffoldFailure,
  resolveScaffoldArtifact,
} from "../utils/ScaffoldGeneratorSupport";

export async function makeService(
  modelName: string,
  options: { test?: boolean; force?: boolean } = {}
) {
  try {
    const isTest = !!options.test;
    const forceWrite = !!options.force;
    const artifact = resolveScaffoldArtifact("service", modelName, { test: isTest });

    const modelImportPath = isTest
      ? `../database/models/${artifact.modelClassName}`
      : `../models/${artifact.modelClassName}`;

    const template = TemplateEngine.load("service");
    const rendered = TemplateEngine.render(template, {
      ModelName: artifact.modelClassName,
      modelImportPath,
    });

    const created = forceWrite
      ? overwriteFile(artifact.outputPath, rendered)
      : writeFileSafe(artifact.outputPath, rendered);

    if (created) {
      logScaffoldCreated("service", artifact.relativePath);
    }
  } catch (err) {
    logScaffoldFailure("service", modelName, err);
  }
}
