import { CoreModel, ModelBaseContract } from "./CoreModel";
import { EagerLoadingMixin } from "../orm/mixins/EagerLoadingMixin";
import { HooksMixin } from "../orm/mixins/HooksMixin";
import { SoftDeletesMixin } from "../orm/mixins/SoftDeletesMixin";
import { ScopeMixin } from "../orm/mixins/ScopeMixin";
import { CastsMixin } from "../orm/mixins/CastsMixin";
import { SerializeMixin } from "../orm/mixins/SerializeMixin";

export class BaseModel extends SerializeMixin(
  CastsMixin(
    ScopeMixin(
      SoftDeletesMixin(
        HooksMixin(
          EagerLoadingMixin(CoreModel as unknown as ModelBaseContract)
        )
      )
    )
  )
) {}
