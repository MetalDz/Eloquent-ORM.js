/**
 * Manual UPDATE migration for Comment
 * Adds commentable_id and commentable_type columns for morph relations
 * Generated at 2026-02-03T15:20:10.000Z
 */
export async function up(db: { query(sql: string): Promise<void> }) {
  await db.query(`ALTER TABLE \`comments\`
  ADD COLUMN \`commentable_id\` INT NOT NULL,
  ADD COLUMN \`commentable_type\` VARCHAR(255) NOT NULL;`);
}

export async function down(db: { query(sql: string): Promise<void> }) {
  await db.query(`ALTER TABLE \`comments\`
  DROP COLUMN \`commentable_id\`,
  DROP COLUMN \`commentable_type\`;`);
}
