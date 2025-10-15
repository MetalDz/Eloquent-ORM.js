import { DataSource } from "typeorm";
import { Model } from "../Model";

export class HasMany<T extends Model> {
  constructor(
    private related: new () => T,
    private foreignKey: string,
    private localKey: string
  ) {}

  async get(parent: Model): Promise<T[]> {
    const relatedInstance = new this.related();
    const repo = relatedInstance.repository();
    return repo.find({
      where: { [this.foreignKey]: (parent as any)[this.localKey] },
    });
  }
}
