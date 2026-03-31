describe("Branch coverage 100% - phase 27 ConnectionFactory edge closures", () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test("closeAllConnections skips falsy cache entries and handles missing end()/close() branches", async () => {
    const connectDB = jest.fn(async (name: string) => {
      if (name === "mysql_test") return undefined as never;
      if (name === "mysql") return {} as never;
      if (name === "mongo") return {} as never;
      return {} as never;
    });
    const closeMongoClient = jest.fn(async () => false);

    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB,
      closeMongoClient,
    }));

    const { getConnection, closeAllConnections } = await import(
      "../core/connection/ConnectionFactory.js"
    );

    await getConnection("mysql_test" as never);
    await getConnection("mysql" as never);
    await getConnection("mongo" as never);
    await closeAllConnections();

    expect(closeMongoClient).toHaveBeenCalledTimes(1);
  });

  test("closeAllConnections catches non-Error throw values and routes through secret redactor", async () => {
    const rawThrow = "string-close-failure";
    const redactSecretsInValue = jest.fn((value: unknown) => value);
    const connectDB = jest.fn(async (name: string) => {
      if (name === "pg_test") {
        return {
          end: async () => {
            throw rawThrow;
          },
        } as never;
      }
      return {} as never;
    });
    const closeMongoClient = jest.fn(async () => false);
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB,
      closeMongoClient,
    }));
    jest.doMock("../core/security/SecretRedactor", () => ({
      redactSecretsInValue,
    }));

    const { getConnection, closeAllConnections } = await import(
      "../core/connection/ConnectionFactory.js"
    );

    await getConnection("pg_test" as never);
    await closeAllConnections();

    expect(redactSecretsInValue).toHaveBeenCalledWith(rawThrow);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error closing pg_test:"),
      rawThrow
    );
  });
});

