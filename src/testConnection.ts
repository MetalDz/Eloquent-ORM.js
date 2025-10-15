import { getConnection, closeAllConnections } from "./core/connection/ConnectionFactory";

(async () => {
  for (const driver of ["mysql", "pg", "sqlite"] as const) {
    try {
      const db = await getConnection(driver);

      let result;
      switch (driver) {
        case "mysql": {
          const [rows] = await db.query("SELECT 1 + 1 AS result");
          result = rows[0];
          break;
        }
        case "pg": {
          const res = await db.query("SELECT 1 + 1 AS result");
          result = res.rows[0];
          break;
        }
        case "sqlite": {
          result = await db.get("SELECT 1 + 1 AS result");
          break;
        }
      }

      console.log(`✅ ${driver.toUpperCase()} test result:`, result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(`❌ Failed to connect to ${driver}:`, err.message);
      } else {
        console.error(`❌ Unknown error on ${driver}:`, err);
      }
    }
  }

  await closeAllConnections();
})();
