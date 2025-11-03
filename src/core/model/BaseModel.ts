// src/core/model/BaseModel.ts
import { CoreModel } from "./CoreModel";
import { PivotHelperMixin } from "../orm/mixins/PivotHelperMixin";
import { CastsMixin } from "../orm/mixins/CastsMixin";
import { SoftDeletesMixin } from "../orm/mixins/SoftDeletesMixin";
import { ScopeMixin } from "../orm/mixins/ScopeMixin";
import { HooksMixin } from "../orm/mixins/HooksMixin";
import { EagerLoadingMixin } from "../orm/mixins/EagerLoadingMixin";
import { QueryCacheMixin } from "../orm/mixins/QueryCacheMixin";

// 🧩 New Morph System Imports
import { MorphableMixin, MorphableBaseModel } from "../orm/mixins/MorphableMixin";
import { MorphRegistry } from "../orm/mixins/MorphRegistry";

/**
 * 🧱 BaseModel Layer
 * Combines all ORM mixins in the proper order:
 * CoreModel → PivotHelper → Casts → SoftDeletes → Scope → Hooks → QueryCache → EagerLoading
 */
type ModelBaseContract = new (...args: any[]) => {
  tableName: string;
  connectionName: string;
  getDB(): Promise<unknown>;
  create(data: Record<string, unknown>): Promise<unknown>;
  update(id: string | number, data: Record<string, unknown>, pk?: string): Promise<void>;
  delete(id: string | number, pk?: string): Promise<void>;
  find(id: string | number, pk?: string): Promise<unknown>;
  all(): Promise<unknown[]>;
};

// 🧠 Compose mixins in dependency-safe order
export class BaseModel extends EagerLoadingMixin(
  QueryCacheMixin(
    HooksMixin(
      ScopeMixin(
        SoftDeletesMixin(
          CastsMixin(
            PivotHelperMixin(CoreModel as unknown as ModelBaseContract)
          )
        )
      )
    )
  )
) {
  /** 
   * Returns the morph alias for this model.
   * Works like Laravel's Model::getMorphClass().
   * If the model is registered in MorphRegistry, return its key.
   * Otherwise fallback to the class name.
   */
  getMorphClass(): string {
    // Look through MorphRegistry to see if this model was registered under an alias
    const entries = Object.entries(MorphRegistry.list());
    const entry = entries.find(([, name]) => name === this.constructor.name);
    return entry ? entry[0] : this.constructor.name;
  }

  /** 
   * Returns the static morph alias if declared directly on the model class.
   * Example: static morphAlias = 'posts'
   */
  static getMorphClass(): string {
    const self = this as unknown as { morphAlias?: string };
    if (self.morphAlias) return self.morphAlias;

    const entries = Object.entries(MorphRegistry.list());
    const entry = entries.find(([, name]) => name === this.name);
    return entry ? entry[0] : this.name;
  }
}
// 🧩 Re-export Morph System for cleaner model imports
export { MorphableMixin, MorphableBaseModel, MorphRegistry };


