// src/orm/mixins/MorphRegistry.ts

/**
 * 🧩 MorphRegistry
 * Central lookup for morphable model types.
 * Mirrors Laravel's Relation::morphMap() behavior.
 * ✅ Fully typed, safe for ES modules and mixins.
 */

export interface MorphableConstructor<T> extends Function {
  new (...args: any[]): T;
  name: string;
}

/**
 * 🧠 MorphRegistry — global polymorphic type registry
 * Enables morphTo, morphOne, morphMany relationships.
 */
export class MorphRegistry {
  private static registry = new Map<string, MorphableConstructor<unknown>>();

  /**
   * 🔗 Register a single model alias (like Relation::morphMap entry)
   */
  static register<T>(alias: string, modelClass: MorphableConstructor<T>): void {
    if (!alias || !modelClass) throw new Error("❌ Invalid morph registration.");
    this.registry.set(alias, modelClass);
  }

  /**
   * 🔗 Register multiple aliases at once (Laravel-like syntax)
   * Example: MorphRegistry.registerMap({ posts: Post, comments: Comment })
   */
  static registerMap(map: Record<string, MorphableConstructor<unknown>>): void {
    for (const [alias, modelClass] of Object.entries(map)) {
      this.register(alias, modelClass);
    }
  }

  /**
   * 🧭 Resolve a morph type name into a model constructor
   */
  static resolve<T>(type: string): MorphableConstructor<T> {
    const model = this.registry.get(type);
    if (model) return model as MorphableConstructor<T>;

    // 🧠 Laravel-style fallback: dynamic import for ESM
    try {
      const dynamicImport = (globalThis as any).require || undefined;
      if (typeof dynamicImport === "function") {
        const required = dynamicImport(type);
        const firstExport = Object.values(required)[0] as MorphableConstructor<T>;
        if (firstExport) return firstExport;
      }
    } catch {
      // Silent fallback
    }

    throw new Error(`❌ Morph type '${type}' not found in MorphRegistry or as a class name.`);
  }

  /**
   * 🪞 Alias for resolve() — Laravel-like syntax
   */
  static getMorphedModel<T>(alias: string): MorphableConstructor<T> {
    return this.resolve(alias);
  }

  /**
   * 🧾 Return current morph map for debugging/logging
   */
  static list(): Record<string, string> {
    const entries: Record<string, string> = {};
    for (const [alias, model] of this.registry.entries()) {
      entries[alias] = model.name;
    }
    return entries;
  }

  /**
   * ✅ Check if a morph alias is already registered
   */
  static has(alias: string): boolean {
    return this.registry.has(alias);
  }

  /**
   * ♻️ Clear all registered morphs (for testing or reloading)
   */
  static clear(): void {
    this.registry.clear();
  }
}
