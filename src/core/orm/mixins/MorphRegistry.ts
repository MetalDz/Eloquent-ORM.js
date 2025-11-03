// src/orm/mixins/MorphRegistry.ts

/**
 * 🧩 MorphRegistry
 * Central lookup for morphable model types.
 * Mirrors Laravel's Relation::morphMap() behavior.
 * Strictly typed — no `any`.
 */

export interface MorphableConstructor<T> {
  new (...args: unknown[]): T;
  name: string;
}

export class MorphRegistry {
  private static registry: Map<string, MorphableConstructor<unknown>> = new Map();

  /** Register a single model alias (like Relation::morphMap entry) */
  static register<T>(alias: string, modelClass: MorphableConstructor<T>): void {
    if (!alias || !modelClass) throw new Error("Invalid morph registration");
    this.registry.set(alias, modelClass);
  }

  /** Register multiple aliases at once (Laravel-like syntax) */
  static registerMap(map: Record<string, MorphableConstructor<unknown>>): void {
    Object.entries(map).forEach(([alias, modelClass]) => {
      this.register(alias, modelClass);
    });
  }

  /** Resolve a morph type name into a model constructor */
  static resolve<T>(type: string): MorphableConstructor<T> {
    // Check explicit registry first
    const model = this.registry.get(type);
    if (model) return model as MorphableConstructor<T>;

    // 🧠 Laravel-style fallback: assume it's a class name (dynamic require)
    try {
      const required = require(type);
      const firstExport = Object.values(required)[0] as MorphableConstructor<T>;
      if (firstExport) return firstExport;
    } catch {
      // silent fail
    }

    throw new Error(`❌ Morph type '${type}' not found in MorphRegistry or as a class name.`);
  }

  /** Laravel-like alias for resolve() */
  static getMorphedModel<T>(alias: string): MorphableConstructor<T> {
    return this.resolve(alias);
  }

  /** Return current morph map (for debugging or logging) */
  static list(): Record<string, string> {
    const entries: Record<string, string> = {};
    // ✅ Safe iteration — no TS target issues
    this.registry.forEach((model, key) => {
      entries[key] = model.name;
    });
    return entries;
  }

  /** Check if a morph alias is already registered */
  static has(alias: string): boolean {
    return this.registry.has(alias);
  }

  /** Clear all registered morphs (for testing / reloading) */
  static clear(): void {
    this.registry.clear();
  }
}
