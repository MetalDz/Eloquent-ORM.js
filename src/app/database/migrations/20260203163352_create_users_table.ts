/**
 * 🧩 Auto-generated CREATE migration for User
 * Connection: mysql
 * Mode: DEVELOPMENT
 * Generated at 2026-02-03T16:33:52.403Z
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
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);
  await db.query(`CREATE TABLE IF NOT EXISTS \`post_user_pivot\` (
  \`user_id\` INT NOT NULL,
  \`post_id\` INT NOT NULL,
  PRIMARY KEY (\`user_id\`, \`post_id\`),
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`),
  FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`)
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