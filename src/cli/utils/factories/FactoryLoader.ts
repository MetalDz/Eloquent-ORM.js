import chalk from "chalk";
import { FactoryRegistry } from "./FactoryRegistry";

/**
 * 🧬 FactoryLoader
 * Automatically discovers and registers all factories at runtime.
 *
 * Usage:
 *   import "./FactoryLoader"; // from your app entry (e.g., eloquent.ts or main.ts)
 *
 * After import, you can do:
 *   const userFactory = FactoryRegistry.make("UserFactory");
 *   const user = await userFactory.create();
 */

export async function loadFactories(): Promise<void> {
  console.log(chalk.cyanBright("🧩 Initializing FactoryRegistry..."));

  try {
    await FactoryRegistry.autoDiscover();

    const count = FactoryRegistry.list().length;
    console.log(chalk.greenBright(`✅ Loaded ${count} factories.`));
  } catch (error) {
    console.error(chalk.red("❌ Failed to initialize factories."));
    if (error instanceof Error) console.error(chalk.red(error.message));
  }
}

// 🔹 Optional: Auto-run when imported (useful for app bootstrap)
loadFactories()
  .then(() => {
    console.log(chalk.cyanBright("🏗️ Factory system ready.\n"));
  })
  .catch((err) => {
    console.error(chalk.red("❌ Factory auto-load failed."));
    console.error(err);
  });
