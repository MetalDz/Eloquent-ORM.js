import type { Command } from "commander";
import { makeModel } from "../commands/makeModel.js";
import { makeController } from "../commands/makeController.js";
import { makeService } from "../commands/makeService.js";
import { makeRegistry } from "../commands/makeRegistry.js";
import { ensureCliProductionOverride } from "./CliProductionGuards.js";

export function registerCliScaffoldCommands(program: Command): void {
  program
    .command("make:model <name>")
    .option("--test", "Generate model inside test directory")
    .option("--mongo", "Generate a MongoModel-based model scaffold")
    .option(
      "--with-migration",
      "Automatically generate a migration for this model",
    )
    .option("--attrs-from-schema", "Infer model attrs type from schema fields")
    .option("--force", "Overwrite existing migration if it exists")
    .option(
      "--yes",
      "Acknowledge production override for this destructive command",
    )
    .description("Generate a new model (with optional migration)")
    .action(async (name: string, options: Record<string, unknown>) => {
      if (
        !ensureCliProductionOverride("make:model", {
          force: !!(options as { force?: boolean }).force,
          yes: !!(options as { yes?: boolean }).yes,
        })
      ) {
        return;
      }
      await makeModel(name, {
        ...options,
        test: !!(options as { test?: boolean }).test,
        mongo: !!(options as { mongo?: boolean }).mongo,
      });
    });

  program
    .command("make:registry")
    .option("--test", "Generate model registry bootstrap inside test directory")
    .option("--force", "Overwrite existing model registry file if it exists")
    .option(
      "--yes",
      "Acknowledge production override for this destructive command",
    )
    .description("Generate a registerModels bootstrap helper from discovered models")
    .action(
      (
        options: { test?: boolean; force?: boolean; yes?: boolean },
      ) => {
        if (
          !ensureCliProductionOverride("make:registry", {
            force: !!options.force,
            yes: !!options.yes,
          })
        ) {
          return;
        }
        return makeRegistry({
          test: !!options.test,
          force: !!options.force,
        });
      },
    );

  program
    .command("make:controller <name>")
    .option("--test", "Generate controller inside test directory")
    .option("--soft", "Generate controller with soft delete support")
    .option("--force", "Overwrite existing controller file if it exists")
    .option(
      "--yes",
      "Acknowledge production override for this destructive command",
    )
    .description("Create a new controller (linked to service)")
    .action(
      (
        name: string,
        options: {
          test?: boolean;
          soft?: boolean;
          force?: boolean;
          yes?: boolean;
        },
      ) => {
        if (
          !ensureCliProductionOverride("make:controller", {
            force: !!options.force,
            yes: !!options.yes,
          })
        ) {
          return;
        }
        return makeController(name, {
          test: !!options.test,
          soft: !!options.soft,
          force: !!options.force,
        });
      },
    );

  program
    .command("make:service <name>")
    .option("--test", "Generate service inside test directory")
    .option("--force", "Overwrite existing service file if it exists")
    .option(
      "--yes",
      "Acknowledge production override for this destructive command",
    )
    .description("Create a new service (business logic layer)")
    .action(
      (
        name: string,
        options: { test?: boolean; force?: boolean; yes?: boolean },
      ) => {
        if (
          !ensureCliProductionOverride("make:service", {
            force: !!options.force,
            yes: !!options.yes,
          })
        ) {
          return;
        }
        return makeService(name, {
          test: !!options.test,
          force: !!options.force,
        });
      },
    );
}
