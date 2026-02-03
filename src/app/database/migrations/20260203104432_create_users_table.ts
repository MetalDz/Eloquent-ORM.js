/**
 * 🧩 Auto-generated CREATE migration for User
 * Mode: DEVELOPMENT
 * Generated at 2026-02-03T10:44:32.068Z
 */
export async function up(db: { query(sql: string): Promise<void> }) {
  await db.query(`CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(255),
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);
}

export async function down(db: { query(sql: string): Promise<void> }) {
  await db.query(`DROP TABLE IF EXISTS \`users\`;`);
}
