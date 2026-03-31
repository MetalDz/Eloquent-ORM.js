/**
 * factory:status
 * Lists all registered factories and optionally shows ORM model details or a graph.
 */

import chalk from "chalk";
import type { BaseModel } from "../../core/model/BaseModel.js";
import type {
  RelationDefinition,
  SchemaField,
} from "../../core/schema/SchemaBlueprint.js";
import type { Factory } from "../utils/factories/Factory.js";
import {
  FACTORY_EMPTY_MARK,
  FACTORY_STATUS_FOOTER,
  getFactoryRelationArrow,
} from "../utils/factories/FactoryDisplay.js";
import { generateFactoryGraph } from "../utils/factories/FactoryGraph.js";
import { FactoryRegistry } from "../utils/factories/FactoryRegistry.js";

interface TableRow {
  Factory: string;
  Type: string;
  Model?: string;
  Table?: string;
  Pivot?: string;
  Relations?: string;
  Status?: string;
}

function hasSchema<T extends { schema?: Record<string, SchemaField> }>(
  modelCtor: unknown
): modelCtor is T & { schema: Record<string, SchemaField> } {
  return (
    typeof modelCtor === "function" &&
    Object.prototype.hasOwnProperty.call(modelCtor, "schema")
  );
}

function extractRelations(
  schema: Record<string, SchemaField> | undefined
): string {
  if (!schema) {
    return chalk.gray(FACTORY_EMPTY_MARK);
  }

  const relations: string[] = [];

  for (const [, def] of Object.entries(schema)) {
    if (def.kind !== "relation") {
      continue;
    }

    const rel = def as RelationDefinition;
    relations.push(
      `${getFactoryRelationArrow(rel.relation)} ${chalk.cyanBright(rel.model)} (${rel.relation})`
    );
  }

  return relations.length > 0
    ? relations.join(chalk.gray(", "))
    : chalk.gray(FACTORY_EMPTY_MARK);
}

function getFactoryDetails(factory: Factory<BaseModel>) {
  const modelClass = factory.model?.name ?? "Unknown";
  const modelInstance = new factory.model();

  let tableName = FACTORY_EMPTY_MARK;
  let pivot = "No";
  let relations = chalk.gray(FACTORY_EMPTY_MARK);

  if (
    "tableName" in modelInstance &&
    typeof modelInstance.tableName === "string"
  ) {
    tableName = modelInstance.tableName;
  }

  if (hasSchema(modelInstance.constructor)) {
    relations = extractRelations(modelInstance.constructor.schema);
  }

  if (factory.constructor.name.endsWith("PivotFactory")) {
    pivot = "Yes";
  }

  return { modelClass, tableName, pivot, relations };
}

export async function factoryStatus(
  options?: { details?: boolean; graph?: boolean },
  _command?: unknown
): Promise<void> {
  console.log(chalk.cyanBright("\nEloquentJS Factory Status\n"));

  try {
    const factories = FactoryRegistry.list();

    if (factories.length === 0) {
      console.log(chalk.yellow("No factories are currently registered.\n"));
      console.log(
        chalk.gray(
          "Tip: Run your app or import FactoryLoader to auto-discover factories.\n"
        )
      );
      return;
    }

    console.log(
      chalk.greenBright(`${factories.length} factories registered.\n`)
    );

    if (options?.graph) {
      console.log(generateFactoryGraph(factories));
      return;
    }

    if (options?.details) {
      const tableData = factories.map((name) => {
        const instance = FactoryRegistry.make(name);
        const details = getFactoryDetails(instance);

        return {
          Factory: name,
          Type: name.endsWith("PivotFactory")
            ? chalk.magenta("Pivot")
            : chalk.blue("Model"),
          Model: details.modelClass,
          Table: details.tableName,
          Pivot:
            details.pivot === "Yes" ? chalk.magenta("Yes") : chalk.gray("No"),
          Relations: details.relations,
        };
      });

      console.table(tableData as TableRow[]);
      console.log(chalk.gray(FACTORY_STATUS_FOOTER));
      return;
    }

    const summaryData = factories.map((name) => ({
      Factory: name,
      Type: name.endsWith("PivotFactory")
        ? chalk.magenta("Pivot")
        : chalk.blue("Model"),
      Status: chalk.green("Ready"),
    }));

    console.table(summaryData);
    console.log(chalk.gray(FACTORY_STATUS_FOOTER));
  } catch (error) {
    console.error(chalk.red("Failed to fetch factory status."));
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
  }
}
