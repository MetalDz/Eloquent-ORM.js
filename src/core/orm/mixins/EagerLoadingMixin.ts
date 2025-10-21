/**
 * 🧠 EagerLoadingMixin
 * Adds support for eager loading relations
 */
export function EagerLoadingMixin<
  TBase extends new (...args: any[]) => {
    find(id: number | string, pk?: string): Promise<any>;
    all(): Promise<any[]>;
  }
>(Base: TBase) {
  return class extends Base {
    protected eagerRelations: string[] = [];

    /**
     * Define which relations to eager load
     */
    with(...relations: string[]) {
      this.eagerRelations.push(...relations);
      return this;
    }

    /**
     * Load all relations for a single model
     */
    async load(...relations: string[]) {
      const rels = relations.length ? relations : this.eagerRelations;
      for (const relName of rels) {
        const relation = this.getRelation(relName);
        const result = await relation.getResults(this);
        (this as any)[relation.name ?? relName] = result;
      }
      return this;
    }

    /**
     * Get relation definition (throws if undefined)
     */
    protected getRelation(name: string) {
      const relationFn = (this as any)[name];
      if (typeof relationFn !== "function") {
        throw new Error(`Relation '${name}' is not defined on ${this.constructor.name}`);
      }
      return relationFn.call(this);
    }

    /**
     * Eager load all defined relations for a list of records
     */
    protected async eagerLoadRelations(records: any[]) {
      if (!this.eagerRelations.length || !records.length) return records;

      for (const relName of this.eagerRelations) {
        const [topLevel, ...nested] = relName.split(".");
        const relation = this.getRelation(topLevel);

        if (nested.length > 0) {
          await this.loadNestedRelations(records, relation, nested.join("."));
        } else {
          await relation.match(records);
        }
      }

      return records;
    }

    /**
     * Handle nested eager loading like user.posts.comments
     */
    private async loadNestedRelations(records: any[], relation: any, nestedPath: string) {
      await relation.match(records);
      const allRelated: any[] = [];

      for (const parent of records) {
        const related = (parent as any)[relation.name ?? "relation"];
        if (Array.isArray(related)) allRelated.push(...related);
        else if (related) allRelated.push(related);
      }

      if (allRelated.length) {
        const [next, ...rest] = nestedPath.split(".");
        const firstRelated = allRelated[0];
        if (typeof (firstRelated as any).getRelation === "function") {
          const nextRelation = firstRelated.getRelation(next);
          await this.loadNestedRelations(allRelated, nextRelation, rest.join("."));
        }
      }
    }

    async all(): Promise<any[]> {
      const records = await super.all();
      return this.eagerLoadRelations(records);
    }

    async find(id: number | string, pk: string = "id"): Promise<any> {
      const record = await super.find(id, pk);
      if (!record) return null;
      await this.eagerLoadRelations([record]);
      return record;
    }
  };
}
