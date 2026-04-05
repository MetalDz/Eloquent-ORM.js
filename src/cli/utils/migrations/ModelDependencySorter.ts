import type {
  ModelDatabaseDefinition,
  SchemaField,
} from "../../../core/schema/SchemaBlueprint.js";

type SchemaRelation = {
  kind?: string;
  relation?: string;
  model?: string;
};

export type DependencySortableModel = {
  modelClassName: string;
  ModelClass: {
    schema: Record<string, SchemaField>;
    database?: ModelDatabaseDefinition;
    tableName: string;
  };
};

function getModelDependencies<T extends DependencySortableModel>(
  model: T,
  modelsByName: Map<string, T>,
  modelNameByTableName: Map<string, string>
): string[] {
  const deps = new Set<string>();
  for (const value of Object.values(model.ModelClass.schema)) {
    if (!value || typeof value !== "object") continue;

    const relation = value as SchemaRelation;
    if (relation.kind !== "relation" || relation.relation !== "belongsTo") continue;
    if (!relation.model || !modelsByName.has(relation.model)) continue;
    deps.add(relation.model);
  }

  for (const foreignKey of model.ModelClass.database?.foreignKeys ?? []) {
    const dependency = modelNameByTableName.get(foreignKey.references.table);
    if (!dependency || dependency === model.modelClassName) continue;
    deps.add(dependency);
  }

  return [...deps];
}

export function sortModelsByDependencies<T extends DependencySortableModel>(models: T[]): T[] {
  const byName = new Map(models.map((item) => [item.modelClassName, item]));
  const modelNameByTableName = new Map(
    models.map((item) => [item.ModelClass.tableName, item.modelClassName])
  );
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const ordered: T[] = [];

  const visit = (modelName: string): void => {
    if (visited.has(modelName)) return;
    if (visiting.has(modelName)) return;

    visiting.add(modelName);
    const model = byName.get(modelName)!;
    const dependencies = getModelDependencies(model, byName, modelNameByTableName);
    for (const dependency of dependencies) {
      visit(dependency);
    }
    ordered.push(model);
    visiting.delete(modelName);
    visited.add(modelName);
  };

  for (const model of models) {
    visit(model.modelClassName);
  }

  return ordered;
}
