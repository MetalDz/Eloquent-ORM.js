import { getConnection } from "./core/connection/ConnectionFactory";

(async () => {
  const db = await getConnection("mongo");

  // Insert example document
  await db.collection("users").insertOne({ name: "John Doe", email: "john@example.com" });

  // Query example document
  const users = await db.collection("users").find({}).toArray();

  console.log("✅ MongoDB users:", users);
})();
