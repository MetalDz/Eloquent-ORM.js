// src/model/BaseModel.ts
import { CoreModel } from "./CoreModel";
import { PivotHelperMixin } from "../orm/mixins/PivotHelperMixin";
import { CastsMixin } from "../orm/mixins/CastsMixin";
import { SoftDeletesMixin } from "../orm/mixins/SoftDeletesMixin";
import { ScopeMixin } from "../orm/mixins/ScopeMixin";
import { HooksMixin } from "../orm/mixins/HooksMixin";
import { QueryCacheMixin } from "../orm/mixins/QueryCacheMixin";
import { EagerLoadingMixin } from "../orm/mixins/EagerLoadingMixin";

// Morph system (re-export convenience)
import { MorphableMixin, MorphableBaseModel } from "../orm/mixins/MorphableMixin";
import { MorphRegistry } from "../orm/mixins/MorphRegistry";

/**
 * Shared record interface for all models
 */
export interface ORMRecord {
  [key: string]: unknown;
}

/**
 * Unified constructor helper used for casting the seed CoreModel
 */
export type AbstractConstructor<T = object> = abstract new (...args: any[]) => T;

/**
 * ORMCoreContract mirrors CoreModel's public instance API.
 * Note: getDB returns Promise<unknown> to match CoreModel's current signature.
 */
export interface ORMCoreContract {
  tableName: string;
  connectionName: string;
  getDB(): Promise<unknown>;

  create(data: ORMRecord): Promise<unknown | null>;
  update(id: string | number, data: ORMRecord, pk?: string): Promise<void>;
  delete(id: string | number, pk?: string): Promise<void>;
  find(id: string | number, pk?: string): Promise<unknown | null>;
  all(): Promise<unknown[]>;
}

/**
 * Compose mixins in dependency-safe order:
 * CoreModel -> Morphable -> PivotHelper -> Casts -> SoftDeletes -> Scope -> Hooks -> QueryCache -> EagerLoading
 *
 * We cast CoreModel to AbstractConstructor<ORMCoreContract> as the composition seed so
 * TypeScript understands the initial shape we're building on top of.
 */
const MorphableSeed = MorphableMixin(
  CoreModel as unknown as AbstractConstructor<ORMCoreContract>
);

const ComposedModel = EagerLoadingMixin(
  QueryCacheMixin(
    HooksMixin(
      ScopeMixin(
        SoftDeletesMixin(
          CastsMixin(PivotHelperMixin(MorphableSeed))
        )
      )
    )
  )
);

/**
 * BaseModel
 * The central abstract model class your application models should extend.
 */
export abstract class BaseModel extends ComposedModel {
  [key: string]: unknown; // allow dynamic fields for serialization, casts, etc.

  constructor(...args: any[]) {
    super(...args);
  }

  /**
   * Instance-level morph alias lookup (like Laravel's getMorphClass)
   */
  getMorphClass(): string {
    const entries = Object.entries(MorphRegistry.list());
    const entry = entries.find(([, name]) => name === this.constructor.name);
    return entry ? entry[0] : this.constructor.name;
  }

  /**
   * Static-level morph alias lookup
   * Example: `static morphAlias = 'posts'`
   */
  static getMorphClass(): string {
    const self = this as unknown as { morphAlias?: string; name: string };
    if (self.morphAlias) return self.morphAlias;

    const entries = Object.entries(MorphRegistry.list());
    const entry = entries.find(([, name]) => name === this.name);
    return entry ? entry[0] : this.name;
  }
}

/**
 * Re-export morph helpers for convenience
 */
export { MorphableMixin, MorphableBaseModel, MorphRegistry };
