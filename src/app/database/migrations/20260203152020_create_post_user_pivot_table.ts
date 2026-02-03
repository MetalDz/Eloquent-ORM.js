/**
 * Manual CREATE migration for post_user_pivot
 * Generated at 2026-02-03T15:20:20.000Z
 */
export async function up(db: { query(sql: string): Promise<void> }) {
  await db.query(`CREATE TABLE IF NOT EXISTS \`post_user_pivot\` (
  \`user_id\` INT NOT NULL,
  \`post_id\` INT NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);
}

export async function down(db: { query(sql: string): Promise<void> }) {
  await db.query(`DROP TABLE IF EXISTS \`post_user_pivot\`;`);
}
