// src/testHasOne.ts
import { DatabaseConnection } from "./core/connection/DatabaseConnection";

(async () => {
  try {
    const db = DatabaseConnection.getInstance();

    // ✅ Correct destructuring
    const [userRows] = await db.query("SELECT * FROM users LIMIT 1");

    // Check if you got any data
    if (!Array.isArray(userRows) || userRows.length === 0) {
      console.log("No users found. Insert a user first.");
      process.exit(0);
    }

    // ✅ Now this works
    const userRow = userRows[0];
    console.log("First user row:", userRow);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
})();
