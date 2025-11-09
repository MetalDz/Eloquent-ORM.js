/**
 * 🧩 Auto-generated UPDATE migration for Test
 * Connection: mysql
 * Mode: DEVELOPMENT
 * Generated at 2025-11-09T16:25:52.753Z
 *
 * ⚙️  Philosophy:
 * This migration is model-driven — the Model schema is the single source of truth.
 * The "up" method applies the current state of your model.
 * The "down" method does not attempt to reverse deleted columns, because
 * model-driven migrations always regenerate from the latest model definition.
 */
export async function up(db: { query(sql: string): Promise<void> }) {
  await db.query(`ALTER TABLE \`tests\`
  ADD COLUMN \`url\` VARCHAR(255);`);
  
}

export async function down(db: { query(sql: string): Promise<void> }) {
  /**
   * ⚠️  Rollbacks are not auto-generated.
   * If needed, manually reverse the migration here.
   * Example: re-add columns or drop new ones.
   * 
   * Why? Because in model-driven architecture,
   * your model class already represents the latest schema state.
   */
}