/**
 * FactoryGraph
 * Generates an ASCII relationship graph from registered factories.
 */

import chalk from "chalk";
import type {
  RelationDefinition,
  SchemaField,
} from "../../../core/schema/SchemaBlueprint.js";
import {
  FACTORY_GRAPH_HEADER,
  getFactoryRelationArrow,
} from "./FactoryDisplay.js";
import { FactoryRegistry } from "./FactoryRegistry.js";

function hasSchema<T extends { schema?: Record<string, SchemaField> }>(
  modelCtor: unknown
): modelCtor is T & { schema: Record<string, SchemaField> } {
  return (
    typeof modelCtor === "function" &&
    Object.prototype.hasOwnProperty.call(modelCtor, "schema")
  );
}

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

    if (!hasSchema(modelInstance.constructor)) {
      continue;
    }

    for (const field of Object.values(modelInstance.constructor.schema)) {
      if (field.kind !== "relation") {
        continue;
      }

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

function dedupeLinks(links: RelationLink[]): RelationLink[] {
  return links.filter(
    (link, index, array) =>
      index ===
      array.findIndex(
        (candidate) =>
          (candidate.from === link.from && candidate.to === link.to) ||
          (candidate.from === link.to && candidate.to === link.from)
      )
  );
}

export function generateFactoryGraph(factoryNames: string[]): string {
  let output = chalk.cyanBright(FACTORY_GRAPH_HEADER);

  if (factoryNames.length === 0) {
    return output + chalk.gray("No factories registered.\n");
  }

  const uniqueLinks = dedupeLinks(collectLinks(factoryNames));

  if (uniqueLinks.length === 0) {
    return output + chalk.gray("No relationships detected.\n");
  }

  const grouped = new Map<string, Array<{ to: string; rel: string }>>();

  for (const { from, to, rel } of uniqueLinks) {
    if (!grouped.has(from)) {
      grouped.set(from, []);
    }
    grouped.get(from)!.push({ to, rel });
  }

  for (const [node, relations] of grouped.entries()) {
    output += chalk.greenBright(`${node}\n`);
    for (const { to, rel } of relations) {
      output += `${chalk.gray(`  ${getFactoryRelationArrow(rel)} `)}${chalk.cyan(
        to
      )} ${chalk.gray(`(${rel})`)}\n`;
    }
    output += "\n";
  }

  return output;
}
