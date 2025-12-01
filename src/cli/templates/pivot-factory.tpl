import { Factory } from "../utils/Factory"
import { BaseModel } from "../../core/model/BaseModel"
import { PivotHelperMixin } from "../../orm/mixins/PivotHelperMixin"

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
   */
  model = PivotHelperMixin(BaseModel)

  /**
   * Define base pivot structure — usually empty defaults.
   */
  definition() {
    return {
      {{foreignKey}}: null,
      {{relatedKey}}: null,
    }
  }

  /**
   * 🧬 Create pivot records
   * 
   * Attaches related records to the pivot table.
   *
   * @param foreignId - The ID of the parent model (left side)
   * @param relatedIds - Array of related model IDs (right side)
   */
  async createPivot(
    foreignId: string | number,
    relatedIds: Array<string | number>
  ): Promise<void> {
    // Instantiate a pivot helper model
    const PivotModel = this.model as unknown as new () => InstanceType<typeof BaseModel> &
      PivotHelperMixin<BaseModel>

    const pivotInstance = new PivotModel()

    await pivotInstance.attach(
      "{{pivotTable}}",
      "{{foreignKey}}",
      "{{relatedKey}}",
      foreignId,
      relatedIds
    )
  }
}
