// src/cli/utils/factories/Factory.ts
import { faker } from "@faker-js/faker";
import { BaseModel } from "../../../core/model/BaseModel";

/**
 * Generic constructor helper
 */
type ModelCtor<T> = new (...args: unknown[]) => T;

/**
 * Utility type for plain object data
 */
type PlainObject = Record<string, unknown>;

/**
 * 🧩 Base Factory class
 * Shared by all generated model factories.
 */
export abstract class Factory<T extends BaseModel> {
  /** Model constructor reference */
  abstract model: ModelCtor<T>;

  /** Faker instance */
  protected faker = faker;

  /**
   * Define fake data structure
   */
  abstract definition(): PlainObject;

  /**
   * Optional lifecycle hooks
   */
  async beforeCreate?(attrs: Partial<T>): Promise<Partial<T>>;
  async afterCreate?(instance: T): Promise<void>;

  /**
   * Create a single record
   */
  async create(attrs: Partial<T> = {}): Promise<T> {
    const merged: PlainObject = { ...this.definition(), ...attrs };
    const model = new this.model() as T;

    if (this.beforeCreate) {
      const preprocessed = await this.beforeCreate(merged as Partial<T>);
      Object.assign(merged, preprocessed);
    }

    await model.create(merged);
    if (this.afterCreate) await this.afterCreate(model);
    return model;
  }

  /**
   * Create multiple records
   */
  async createMany(
    count: number,
    callback?: (model: T, index: number) => Promise<void> | void
  ): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < count; i++) {
      const instance = await this.create();
      if (callback) await callback(instance, i);
      results.push(instance);
    }
    return results;
  }

  /**
   * Simple password hashing helper
   */
  protected hash(value: string): string {
    return `hashed_${value}`;
  }

  /**
   * Helper for related factories (e.g. hasOne, belongsTo, etc.)
   */
  protected async related<K extends BaseModel>(factory: Factory<K>): Promise<K> {
    return await factory.create();
  }

  /**
   * 🔗 Helper for many-to-many pivot factories
   *
   * Automates creation of pivot records.
   *
   * @param factory - The pivot factory instance (e.g. UserRolePivotFactory)
   * @param pivotTable - The pivot table name
   * @param foreignKey - Foreign key column (e.g. "user_id")
   * @param relatedKey - Related key column (e.g. "role_id")
   * @param foreignId - ID of the source model
   * @param relatedIds - Array of related model IDs
   */
  protected async relatedPivot<K extends BaseModel>(
    factory: Factory<K> & {
      createPivot(
        foreignId: string | number,
        relatedIds: Array<string | number>
      ): Promise<void>;
    },
    pivotTable: string,
    foreignKey: string,
    relatedKey: string,
    foreignId: string | number,
    relatedIds: Array<string | number>
  ): Promise<void> {
    if (typeof factory.createPivot !== "function") {
      throw new Error(
        `❌ Factory ${factory.constructor.name} does not support pivot operations.`
      );
    }

    await factory.createPivot(foreignId, relatedIds);

    console.log(
      `🔗 [Pivot Attached] Table: ${pivotTable} (${foreignKey} → ${relatedKey})`
    );
  }
}
