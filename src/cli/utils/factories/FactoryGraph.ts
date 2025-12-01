/**
 * 📊 FactoryGraph
 * Generates an ASCII Entity-Relationship Diagram from all registered factories.
 * Supports all relation types including polymorphic (morphOne, morphMany, morphTo).
 */

import chalk from "chalk";
import { FactoryRegistry } from "./FactoryRegistry";
import type { SchemaField, RelationDefinition } from "../../../core/schema/SchemaBlueprint";
import type { BaseModel } from "../../../core/model/BaseModel";

/* -------------------------------------------------------------------------- */
/* 🧠 Type Guard: model has `schema`                                          */
/* -------------------------------------------------------------------------- */
function hasSchema<T extends { schema?: Record<string, SchemaField> }>(
  modelCtor: unknown
): modelCtor is T & { schema: Record<string, SchemaField> } {
  return (
    typeof modelCtor === "function" &&
    Object.prototype.hasOwnProperty.call(modelCtor, "schema")
  );
}

/* -------------------------------------------------------------------------- */
/* 🔍 Relation Extraction                                                     */
/* -------------------------------------------------------------------------- */
interface RelationLink {
  from: string;
  to: string;
  rel: string;
}

function collectLinks(factoryNames: string[]): RelationLink[] {
  const links: RelationLink[] = [];

  for (const factoryName of factoryNames) {
    const factory = FactoryRegistry.make(factoryName);
    const modelCtor = factory.model;
    const modelName = modelCtor.name.replace("Factory", "");

    const modelInstance = new modelCtor();

    if (!hasSchema(modelInstance.constructor)) continue;

    const schema = modelInstance.constructor.schema;

    for (const field of Object.values(schema)) {
      if (field.kind !== "relation") continue;

      const rel = field as RelationDefinition;
      links.push({
        from: modelName,
        to: rel.model,
        rel: rel.relation,
      });
    }
  }

  return links;
}

/* -------------------------------------------------------------------------- */
/* 🔄 Remove mirrored duplicate relations                                     */
/* -------------------------------------------------------------------------- */
function dedupeLinks(links: RelationLink[]): RelationLink[] {
  return links.filter(
    (link, index, array) =>
      index ===
      array.findIndex(
        (l) =>
          (l.from === link.from && l.to === link.to) ||
          (l.from === link.to && l.to === link.from)
      )
  );
}

/* -------------------------------------------------------------------------- */
/* 🎨 Map relation type → ASCII arrow                                        */
/* -------------------------------------------------------------------------- */
function getArrow(rel: string): string {
  switch (rel) {
    case "belongsTo":
      return chalk.blue("⇠");
    case "hasOne":
      return chalk.green("⇢");
    case "hasMany":
      return chalk.green("⇢⇢");
    case "belongsToMany":
      return chalk.magenta("⇿");
    default:
      return rel.startsWith("morph") ? chalk.yellow("≈") : "→";
  }
}

/* -------------------------------------------------------------------------- */
/* 📊 Graph Renderer                                                          */
/* -------------------------------------------------------------------------- */
export function generateFactoryGraph(factoryNames: string[]): string {
  let output = chalk.cyanBright("\n📊 Model Relationship Graph\n\n");

  if (factoryNames.length === 0) {
    return output + chalk.gray("No factories registered.\n");
  }

  const rawLinks = collectLinks(factoryNames);
  const uniqueLinks = dedupeLinks(rawLinks);

  if (uniqueLinks.length === 0) {
    return output + chalk.gray("No relationships detected.\n");
  }

  // Group links by originating model
  const grouped = new Map<string, Array<{ to: string; rel: string }>>();

  for (const { from, to, rel } of uniqueLinks) {
    if (!grouped.has(from)) grouped.set(from, []);
    grouped.get(from)!.push({ to, rel });
  }

  for (const [node, relations] of grouped.entries()) {
    output += chalk.greenBright(`${node}\n`);
    for (const { to, rel } of relations) {
      output += `${chalk.gray("  " + getArrow(rel) + " ")}${chalk.cyan(to)} ${chalk.gray(
        `(${rel})`
      )}\n`;
    }
    output += "\n";
  }

  return output;
}
