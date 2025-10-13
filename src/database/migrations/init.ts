import { DatabaseConnection } from "../../core/connection/DatabaseConnection";
import { SchemaBuilder } from "../../core/schema/SchemaBuilder";

(async () => {
  const db = DatabaseConnection.getInstance();
  const userTable = SchemaBuilder.createTableSQL("users", {
    id: "INT AUTO_INCREMENT PRIMARY KEY",
    name: "VARCHAR(100)",
    email: "VARCHAR(100)",
  });
  await db.query(userTable);

  const postTable = SchemaBuilder.createTableSQL("posts", {
    id: "INT AUTO_INCREMENT PRIMARY KEY",
    title: "VARCHAR(255)",
    content: "TEXT",
    user_id: "INT",
  });
  await db.query(postTable);

  console.log("✅ Tables created successfully!");
})();
