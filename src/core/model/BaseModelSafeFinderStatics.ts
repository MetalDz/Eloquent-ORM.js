import { CoreModel } from "./CoreModel";
import type {
  SafeFinderDirection,
  SafeFinderFilters,
  SafeFinderModelInstance,
  SafeFinderQuery,
} from "./SafeFinder";

type AbstractConstructor<T = object> = abstract new (...args: any[]) => T;

export function BaseModelSafeFinderStaticsMixin<
  TBase extends AbstractConstructor<SafeFinderModelInstance>,
>(
  Base: TBase,
) {
  abstract class BaseModelSafeFinderStatics extends Base {
    static create(
      this: new (...args: any[]) => SafeFinderModelInstance,
      data: Record<string, unknown>,
    ): Promise<SafeFinderModelInstance | null> {
      const instance = new this() as SafeFinderModelInstance & {
        create(payload: Record<string, unknown>): Promise<SafeFinderModelInstance | null>;
      };
      return instance.create(data);
    }

    static async createMany(
      this: new (...args: any[]) => SafeFinderModelInstance,
      rows: Record<string, unknown>[],
    ): Promise<SafeFinderModelInstance[]> {
      return (CoreModel.createMany as any).call(this, rows);
    }

    static find(
      this: new (...args: any[]) => SafeFinderModelInstance,
      id: number | string,
      pk: string = "id",
    ): Promise<SafeFinderModelInstance | null> {
      const instance = new this() as SafeFinderModelInstance & {
        find(value: number | string, key?: string): Promise<SafeFinderModelInstance | null>;
      };
      return instance.find(id, pk);
    }

    static updateById(
      this: new (...args: any[]) => SafeFinderModelInstance,
      id: number | string,
      data: Record<string, unknown>,
      pk: string = "id",
    ): Promise<void> {
      const instance = new this() as SafeFinderModelInstance & {
        update(value: number | string, payload: Record<string, unknown>, key?: string): Promise<void>;
      };
      return instance.update(id, data, pk);
    }

    static updateMany(
      this: new (...args: any[]) => SafeFinderModelInstance,
      ids: Array<number | string>,
      data: Record<string, unknown>,
      pk: string = "id",
    ): Promise<void> {
      return (CoreModel.updateMany as any).call(this, ids, data, pk);
    }

    static patchMany(
      this: new (...args: any[]) => SafeFinderModelInstance,
      rows: Record<string, unknown>[],
      pk: string = "id",
    ): Promise<void> {
      return (CoreModel.patchMany as any).call(this, rows, pk);
    }

    static deleteById(
      this: new (...args: any[]) => SafeFinderModelInstance,
      id: number | string,
      pk: string = "id",
    ): Promise<void> {
      const instance = new this() as SafeFinderModelInstance & {
        delete(value: number | string, key?: string): Promise<void>;
      };
      return instance.delete(id, pk);
    }

    static deleteMany(
      this: new (...args: any[]) => SafeFinderModelInstance,
      ids: Array<number | string>,
      pk: string = "id",
    ): Promise<void> {
      return (CoreModel.deleteMany as any).call(this, ids, pk);
    }

    static restoreById(
      this: new (...args: any[]) => SafeFinderModelInstance,
      id: number | string,
      pk: string = "id",
    ): Promise<void> {
      const instance = new this() as SafeFinderModelInstance & {
        restore?: (value: number | string, key?: string) => Promise<void>;
      };

      if (typeof instance.restore !== "function") {
        return Promise.reject(
          new Error(`${this.name || "Model"} does not support restoreById().`)
        );
      }

      return instance.restore(id, pk);
    }

    static restoreMany(
      this: new (...args: any[]) => SafeFinderModelInstance,
      ids: Array<number | string>,
      pk: string = "id",
    ): Promise<void> {
      return (CoreModel.restoreMany as any).call(this, ids, pk);
    }

    static where<T extends typeof BaseModelSafeFinderStatics>(
      this: T,
      field: string,
      value: unknown,
    ): SafeFinderQuery<InstanceType<T>> {
      return (CoreModel.where as any).call(this, field, value);
    }

    static with<T extends typeof BaseModelSafeFinderStatics>(
      this: T,
      ...relations: string[]
    ): SafeFinderQuery<InstanceType<T>> {
      return (CoreModel.with as any).call(this, ...relations);
    }

    static active<T extends typeof BaseModelSafeFinderStatics>(
      this: T,
      ...args: unknown[]
    ): SafeFinderQuery<InstanceType<T>> {
      return (CoreModel.active as any).call(this, ...args);
    }

    static inactive<T extends typeof BaseModelSafeFinderStatics>(
      this: T,
      ...args: unknown[]
    ): SafeFinderQuery<InstanceType<T>> {
      return (CoreModel.inactive as any).call(this, ...args);
    }

    static published<T extends typeof BaseModelSafeFinderStatics>(
      this: T,
      ...args: unknown[]
    ): SafeFinderQuery<InstanceType<T>> {
      return (CoreModel.published as any).call(this, ...args);
    }

    static orderBy<T extends typeof BaseModelSafeFinderStatics>(
      this: T,
      field: string,
      direction: SafeFinderDirection = "asc",
    ): SafeFinderQuery<InstanceType<T>> {
      return (CoreModel.orderBy as any).call(this, field, direction);
    }

    static limit<T extends typeof BaseModelSafeFinderStatics>(
      this: T,
      count: number,
    ): SafeFinderQuery<InstanceType<T>> {
      return (CoreModel.limit as any).call(this, count);
    }

    static get<T extends typeof BaseModelSafeFinderStatics>(
      this: T,
    ): Promise<InstanceType<T>[]> {
      return (CoreModel.get as any).call(this);
    }

    static first<T extends typeof BaseModelSafeFinderStatics>(
      this: T,
    ): Promise<InstanceType<T> | null> {
      return (CoreModel.first as any).call(this);
    }

    static findBy<T extends typeof BaseModelSafeFinderStatics>(
      this: T,
      field: string,
      value: unknown,
    ): SafeFinderQuery<InstanceType<T>> {
      return (CoreModel.findBy as any).call(this, field, value);
    }

    static findOneBy<T extends typeof BaseModelSafeFinderStatics>(
      this: T,
      field: string,
      value: unknown,
    ): Promise<InstanceType<T> | null> {
      return (CoreModel.findOneBy as any).call(this, field, value);
    }

    static findAllBy<T extends typeof BaseModelSafeFinderStatics>(
      this: T,
      filters: SafeFinderFilters,
    ): Promise<InstanceType<T>[]> {
      return (CoreModel.findAllBy as any).call(this, filters);
    }

    static existsBy<T extends typeof BaseModelSafeFinderStatics>(
      this: T,
      filters: SafeFinderFilters,
    ): Promise<boolean> {
      return (CoreModel.existsBy as any).call(this, filters);
    }
  }

  return BaseModelSafeFinderStatics;
}
