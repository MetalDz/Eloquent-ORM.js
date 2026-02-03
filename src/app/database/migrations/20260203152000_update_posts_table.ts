/**
 * Manual UPDATE migration for Post
 * Adds user_id column for belongsTo(User)
 * Generated at 2026-02-03T15:20:00.000Z
 */
export async function up(db: { query(sql: string): Promise<void> }) {
  await db.query(`ALTER TABLE \`posts\`
  ADD COLUMN \`user_id\` INT NOT NULL;`);
}

export async function down(db: { query(sql: string): Promise<void> }) {
  await db.query(`ALTER TABLE \`posts\`
  DROP COLUMN \`user_id\`;`);
}
