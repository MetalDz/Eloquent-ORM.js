// src/core/model/BaseModel.ts
import { CoreModel } from "./CoreModel";
import { PivotHelperMixin } from "../orm/mixins/PivotHelperMixin";
import { CastsMixin } from "../orm/mixins/CastsMixin";
import { SoftDeletesMixin } from "../orm/mixins/SoftDeletesMixin";
import { ScopeMixin } from "../orm/mixins/ScopeMixin";
import { HooksMixin } from "../orm/mixins/HooksMixin";
import { EagerLoadingMixin } from "../orm/mixins/EagerLoadingMixin";
import { QueryCacheMixin } from "../orm/mixins/QueryCacheMixin"; // 🧠 add this line

type ModelBaseContract = new (...args: any[]) => {
  tableName: string;
  connectionName: string;
  getDB(): Promise<any>;
  create(data: Record<string, any>): Promise<any>;
  update(id: string | number, data: Record<string, any>, pk?: string): Promise<void>;
  delete(id: string | number, pk?: string): Promise<void>;
  find(id: string | number, pk?: string): Promise<any>;
  all(): Promise<any[]>;
};

export class BaseModel extends EagerLoadingMixin(
  QueryCacheMixin( // 🧠 insert caching layer here
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
) {}
