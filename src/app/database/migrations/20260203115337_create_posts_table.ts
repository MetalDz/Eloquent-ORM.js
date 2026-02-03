/**
 * 🧩 Auto-generated CREATE migration for Post
 * Mode: DEVELOPMENT
 * Generated at 2026-02-03T11:53:37.402Z
 */
export async function up(db: { query(sql: string): Promise<void> }) {
  await db.query(`CREATE TABLE IF NOT EXISTS \`posts\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(255),
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);
}

export async function down(db: { query(sql: string): Promise<void> }) {
  await db.query(`DROP TABLE IF EXISTS \`posts\`;`);
}
