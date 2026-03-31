import path from "path";
import fs from "fs";
import { PathMap } from "./PathMap.js";
import { loadModule } from "./typescript/tsRuntime.js";
import type {
  SchemaField,
  ColumnDefinition,
  RelationDefinition,
  MixinDefinition,
  RelationType,
} from "../../core/schema/SchemaBlueprint.js";

export interface IntrospectedField {
  name: string;
  type: string;
}

export interface IntrospectedRelation {
  name: string;
  type: RelationType;
  target: string;
  pivotTable?: string;
  morphName?: string;
  isPivot?: boolean;
  isMorph?: boolean;
}

export interface ModelFeatures {
  hasTimestamps: boolean;
  hasSoftDeletes: boolean;
  isMorphable: boolean;
  mixins?: string[];
}

export type AbstractConstructor<T = object> = abstract new (...args: unknown[]) => T;

export class ModelIntrospector {
  static async analyze(
    modelName: string,
    options: { test?: boolean } = {}
  ): Promise<{
    fields: IntrospectedField[];
    relations: IntrospectedRelation[];
    features: ModelFeatures;
  }> {
    const modelsDir = PathMap.models(!!options.test);
    const modelPath = path.resolve(modelsDir, `${modelName}.ts`);

    if (!fs.existsSync(modelPath)) {
      throw new Error(`Model file not found: ${modelPath}`);
    }

    this.clearModelModuleCache(modelPath);
    const importedModule = loadModule(modelPath);
    const ModelClass = importedModule[modelName] as AbstractConstructor & {
      schema?: Record<string, SchemaField>;
      timestamps?: boolean;
      softDeletes?: boolean;
      morphAlias?: string;
    };

    if (!ModelClass) {
      throw new Error(`Could not load model class: ${modelName}`);
    }

    const schema: Record<string, SchemaField> = ModelClass.schema ?? {};
    const fields: IntrospectedField[] = [];
    const relations: IntrospectedRelation[] = [];

    for (const [key, field] of Object.entries(schema)) {
      if (field.kind === "column") {
        const column = field as ColumnDefinition;
        if (
          !column.options?.primary &&
          !["id", "created_at", "updated_at", "deleted_at"].includes(key)
        ) {
          fields.push({ name: key, type: column.type });
        }
        continue;
      }

      if (field.kind === "relation") {
        const relation = field as RelationDefinition;
        const isPivot = relation.relation === "belongsToMany";
        const isMorph =
          relation.relation === "morphOne" ||
          relation.relation === "morphMany" ||
          relation.relation === "morphTo";

        relations.push({
          name: key,
          type: relation.relation,
          target: relation.model,
          pivotTable: relation.options?.pivotTable,
          morphName: relation.options?.morphName,
          isPivot,
          isMorph,
        });
      }
    }

    const features: ModelFeatures = {
      hasTimestamps: Boolean(ModelClass.timestamps),
      hasSoftDeletes: Boolean(ModelClass.softDeletes),
      isMorphable: Boolean(ModelClass.morphAlias),
      mixins: this.extractMixins(schema),
    };

    return { fields, relations, features };
  }

  private static clearModelModuleCache(modelPath: string): void {
    try {
      delete require.cache[require.resolve(modelPath)];
    } catch {
      // Ignore cache misses; loadModule() will still read the current file.
    }
  }

  private static extractMixins(schema: Record<string, SchemaField>): string[] {
    return Object.values(schema)
      .filter((field): field is MixinDefinition => field.kind === "mixin")
      .map((mixin) => mixin.name);
  }
}
