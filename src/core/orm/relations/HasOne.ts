import { Relation } from "../Relation";

export class HasOne extends Relation {
  async getResults(parent: any): Promise<any> {
    const relatedInstance = new this.relatedModel();
    return await relatedInstance.find(parent[this.localKey], this.foreignKey);
  }
}
