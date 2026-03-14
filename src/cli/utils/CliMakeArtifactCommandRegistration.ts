import type { Command } from "commander";
import { makeSeed } from "../commands/makeSeed";
import { makeFactory } from "../commands/makeFactory";
import { makeScenario } from "../commands/makeScenario";
import {
  ensureCliProductionOverride,
  ensureCliProductionTestOnly,
} from "./CliProductionGuards";
import { runCliAction } from "./CliActionRuntime";

export function registerCliMakeArtifactCommands(program: Command): void {
  program
    .command("make:seed <model>")
    .option("--count <number>", "Number of records to seed", "10")
    .option("--test", "Generate seed in test environment")
    .option("--mongo", "Target a Mongo-backed model")
    .option("--force", "Overwrite existing seeder file if it exists")
    .option(
      "--yes",
      "Acknowledge production override for this destructive command",
    )
    .description("Generate a seeder file linked to a model factory")
    .action(
      async (
        model: string,
        options: {
          count: string;
          test?: boolean;
          mongo?: boolean;
          force?: boolean;
          yes?: boolean;
        },
      ) => {
        if (!ensureCliProductionTestOnly("make:seed", { test: !!options.test })) {
          return;
        }
        if (
          !ensureCliProductionOverride("make:seed", {
            force: !!options.force,
            yes: !!options.yes,
          })
        ) {
          return;
        }
        await makeSeed(model, {
          count: Number(options.count),
          test: !!options.test,
          force: !!options.force,
          mongo: !!options.mongo,
        });
      },
    );

  program
    .command("make:factory <name>")
    .option("--model <model>", "Specify the model this factory belongs to")
    .option("--test", "Generate in test environment")
    .option("--mongo", "Target a Mongo-backed model")
    .option("--force", "Overwrite existing file")
    .option(
      "--yes",
      "Acknowledge production override for this destructive command",
    )
    .description("Generate a factory for a model")
    .action(
      async (
        name: string,
        options: {
          model?: string;
          test?: boolean;
          mongo?: boolean;
          force?: boolean;
          yes?: boolean;
        },
      ) => {
        if (!ensureCliProductionTestOnly("make:factory", { test: !!options.test })) {
          return;
        }
        if (
          !ensureCliProductionOverride("make:factory", {
            force: !!options.force,
            yes: !!options.yes,
          })
        ) {
          return;
        }
        const modelName = options.model ?? name;

        await makeFactory(modelName, {
          test: !!options.test,
          force: !!options.force,
          mongo: !!options.mongo,
        });
      },
    );

  program
    .command("make:scenario <name>")
    .option(
      "--test",
      "Generate scenario in test folders (default is app folders)",
    )
    .option("--mongo", "Generate scenario models/migrations for mongo connection")
    .option("--preset <name>", "Preset: blog | media")
    .option("--controllers", "Generate controllers for the target environment")
    .option("--services", "Generate services for the target environment")
    .option("--run", "Run migrate:fresh and db:seed for the target environment")
    .option("--force", "Overwrite existing scenario files")
    .option(
      "--yes",
      "Acknowledge production override for this destructive command",
    )
    .description(
      "Generate an automated scenario (models, migrations, factories, seeds)",
    )
    .action(
      async (
        name: string,
        options: {
          test?: boolean;
          mongo?: boolean;
          preset?: string;
          controllers?: boolean;
          services?: boolean;
          run?: boolean;
          force?: boolean;
          yes?: boolean;
        },
      ) => {
        return runCliAction(async () => {
          if (
            !ensureCliProductionTestOnly("make:scenario", { test: !!options.test })
          ) {
            return;
          }
          if (
            !ensureCliProductionOverride("make:scenario", {
              force: !!options.force,
              yes: !!options.yes,
            })
          ) {
            return;
          }
          await makeScenario(name, {
            test: !!options.test,
            mongo: !!options.mongo,
            preset: options.preset,
            controllers: !!options.controllers,
            services: !!options.services,
            run: !!options.run,
            force: !!options.force,
          });
        });
      },
    );
}
