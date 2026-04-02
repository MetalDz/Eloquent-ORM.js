import { createRequire } from "node:module";

import type { BaseModel } from "../dist/core/model/BaseModel.js";
import type {
  FactoryCtor,
  InstanceCreatable,
  InstanceSavable,
  ModelCtor,
  PlainObject,
  StaticCreatableCtor,
} from "../dist/cli/utils/factories/Factory.js";

export type {
  FactoryCtor,
  ModelCtor,
  PlainObject,
} from "../dist/cli/utils/factories/Factory.js";

const require = createRequire(import.meta.url);

let cachedFaker: typeof import("@faker-js/faker").faker | undefined;

function getFaker(): typeof import("@faker-js/faker").faker {
  if (!cachedFaker) {
    cachedFaker = require("@faker-js/faker").faker as typeof import("@faker-js/faker").faker;
  }

  return cachedFaker;
}

export abstract class Factory<T extends BaseModel> {
  abstract model: ModelCtor<T>;

  protected get faker(): typeof import("@faker-js/faker").faker {
    return getFaker();
  }

  abstract definition(index?: number): PlainObject;

  async beforeCreate?(attrs: Partial<T>, index: number): Promise<Partial<T> | void>;
  async afterCreate?(instance: T): Promise<void>;

  async create(attrs: Partial<T> = {}, index = 0): Promise<T> {
    const base = this.definition(index);
    const merged: PlainObject = { ...base, ...attrs };

    if (this.beforeCreate) {
      const modified = await this.beforeCreate(merged as Partial<T>, index);
      if (modified && typeof modified === "object") {
        Object.assign(merged, modified);
      }
    }

    let instance: T = new this.model();

    if (this.hasInstanceCreate(instance)) {
      const created = await instance.create(merged);
      if (created) {
        instance = created as T;
      }
    }
    else if (this.hasStaticCreate(this.model)) {
      return this.model.create(merged);
    }
    else if (this.hasInstanceSave(instance)) {
      Object.assign(instance, merged);
      await instance.save();
    }
    else {
      throw new Error(`Model '${this.model.name}' has no valid create/save method.`);
    }

    if (this.afterCreate) {
      await this.afterCreate(instance);
    }

    return instance;
  }

  async createMany(
    count: number,
    callback?: (model: T, index: number) => void | Promise<void>,
    concurrency = 1
  ): Promise<T[]> {
    const results: T[] = [];

    const executeCreate = async (itemIndex: number) => {
      const model = await this.create({}, itemIndex);
      if (callback) {
        await callback(model, itemIndex);
      }
      results[itemIndex] = model;
    };

    if (concurrency <= 1) {
      for (let itemIndex = 0; itemIndex < count; itemIndex += 1) {
        await executeCreate(itemIndex);
      }
      return results;
    }

    let active = 0;
    let itemIndex = 0;
    let settled = false;

    return new Promise((resolve, reject) => {
      const maybeResolve = () => {
        if (!settled && itemIndex >= count && active === 0) {
          settled = true;
          resolve(results);
        }
      };

      const next = () => {
        if (settled) {
          return;
        }

        while (active < concurrency && itemIndex < count && !settled) {
          const currentIndex = itemIndex++;
          active += 1;

          void executeCreate(currentIndex)
            .catch((error: unknown) => {
              if (settled) {
                return;
              }
              settled = true;
              reject(error);
            })
            .finally(() => {
              active -= 1;
              if (settled) {
                return;
              }
              next();
            });
        }

        maybeResolve();
      };

      next();
    });
  }

  protected async related<K extends BaseModel>(
    factoryOrCtor: Factory<K> | FactoryCtor<K>,
    count = 1
  ): Promise<K | K[]> {
    const factory =
      typeof factoryOrCtor === "function"
        ? new factoryOrCtor()
        : factoryOrCtor;

    if (count === 1) {
      return factory.create();
    }

    return factory.createMany(count);
  }

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

    console.log(
      `[Pivot Attached] Table "${pivotTable}" (${foreignKey} -> ${relatedKey})`
    );
  }

  private hasInstanceCreate(obj: unknown): obj is InstanceCreatable {
    return typeof (obj as InstanceCreatable).create === "function";
  }

  private hasStaticCreate(ctor: unknown): ctor is StaticCreatableCtor<T> {
    return typeof (ctor as StaticCreatableCtor<T>).create === "function";
  }

  private hasInstanceSave(obj: unknown): obj is InstanceSavable {
    return typeof (obj as InstanceSavable).save === "function";
  }
}
