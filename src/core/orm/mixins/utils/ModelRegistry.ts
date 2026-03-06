type ModelConstructor = Function;

function assertModelConstructor(modelCtor: ModelConstructor): void {
  if (typeof modelCtor !== "function") {
    throw new Error("ModelRegistry expects a model constructor function.");
  }
}

function modelNameOf(modelCtor: ModelConstructor): string {
  return modelCtor.name || "AnonymousModel";
}

/**
 * Internal registry that controls which model constructors are allowed
 * to participate in guarded ORM internals (e.g. hook registration).
 */
export class ModelRegistry {
  private static granted = new WeakSet<ModelConstructor>();
  private static debugGranted = new Set<ModelConstructor>();
  private static strictMode = false;

  static grant(modelCtor: ModelConstructor): void {
    assertModelConstructor(modelCtor);
    this.granted.add(modelCtor);
    this.debugGranted.add(modelCtor);
  }

  static grantMany(modelCtors: ModelConstructor[]): void {
    for (const modelCtor of modelCtors) {
      this.grant(modelCtor);
    }
  }

  static revoke(modelCtor: ModelConstructor): void {
    assertModelConstructor(modelCtor);
    this.granted.delete(modelCtor);
    this.debugGranted.delete(modelCtor);
  }

  static isGranted(modelCtor: ModelConstructor): boolean {
    assertModelConstructor(modelCtor);
    return this.granted.has(modelCtor);
  }

  static setStrictMode(enabled: boolean): void {
    this.strictMode = enabled;
  }

  static isStrictMode(): boolean {
    return this.strictMode;
  }

  static assertGranted(
    modelCtor: ModelConstructor,
    context: "registration" | "lifecycle" = "lifecycle"
  ): void {
    assertModelConstructor(modelCtor);
    if (!this.strictMode) return;
    if (this.granted.has(modelCtor)) return;

    const modelName = modelNameOf(modelCtor);
    if (context === "registration") {
      throw new Error(`Hook registration denied for unregistered model: ${modelName}`);
    }
    throw new Error(
      `Model not granted in ModelRegistry: ${modelName}. Register models via registerModels([...]).`
    );
  }

  /**
   * Ensures model access under current registry mode:
   * - strict mode: enforce explicit registration
   * - non-strict mode: lazy-grant on first touch
   */
  static ensureGranted(
    modelCtor: ModelConstructor,
    context: "registration" | "lifecycle" = "lifecycle"
  ): void {
    assertModelConstructor(modelCtor);
    if (this.granted.has(modelCtor)) return;

    if (this.strictMode) {
      this.assertGranted(modelCtor, context);
      return;
    }

    this.grant(modelCtor);
  }

  /**
   * Debug/testing helper. Avoid using this in hot runtime paths.
   */
  static listGranted(): ModelConstructor[] {
    return Array.from(this.debugGranted);
  }

  /**
   * Test helper for deterministic cleanup.
   */
  static clear(): void {
    this.granted = new WeakSet<ModelConstructor>();
    this.debugGranted.clear();
    this.strictMode = false;
  }
}

export type { ModelConstructor };
