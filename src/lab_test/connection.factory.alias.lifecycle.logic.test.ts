describe("ConnectionFactory alias lifecycle", () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test("closes mysql_test alias using mysql driver semantics and clears cache", async () => {
    const end = jest.fn().mockResolvedValue(undefined);
    const connectDB = jest.fn().mockResolvedValue({ end });
    const closeMongoClient = jest.fn().mockResolvedValue(false);

    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB,
      closeMongoClient,
    }));

    const { getConnection, closeAllConnections } = await import(
      "../core/connection/ConnectionFactory"
    );

    await getConnection("mysql_test" as never);
    expect(connectDB).toHaveBeenCalledTimes(1);
    expect(connectDB).toHaveBeenCalledWith("mysql_test");

    await closeAllConnections();
    expect(end).toHaveBeenCalledTimes(1);

    // cache should be empty after closeAllConnections
    await getConnection("mysql_test" as never);
    expect(connectDB).toHaveBeenCalledTimes(2);
  });
});
