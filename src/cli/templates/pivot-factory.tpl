import { Factory } from "../../../cli/utils/factories/Factory";
import { BaseModel } from "../../../core/model/BaseModel";
import { PivotHelperMixin } from "../../../core/orm/mixins/PivotHelperMixin";

/**
 * 🧩 Auto-generated Pivot Factory
 * Handles many-to-many pivot table operations.
 *
 * Table: {{pivotTable}}
 * Generated for relation between {{foreignKey}} ↔ {{relatedKey}}
 */
export class {{PivotFactoryName}} extends Factory<BaseModel> {
  /**
   * Model instance using PivotHelperMixin for pivot operations.
   * Marked readonly to indicate the factory won't reassign it.
   */
  readonly model = PivotHelperMixin(BaseModel);

  definition(): Partial<Record<string, unknown>> {
    return {
      {{foreignKey}}: null,
      {{relatedKey}}: null,
    };
  }

  /**
   * Attach related IDs to the pivot.
   * Accepts arrays or any iterable for flexibility.
   */
  async createPivot(
    foreignId: string | number,
    relatedIds: Iterable<string | number>,
    extraPivotAttrs?: Record<string, unknown>
  ): Promise<void> {
    type PivotInstanceLike = {
      attach?: (
        pivotTable: string,
        foreignKey: string,
        relatedKey: string,
        foreignId: string | number,
        relatedIds: Array<string | number>,
        extra?: Record<string, unknown> | undefined
      ) => Promise<void>;
      attachMany?: (entries: Array<Record<string, unknown>>) => Promise<void>;
      withTransaction?: <R>(fn: () => Promise<R>) => Promise<R>;
    };

    const PivotCtor = this.model as unknown as new () => PivotInstanceLike;
    const pivotInstance = new PivotCtor();

    // normalize iterable -> array
    const relatedArray = Array.from(relatedIds);

    // prefer attachMany if available (faster), else use attach
    try {
      if (typeof pivotInstance.attachMany === "function") {
        const entries = relatedArray.map((rid) => ({
          ["{{foreignKey}}"]: foreignId,
          ["{{relatedKey}}"]: rid,
          ...(extraPivotAttrs ?? {}),
        }));
        await pivotInstance.attachMany(entries);
      } else if (typeof pivotInstance.attach === "function") {
        if (typeof pivotInstance.withTransaction === "function") {
          await pivotInstance.withTransaction(async () => {
            await pivotInstance.attach(
              "{{pivotTable}}",
              "{{foreignKey}}",
              "{{relatedKey}}",
              foreignId,
              relatedArray,
              extraPivotAttrs
            );
          });
        } else {
          await pivotInstance.attach(
            "{{pivotTable}}",
            "{{foreignKey}}",
            "{{relatedKey}}",
            foreignId,
            relatedArray,
            extraPivotAttrs
          );
        }
      } else {
        throw new Error("PivotHelperMixin does not expose attach/attachMany API.");
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[pivot-factory] Failed to attach pivot rows for ${foreignId} -> ${relatedArray}:`, err);
      throw err;
    }
  }
}
