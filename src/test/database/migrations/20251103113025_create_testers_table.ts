/**
 * 🧩 Auto-generated migration for model: Tester
 * Connection: mysql
 * Mode: TEST
 * Generated at 2025-11-03T11:30:25.078Z
 */
export async function up(db: { query(sql: string): Promise<void> }) {
  await db.query(`CREATE TABLE IF NOT EXISTS \`testers\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(255),
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);
  
}

export async function down(db: { query(sql: string): Promise<void> }) {
  await db.query(`DROP TABLE IF EXISTS \`testers\`;`);
}
