describe("resolveConnectionName test-mode selection", () => {
  const originalDbTestConnection = process.env.DB_TEST_CONNECTION;

  afterEach(() => {
    jest.resetModules();
    if (originalDbTestConnection === undefined) {
      delete process.env.DB_TEST_CONNECTION;
    } else {
      process.env.DB_TEST_CONNECTION = originalDbTestConnection;
    }
  });

  test("uses DB_TEST_CONNECTION when it matches configured connections", async () => {
    process.env.DB_TEST_CONNECTION = "pg_test";
    const { resolveConnectionName } = await import(
      "../core/connection/resolveConnectionName.js"
    );

    expect(resolveConnectionName(undefined, { test: true })).toBe("pg_test");
  });

  test("falls back to mysql_test when DB_TEST_CONNECTION is invalid", async () => {
    process.env.DB_TEST_CONNECTION = "not_existing";
    const { resolveConnectionName } = await import(
      "../core/connection/resolveConnectionName.js"
    );

    expect(resolveConnectionName(undefined, { test: true })).toBe("mysql_test");
  });
});

