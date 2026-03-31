import chalk from "chalk";
import crypto from "crypto";
import readline from "readline";
import { AbstractSecurity } from "./AbstractSecurity.js";

/**
 * 🔑 EnvKeySecurity
 * Requires a migration key from environment and user confirmation.
 */
export class EnvKeySecurity extends AbstractSecurity {
  private hashKey?: string;

  async init(): Promise<void> {
    this.hashKey = process.env.ELOQUENT_MIGRATION_KEY
      ? crypto.createHash("sha256").update(process.env.ELOQUENT_MIGRATION_KEY).digest("hex")
      : undefined;

    if (!this.hashKey) {
      console.log(chalk.yellow("⚠️ No ELOQUENT_MIGRATION_KEY found — running unsecured."));
    } else {
      console.log(chalk.gray("🔐 Environment migration key loaded."));
    }
  }

  async confirmPrivilege(action: string): Promise<boolean> {
    if (!this.hashKey) return true; // No key = no protection

    console.log(chalk.redBright(`\n⚠️  SECURE OPERATION: ${action}`));
    console.log(chalk.gray("   This action modifies or drops database schema."));

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    return new Promise((resolve) => {
      rl.question(chalk.yellow("\nEnter migration key: "), (answer) => {
        rl.close();
        const hashed = crypto.createHash("sha256").update(answer).digest("hex");
        const valid = hashed === this.hashKey;

        if (!valid) console.log(chalk.red("❌ Invalid migration key."));
        resolve(valid);
      });
    });
  }
}
