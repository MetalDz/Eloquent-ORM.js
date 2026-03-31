function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("ConnectionFactory cold-start race protection", () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test("deduplicates concurrent getConnection() calls during cold start", async () => {
    const deferred = createDeferred<{ end: () => Promise<void> }>();
    const connectDB = jest.fn().mockImplementation(() => deferred.promise);
    const closeMongoClient = jest.fn().mockResolvedValue(false);

    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB,
      closeMongoClient,
    }));

    const { getConnection } = await import("../core/connection/ConnectionFactory.js");

    const first = getConnection("mysql_test" as never);
    const second = getConnection("mysql_test" as never);
    const third = getConnection("mysql_test" as never);

    expect(connectDB).toHaveBeenCalledTimes(1);

    const connection = {
      end: jest.fn().mockResolvedValue(undefined),
    };
    deferred.resolve(connection);

    const [resolvedFirst, resolvedSecond, resolvedThird] = await Promise.all([
      first,
      second,
      third,
    ]);

    expect(resolvedFirst).toBe(connection);
    expect(resolvedSecond).toBe(connection);
    expect(resolvedThird).toBe(connection);
    expect(connectDB).toHaveBeenCalledTimes(1);
  });

  test("retries getConnection() after an initialization failure", async () => {
    const successfulConnection = {
      end: jest.fn().mockResolvedValue(undefined),
    };

    const connectDB = jest
      .fn()
      .mockRejectedValueOnce(new Error("first init failed"))
      .mockResolvedValueOnce(successfulConnection);
    const closeMongoClient = jest.fn().mockResolvedValue(false);

    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB,
      closeMongoClient,
    }));

    const { getConnection } = await import("../core/connection/ConnectionFactory.js");

    await expect(getConnection("mysql_test" as never)).rejects.toThrow("first init failed");
    await expect(getConnection("mysql_test" as never)).resolves.toBe(successfulConnection);
    expect(connectDB).toHaveBeenCalledTimes(2);
  });

  test("deduplicates concurrent getAdapter() cold-start calls", async () => {
    const deferred = createDeferred<{ end: () => Promise<void> }>();
    const connectDB = jest.fn().mockImplementation(() => deferred.promise);
    const closeMongoClient = jest.fn().mockResolvedValue(false);
    const createdAdapter = { execute: jest.fn() };
    const createAdapter = jest.fn().mockReturnValue(createdAdapter);

    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB,
      closeMongoClient,
    }));
    jest.doMock("../core/connection/DriverAdapter", () => ({
      createAdapter,
    }));

    const { getAdapter } = await import("../core/connection/ConnectionFactory.js");

    const first = getAdapter("mysql_test" as never);
    const second = getAdapter("mysql_test" as never);

    expect(connectDB).toHaveBeenCalledTimes(1);

    const connection = {
      end: jest.fn().mockResolvedValue(undefined),
    };
    deferred.resolve(connection);

    const [resolvedFirst, resolvedSecond] = await Promise.all([first, second]);

    expect(resolvedFirst).toBe(createdAdapter);
    expect(resolvedSecond).toBe(createdAdapter);
    expect(createAdapter).toHaveBeenCalledTimes(1);
  });

  test("closeAllConnections waits in-flight adapter init and clears caches", async () => {
    const deferred = createDeferred<{ end: () => Promise<void> }>();
    const connectDB = jest.fn().mockImplementation(() => deferred.promise);
    const closeMongoClient = jest.fn().mockResolvedValue(false);
    const createAdapter = jest.fn().mockImplementation(() => ({ execute: jest.fn() }));

    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB,
      closeMongoClient,
    }));
    jest.doMock("../core/connection/DriverAdapter", () => ({
      createAdapter,
    }));

    const { getAdapter, closeAllConnections } = await import("../core/connection/ConnectionFactory.js");

    const pendingAdapter = getAdapter("mysql_test" as never);
    const closePromise = closeAllConnections();

    const connection = {
      end: jest.fn().mockResolvedValue(undefined),
    };
    deferred.resolve(connection);

    await pendingAdapter;
    await closePromise;

    await getAdapter("mysql_test" as never);

    expect(connectDB).toHaveBeenCalledTimes(2);
    expect(createAdapter).toHaveBeenCalledTimes(2);
    expect(connection.end).toHaveBeenCalledTimes(1);
  });
});
