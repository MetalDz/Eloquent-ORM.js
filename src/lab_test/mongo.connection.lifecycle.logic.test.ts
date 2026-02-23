describe("Milestone 1: mongo connection lifecycle", () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test("tracks mongo client and closes it through closeAllConnections", async () => {
    const connect = jest.fn().mockResolvedValue(undefined);
    const close = jest.fn().mockResolvedValue(undefined);
    const dbInstances: object[] = [];

    const MongoClient = jest.fn().mockImplementation(() => ({
      connect,
      db: jest.fn().mockImplementation(() => {
        const db = {};
        dbInstances.push(db);
        return db;
      }),
      close,
    }));

    jest.doMock("mongodb", () => ({ MongoClient }));

    const { getConnection, closeAllConnections } = await import(
      "../core/connection/ConnectionFactory"
    );

    const first = await getConnection("mongo" as never);
    expect(first).toBe(dbInstances[0]);

    await closeAllConnections();
    expect(close).toHaveBeenCalledTimes(1);

    const second = await getConnection("mongo" as never);
    expect(second).toBe(dbInstances[1]);

    await closeAllConnections();
    expect(close).toHaveBeenCalledTimes(2);
  });
});
