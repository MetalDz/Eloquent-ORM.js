import chalk from "chalk";
import { FactoryRegistry } from "./FactoryRegistry";
import type { StorageKind } from "../ArtifactStorage";

/**
 *  FactoryLoader
 * Automatically discovers and registers all factories at runtime.
 *
 * Usage:
 *   import { loadFactories } from "./FactoryLoader";
 *
 * After import, you can do:
 *   const userFactory = FactoryRegistry.make("UserFactory");
 *   const user = await userFactory.create();
 */

export async function loadFactories(
  isTest = false,
  options: { storageKind?: Exclude<StorageKind, "unknown"> } = {}
): Promise<void> {
  console.log(chalk.cyanBright("Initializing FactoryRegistry..."));

  try {
    FactoryRegistry.clear();
    await FactoryRegistry.autoDiscover(isTest, options);

    const count = FactoryRegistry.list().length;
    console.log(chalk.greenBright(`Loaded ${count} factories.`));
  } catch (error) {
    console.error(chalk.red("Failed to initialize factories."));
    if (error instanceof Error) console.error(chalk.red(error.message));
  }
}

// Note: no auto-run here. The CLI entrypoint calls loadFactories explicitly.
