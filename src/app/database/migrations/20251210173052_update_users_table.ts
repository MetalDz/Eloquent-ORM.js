/**
 * 🧩 Auto-generated UPDATE migration for User
 * Connection: mysql
 * Mode: DEVELOPMENT
 * Generated at 2025-12-10T17:30:52.736Z
 *
 * ⚙️  Philosophy:
 * This migration is model-driven — the Model schema is the single source of truth.
 * The "up" method applies the current state of your model.
 * The "down" method does not attempt to reverse deleted columns, because
 * model-driven migrations always regenerate from the latest model definition.
 */
export async function up(db: { query(sql: string): Promise<void> }) {
  await db.query(`CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(255),
  \`email\` VARCHAR(255),
  \`password\` VARCHAR(255),
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);
  
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