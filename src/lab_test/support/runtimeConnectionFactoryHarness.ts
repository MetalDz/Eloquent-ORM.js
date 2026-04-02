import path from "path";

import {
  clearLoadedModuleCache,
  loadModule,
} from "../../cli/utils/typescript/tsRuntime.js";

type RuntimeConnectionFactoryModule = {
  getAdapter: (...args: unknown[]) => Promise<unknown>;
  getConnection: (...args: unknown[]) => Promise<unknown>;
  closeAllConnections: () => Promise<void>;
};

const rootDir = process.cwd();
const runtimeModulePaths = [
  path.resolve(rootDir, "src/config/database.ts"),
  path.resolve(rootDir, "src/core/connection/DatabaseConnection.ts"),
  path.resolve(rootDir, "src/core/connection/ConnectionFactory.ts"),
  path.resolve(rootDir, "src/core/model/CoreModel.ts"),
  path.resolve(rootDir, "src/core/model/BaseModel.ts"),
];

export function clearRuntimeConnectionFactoryHarnessCache(): void {
  for (const filePath of runtimeModulePaths) {
    clearLoadedModuleCache(filePath);
  }
}

export function loadRuntimeConnectionFactoryModule(): RuntimeConnectionFactoryModule {
  const filePath = path.resolve(rootDir, "src/core/connection/ConnectionFactory.ts");
  return loadModule(filePath) as RuntimeConnectionFactoryModule;
}
