import chalk from "chalk";
import type { RelationDefinition } from "../../../core/schema/SchemaBlueprint.js";

export const FACTORY_EMPTY_MARK = "-";
export const FACTORY_STATUS_FOOTER =
  "\nUse factories directly via FactoryRegistry.make(<name>)\n";
export const FACTORY_GRAPH_HEADER = "\nModel Relationship Graph\n\n";

export function getFactoryRelationArrow(
  relation: RelationDefinition["relation"] | string
): string {
  switch (relation) {
    case "belongsTo":
      return chalk.blue("<-");
    case "hasOne":
      return chalk.green("->");
    case "hasMany":
      return chalk.green("->>");
    case "belongsToMany":
      return chalk.magenta("<->");
    default:
      return relation.startsWith("morph") ? chalk.yellow("~>") : "->";
  }
}
