// src/cli/utils/factories/Factory.ts
import { faker } from "@faker-js/faker";
import { BaseModel } from "../../../core/model/BaseModel.js";

/** Plain object for attributes */
export type PlainObject = Record<string, unknown>;

/** Constructor helper */
export type ModelCtor<T> = new (...args: unknown[]) => T;

/** Factory constructor type */
export type FactoryCtor<K extends BaseModel> = new () => Factory<K>;

/** Shape of models supporting instance create() */
export interface InstanceCreatable {
  create(data: PlainObject): Promise<void>;
}

/** Shape of models supporting instance save() */
export interface InstanceSavable {
  save(): Promise<void>;
}

/** Shape of static creatable constructors */
export interface StaticCreatableCtor<T> {
  create(data: PlainObject): Promise<T>;
}

/**
 * 🧩 Base Factory
 * Fully strict, no `any` used anywhere.
 */
export abstract class Factory<T extends BaseModel> {
  /** Model constructor reference */
  abstract model: ModelCtor<T>;

  /** Faker instance */
  protected faker = faker;

  /**
   * Must return fake attributes.
   * Index helps create sequences (createMany)
   */
  abstract definition(index?: number): PlainObject;

  /**
   * Optional hooks
   */
  async beforeCreate?(attrs: Partial<T>, index: number): Promise<Partial<T> | void>;
  async afterCreate?(instance: T): Promise<void>;

  /**
   * Create one record
   */
  async create(attrs: Partial<T> = {}, index = 0): Promise<T> {
    const base = this.definition(index);
    const merged: PlainObject = { ...base, ...attrs };

    if (this.beforeCreate) {
      const modified = await this.beforeCreate(merged as Partial<T>, index);
      if (modified && typeof modified === "object") {
        Object.assign(merged, modified);
      }
    }

    // Always instantiate the model
    let instance: T = new this.model();

    // Case 1: Instance has create()
    if (this.hasInstanceCreate(instance)) {
      const created = await instance.create(merged);
      if (created) {
        instance = created as T;
      }
    }
    // Case 2: Static create()
    else if (this.hasStaticCreate(this.model)) {
      const created = await this.model.create(merged);
      // if static create returns an instance, override
      return created;
    }
    // Case 3: Instance has save()
    else if (this.hasInstanceSave(instance)) {
      Object.assign(instance, merged);
      await instance.save();
    }
    else {
      throw new Error(
        `Model '${this.model.name}' has no valid create/save method.`
      );
    }

    if (this.afterCreate) {
      await this.afterCreate(instance);
    }

    return instance;
  }

  /**
   * 🔁 Create many with optional concurrency
   */
  async createMany(
    count: number,
    callback?: (model: T, index: number) => void | Promise<void>,
    concurrency = 1
  ): Promise<T[]> {
    const results: T[] = [];

    const executeCreate = async (i: number) => {
      const model = await this.create({}, i);
      if (callback) await callback(model, i);
      results[i] = model;
    };

    if (concurrency <= 1) {
      for (let i = 0; i < count; i++) {
        await executeCreate(i);
      }
      return results;
    }

    let active = 0;
    let index = 0;
    let settled = false;

    return new Promise((resolve, reject) => {
      const maybeResolve = () => {
        if (!settled && index >= count && active === 0) {
          settled = true;
          resolve(results);
        }
      };

      const next = () => {
        if (settled) return;

        while (active < concurrency && index < count && !settled) {
          const i = index++;
          active++;

          void executeCreate(i)
            .catch((err: unknown) => {
              if (settled) return;
              settled = true;
              reject(err);
            })
            .finally(() => {
              active--;
              if (settled) return;
              next();
            });
        }

        maybeResolve();
      };

      next();
    });
  }

  /**
   * Helper: create related records
   */
  protected async related<K extends BaseModel>(
    factoryOrCtor: Factory<K> | FactoryCtor<K>,
    count = 1
  ): Promise<K | K[]> {
    const factory =
      typeof factoryOrCtor === "function"
        ? new factoryOrCtor()
        : factoryOrCtor;

    if (count === 1) return factory.create();

    return factory.createMany(count);
  }

  /**
   * Helper: create pivot relations
   */
  protected async relatedPivot<K extends BaseModel>(
    factory: {
      createPivot: (
        foreignId: string | number,
        relatedIds: (string | number)[],
        extra?: Record<string, unknown>
      ) => Promise<void>;
    },
    pivotTable: string,
    foreignKey: string,
    relatedKey: string,
    foreignId: string | number,
    relatedIds: (string | number)[],
    extraPivotAttrs?: Record<string, unknown>
  ): Promise<void> {
    await factory.createPivot(foreignId, relatedIds, extraPivotAttrs);

    // eslint-disable-next-line no-console
    console.log(
      `🔗 [Pivot Attached] Table "${pivotTable}" (${foreignKey} → ${relatedKey})`
    );
  }

  //
  // 👇 Type Guards — STRICT, no any
  //

  private hasInstanceCreate(
    obj: unknown
  ): obj is InstanceCreatable {
    return typeof (obj as InstanceCreatable).create === "function";
  }

  private hasStaticCreate(
    ctor: unknown
  ): ctor is StaticCreatableCtor<T> {
    return typeof (ctor as StaticCreatableCtor<T>).create === "function";
  }

  private hasInstanceSave(
    obj: unknown
  ): obj is InstanceSavable {
    return typeof (obj as InstanceSavable).save === "function";
  }
}
