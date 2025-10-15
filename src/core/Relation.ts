import { DatabaseConnection } from "./connection/DatabaseConnection";

export abstract class Relation {
  protected relatedModel: any;
  protected foreignKey: string;
  protected localKey: string;

  constructor(relatedModel: any, foreignKey: string, localKey: string) {
    this.relatedModel = relatedModel;
    this.foreignKey = foreignKey;
    this.localKey = localKey;
  }

  abstract getResults(parent: any): Promise<any>;
}
