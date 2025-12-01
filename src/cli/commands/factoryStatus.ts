/**
 * 🧩 factory:status
 * Lists all registered factories and optionally shows ORM model details or a graph.
 *
 * Flags:
 *  --details → detailed table view (model, table, relations)
 *  --graph   → ASCII ERD-style diagram (grouped relationships)
 */

import chalk from "chalk";
import { FactoryRegistry } from "../utils/factories/FactoryRegistry";
import type { Factory } from "../utils/factories/Factory";
import type { BaseModel } from "../../core/model/BaseModel";
import type {
  SchemaField,
  RelationDefinition,
} from "../../core/schema/SchemaBlueprint";
import { generateFactoryGraph } from "../utils/factories/FactoryGraph";


/* -------------------------------------------------------------------------- */
/* 🧠 Type Guards                                                             */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* 🔍 Relation Extractor                                                      */
/* -------------------------------------------------------------------------- */

function extractRelations(
  schema: Record<string, SchemaField> | undefined
): string {
  if (!schema) return chalk.gray("—");

  const relations: string[] = [];

  for (const [_, def] of Object.entries(schema)) {
    if (def.kind === "relation") {
      const rel = def as RelationDefinition;
      const arrow =
        rel.relation === "belongsTo"
          ? chalk.blue("⇠")
          : rel.relation === "hasOne"
          ? chalk.green("⇢")
          : rel.relation === "hasMany"
          ? chalk.green("⇢⇢")
          : rel.relation === "belongsToMany"
          ? chalk.magenta("⇿")
          : rel.relation.startsWith("morph")
          ? chalk.yellow("≈")
          : "→";
      relations.push(
        `${arrow} ${chalk.cyanBright(rel.model)} (${rel.relation})`
      );
    }
  }

  return relations.length > 0
    ? relations.join(chalk.gray(", "))
    : chalk.gray("—");
}

/* -------------------------------------------------------------------------- */
/* 🧬 Factory Detail Inspector                                                */
/* -------------------------------------------------------------------------- */

function getFactoryDetails(factory: Factory<BaseModel>) {
  const modelClass = factory.model?.name ?? "Unknown";
  const modelInstance = new factory.model();

  let tableName = "—";
  let pivot = "No";
  let relations = chalk.gray("—");

  if (
    "tableName" in modelInstance &&
    typeof modelInstance.tableName === "string"
  ) {
    tableName = modelInstance.tableName;
  }

  if (hasSchema(modelInstance.constructor)) {
    const schema = (
      modelInstance.constructor as { schema: Record<string, SchemaField> }
    ).schema;
    relations = extractRelations(schema);
  }

  if (factory.constructor.name.endsWith("PivotFactory")) {
    pivot = "Yes";
  }

  return { modelClass, tableName, pivot, relations };
}

/* -------------------------------------------------------------------------- */
/* 📊 Graph Generator (with grouping)                                         */
/* -------------------------------------------------------------------------- */

function generateGraph(factories: string[]): string {
  const links: Array<{ from: string; to: string; rel: string }> = [];

  // Collect all links from schema relations
  for (const name of factories) {
    const instance = FactoryRegistry.make(name);
    const modelInstance = new instance.model();

    if (!hasSchema(modelInstance.constructor)) continue;
    const schema = (
      modelInstance.constructor as { schema: Record<string, SchemaField> }
    ).schema;

    for (const [, field] of Object.entries(schema)) {
      if (field.kind === "relation") {
        const rel = field as RelationDefinition;
        links.push({
          from: name.replace("Factory", ""),
          to: rel.model,
          rel: rel.relation,
        });
      }
    }
  }

  // Group symmetrical relations to avoid duplicates
  const uniqueLinks: Array<{ from: string; to: string; rel: string }> = [];

  for (const link of links) {
    const mirror = links.find(
      (l) => l.from === link.to && l.to === link.from && l.rel === link.rel
    );
    const alreadyExists = uniqueLinks.some(
      (u) =>
        (u.from === link.from && u.to === link.to) ||
        (u.from === link.to && u.to === link.from)
    );

    if (!alreadyExists) {
      uniqueLinks.push(link);
    }

    if (mirror) {
      // remove mirrored one
      links.splice(links.indexOf(mirror), 1);
    }
  }

  // Build ASCII graph
  let output = chalk.cyanBright("\n📊 Model Relationship Graph\n\n");

  if (uniqueLinks.length === 0) {
    output += chalk.gray("No relationships detected.\n");
    return output;
  }

  const grouped = new Map<string, Array<{ to: string; rel: string }>>();

  for (const { from, to, rel } of uniqueLinks) {
    if (!grouped.has(from)) grouped.set(from, []);
    grouped.get(from)!.push({ to, rel });
  }

  for (const [node, relations] of grouped.entries()) {
    output += chalk.greenBright(`${node}\n`);
    for (const { to, rel } of relations) {
      let arrow =
        rel === "belongsTo"
          ? chalk.blue("⇠")
          : rel === "hasOne"
          ? chalk.green("⇢")
          : rel === "hasMany"
          ? chalk.green("⇢⇢")
          : rel === "belongsToMany"
          ? chalk.magenta("⇿")
          : rel.startsWith("morph")
          ? chalk.yellow("≈")
          : "→";
      output +=
        chalk.gray(`  ${arrow} `) + chalk.cyan(to) + chalk.gray(` (${rel})\n`);
    }
    output += "\n";
  }

  return output;
}

/* -------------------------------------------------------------------------- */
/* 🧩 Main Command                                                            */
/* -------------------------------------------------------------------------- */

export async function factoryStatus(
  options?: { details?: boolean; graph?: boolean },
  _command?: unknown // safely ignore Commander’s internal param
): Promise<void> {
  console.log(chalk.cyanBright("\n🧬 EloquentJS Factory Status\n"));

  try {
    const factories = FactoryRegistry.list();

    if (factories.length === 0) {
      console.log(chalk.yellow("⚠️  No factories are currently registered.\n"));
      console.log(
        chalk.gray(
          "💡 Tip: Run your app or import FactoryLoader to auto-discover factories.\n"
        )
      );
      return;
    }

    console.log(
      chalk.greenBright(`✅ ${factories.length} factories registered.\n`)
    );

    // --- GRAPH MODE ---
    if (options?.graph) {
      console.log(generateFactoryGraph(factories));
      return;
    }

    // --- DETAILS MODE ---
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
      console.log(
        chalk.gray(
          "\n🏗️  Use factories directly via FactoryRegistry.make(<name>)\n"
        )
      );
      return;
    }

    // --- SIMPLE MODE ---
    const summaryData = factories.map((name) => ({
      Factory: name,
      Type: name.endsWith("PivotFactory")
        ? chalk.magenta("Pivot")
        : chalk.blue("Model"),
      Status: chalk.green("Ready"),
    }));

    console.table(summaryData);
    console.log(
      chalk.gray(
        "\n🏗️  Use factories directly via FactoryRegistry.make(<name>)\n"
      )
    );
  } catch (error) {
    console.error(chalk.red("❌ Failed to fetch factory status."));
    if (error instanceof Error) console.error(chalk.red(error.message));
  }
}
