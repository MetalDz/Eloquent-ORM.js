import path from "path";
import fs from "fs";
import type {
  SchemaField,
  ColumnDefinition,
  RelationDefinition,
  MixinDefinition,
  RelationType,
} from "../../core/schema/SchemaBlueprint";

/**
 * 🧩 Introspected model metadata
 */
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

/**
 * Generic constructor type
 */
export type AbstractConstructor<T = object> = abstract new (...args: unknown[]) => T;

/**
 * 🧠 ModelIntrospector
 * Reads model schema, relations, and feature flags directly from EloquentJS models.
 * Fully typed — no `any` usage.
 */
export class ModelIntrospector {
  /**
   * Analyze a model and extract schema information.
   */
  static async analyze(modelName: string): Promise<{
    fields: IntrospectedField[];
    relations: IntrospectedRelation[];
    features: ModelFeatures;
  }> {
    const modelPath = path.resolve(process.cwd(), `src/app/models/${modelName}.ts`);

    if (!fs.existsSync(modelPath)) {
      throw new Error(`❌ Model file not found: ${modelPath}`);
    }

    const importedModule = (await import(modelPath)) as Record<string, unknown>;
    const ModelClass = importedModule[modelName] as AbstractConstructor & {
      schema?: Record<string, SchemaField>;
      timestamps?: boolean;
      softDeletes?: boolean;
      morphAlias?: string;
    };

    if (!ModelClass) {
      throw new Error(`❌ Could not load model class: ${modelName}`);
    }

    const schema: Record<string, SchemaField> = ModelClass.schema ?? {};
    const fields: IntrospectedField[] = [];
    const relations: IntrospectedRelation[] = [];

    for (const [key, field] of Object.entries(schema)) {
      if (field.kind === "column") {
        const col = field as ColumnDefinition;
        if (
          !col.options?.primary &&
          !["id", "created_at", "updated_at", "deleted_at"].includes(key)
        ) {
          fields.push({ name: key, type: col.type });
        }
      } else if (field.kind === "relation") {
        const rel = field as RelationDefinition;
        const isPivot = rel.relation === "belongsToMany";
        const isMorph =
          rel.relation === "morphOne" ||
          rel.relation === "morphMany" ||
          rel.relation === "morphTo";

        relations.push({
          name: key,
          type: rel.relation,
          target: rel.model,
          pivotTable: rel.options?.pivotTable,
          morphName: rel.options?.morphName,
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

  /**
   * Extract mixin names from schema if defined.
   */
  private static extractMixins(schema: Record<string, SchemaField>): string[] {
    return Object.values(schema)
      .filter((f): f is MixinDefinition => f.kind === "mixin")
      .map((m) => m.name);
  }
}
