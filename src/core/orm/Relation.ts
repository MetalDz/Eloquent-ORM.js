/**
 * 🧩 Base Relation
 * Handles relation definition + auto-detected name from caller method.
 */
export abstract class Relation {
  protected relatedModel: any;
  protected foreignKey: string;
  protected localKey: string;
  protected name?: string;

  constructor(
    relatedModel: any,
    foreignKey: string,
    localKey: string,
    name?: string
  ) {
    this.relatedModel = relatedModel;
    this.foreignKey = foreignKey;
    this.localKey = localKey;
    this.name = name ?? this.detectRelationName();
  }

  /**
   * 🧠 Auto-detect relation name (e.g., "posts" from user.posts())
   */
  private detectRelationName(): string | undefined {
    try {
      const err = new Error();
      const stack = err.stack?.split("\n") || [];
      const callerLine = stack.find((line) => line.includes("."));
      if (!callerLine) return undefined;
      const match = callerLine.match(/\.([a-zA-Z0-9_]+)\s*\(/);
      return match ? match[1] : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Each relation must fetch related data for a parent
   */
  abstract getResults(parent: any): Promise<any>;

  /**
   * Each relation must match related rows for eager loading
   */
  abstract match(parents: any[]): Promise<void>;
}
