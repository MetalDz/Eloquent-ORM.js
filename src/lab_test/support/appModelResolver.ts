import fs from "fs";
import path from "path";

import { loadModule } from "../../cli/utils/typescript/tsRuntime.js";

type ResolveOptions = {
  preferFixture?: boolean;
};

function buildCandidates(modelName: string, options: ResolveOptions = {}): string[] {
  const appPath = path.resolve(process.cwd(), "src/app/models", `${modelName}.ts`);
  const fixturePath = path.resolve(
    process.cwd(),
    "src/lab_test/support/app-model-fixtures",
    `${modelName}.ts`
  );

  return options.preferFixture ? [fixturePath, appPath] : [appPath, fixturePath];
}

export function resolveAppModelPath(modelName: string, options: ResolveOptions = {}): string {
  const candidates = buildCandidates(modelName, options);
  const existing = candidates.find((candidate) => fs.existsSync(candidate));

  if (!existing) {
    throw new Error(
      `Unable to resolve model '${modelName}'. Checked: ${candidates.join(", ")}`
    );
  }

  return existing;
}

export function loadAppModel<TExport>(modelName: string, options: ResolveOptions = {}) {
  const filePath = resolveAppModelPath(modelName, options);
  try {
    delete require.cache[require.resolve(filePath)];
  } catch {
    // ignore cache misses
  }

  const mod = loadModule(filePath) as Record<string, unknown>;
  return {
    filePath,
    exported: mod[modelName] as TExport,
  };
}
