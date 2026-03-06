import { ModelRegistry, type ModelConstructor } from "./ModelRegistry";

export type LifecycleEvent =
  | "creating"
  | "created"
  | "updating"
  | "updated"
  | "deleting"
  | "deleted";

export type HookHandler<TPayload = unknown> = (payload: TPayload) => Promise<void> | void;

type HookBucket = Record<LifecycleEvent, HookHandler<unknown>[]>;

const EMPTY_HOOKS: HookBucket = {
  creating: [],
  created: [],
  updating: [],
  updated: [],
  deleting: [],
  deleted: [],
};

function makeHookBucket(): HookBucket {
  return {
    creating: [],
    created: [],
    updating: [],
    updated: [],
    deleting: [],
    deleted: [],
  };
}

/**
 * Internal hook storage bound to model constructors.
 * In strict mode, hook mutations are blocked for unregistered models.
 * In non-strict mode, models are granted lazily on first mutation.
 */
export class HookStore {
  private static store = new WeakMap<ModelConstructor, HookBucket>();

  static add<TPayload>(
    modelCtor: ModelConstructor,
    event: LifecycleEvent,
    handler: HookHandler<TPayload>
  ): void {
    ModelRegistry.ensureGranted(modelCtor, "registration");

    const bucket = this.ensureBucket(modelCtor);
    bucket[event].push(handler as HookHandler<unknown>);
  }

  static get(modelCtor: ModelConstructor, event: LifecycleEvent): HookHandler<unknown>[] {
    const bucket = this.store.get(modelCtor);
    if (!bucket) return [];
    return [...bucket[event]];
  }

  /**
   * Test helper. Clears one model bucket or all buckets.
   */
  static clear(modelCtor?: ModelConstructor): void {
    if (modelCtor) {
      this.store.delete(modelCtor);
      return;
    }
    this.store = new WeakMap<ModelConstructor, HookBucket>();
  }

  private static ensureBucket(modelCtor: ModelConstructor): HookBucket {
    const existing = this.store.get(modelCtor);
    if (existing) return existing;

    const bucket = makeHookBucket();
    this.store.set(modelCtor, bucket);
    return bucket;
  }

  /**
   * Debug/test snapshot only.
   */
  static snapshot(modelCtor: ModelConstructor): HookBucket {
    const bucket = this.store.get(modelCtor);
    if (!bucket) return makeHookBucket();

    return {
      creating: [...bucket.creating],
      created: [...bucket.created],
      updating: [...bucket.updating],
      updated: [...bucket.updated],
      deleting: [...bucket.deleting],
      deleted: [...bucket.deleted],
    };
  }
}

export { EMPTY_HOOKS, type HookBucket };
