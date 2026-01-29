type Constructor<T = object> = abstract new (...args: any[]) => T;

/**
 * Create a resolver that finds the nearest base implementation for a method
 * by walking prototypes starting from the captured Base.prototype.
 */
export function createBaseMethodResolver<TBase extends Constructor>(Base: TBase) {
  const basePrototype = Base.prototype;

  return function resolveBaseMethod<TInstance extends object, K extends keyof TInstance>(
    instance: TInstance,
    method: K
  ): ((...args: unknown[]) => unknown) | null {
    let proto: unknown = basePrototype;
    const visited = new WeakSet<object>();

    while (proto && typeof proto === "object") {
      if (visited.has(proto as object)) break;
      visited.add(proto as object);

      const fn = (proto as Record<string, unknown>)[method as string];
      if (typeof fn === "function") {
        return fn.bind(instance) as (...args: unknown[]) => unknown;
      }

      proto = Object.getPrototypeOf(proto);
    }

    return null;
  };
}
