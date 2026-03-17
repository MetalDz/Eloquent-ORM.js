describe("database config deterministic coverage", () => {
  const originalDbConnection = process.env.DB_CONNECTION;

  afterEach(() => {
    jest.resetModules();
    jest.unmock("dotenv");

    if (originalDbConnection === undefined) {
      delete process.env.DB_CONNECTION;
    } else {
      process.env.DB_CONNECTION = originalDbConnection;
    }
  });

  test("uses DB_CONNECTION when it is explicitly set at module load", () => {
    const dotenvConfig = jest.fn();
    process.env.DB_CONNECTION = "pg";
    jest.doMock("dotenv", () => ({ config: dotenvConfig }));

    let dbConfig: typeof import("../config/database").dbConfig | undefined;

    jest.isolateModules(() => {
      ({ dbConfig } = require("../config/database") as typeof import("../config/database"));
    });

    expect(dotenvConfig).toHaveBeenCalledTimes(1);
    expect(dbConfig?.default).toBe("pg");
    expect(dbConfig?.connections.pg.driver).toBe("pg");
  });

  test("falls back to mysql when DB_CONNECTION is absent at module load", () => {
    const dotenvConfig = jest.fn();
    delete process.env.DB_CONNECTION;
    jest.doMock("dotenv", () => ({ config: dotenvConfig }));

    let dbConfig: typeof import("../config/database").dbConfig | undefined;

    jest.isolateModules(() => {
      ({ dbConfig } = require("../config/database") as typeof import("../config/database"));
    });

    expect(dotenvConfig).toHaveBeenCalledTimes(1);
    expect(dbConfig?.default).toBe("mysql");
    expect(dbConfig?.connections.mysql.driver).toBe("mysql");
  });
});
