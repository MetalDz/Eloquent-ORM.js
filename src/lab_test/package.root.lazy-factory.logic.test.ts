describe("Package root lazy Factory export", () => {
  test("requiring the root package does not eagerly load faker", () => {
    jest.resetModules();
    jest.doMock("@faker-js/faker", () => {
      throw new Error("faker should stay unloaded during plain root import");
    });

    let pkg: Record<string, unknown> | undefined;

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      pkg = require("../index") as Record<string, unknown>;
    }).not.toThrow();

    expect(pkg?.SqlModel).toBeDefined();
    expect(pkg?.column).toBeDefined();

    const factoryDescriptor = Object.getOwnPropertyDescriptor(pkg ?? {}, "Factory");
    expect(typeof factoryDescriptor?.get).toBe("function");

    expect(() => pkg?.Factory).toThrow("faker should stay unloaded during plain root import");
  });
});
