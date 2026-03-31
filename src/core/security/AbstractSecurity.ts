import fs from "fs";
import path from "path";
import chalk from "chalk";
import { SecurityContract } from "./SecurityContract.js";

/**
 * 🧠 AbstractSecurity
 * Base class for all ORM security modules.
 * Provides default structure and built-in audit logging.
 */
export abstract class AbstractSecurity implements SecurityContract {
  protected initialized = false;

  /** Default log directory (auto-created if missing) */
  protected logDir = path.resolve("storage/logs");
  protected logFile = path.join(this.logDir, "migrations.log");

  async init(): Promise<void> {
    this.initialized = true;
    this.ensureLogDir();
    console.log(chalk.gray("🔐 Security context initialized."));
  }

  async confirmPrivilege(action: string): Promise<boolean> {
    console.log(chalk.yellow(`⚠️  Privilege confirmation required for "${action}".`));
    return true;
  }

  /**
   * ✍️ Audit all migration actions.
   * Appends logs in a persistent file under /storage/logs/migrations.log
   */
  async logAudit(action: string, status: "success" | "failure"): Promise<void> {
    try {
      this.ensureLogDir();

      const timestamp = new Date().toISOString();
      const user = process.env.USER || process.env.USERNAME || "unknown";
      const entry = `[${timestamp}] [${status.toUpperCase()}] ${action} by ${user}\n`;

      fs.appendFileSync(this.logFile, entry, "utf8");

      console.log(chalk.gray(`📋 [Audit] ${action} (${status}) logged.`));
    } catch (err) {
      console.error(chalk.red("❌ Failed to write audit log:"), err);
    }
  }

  /**
   * 🔧 Ensures the log directory exists
   */
  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }
}
