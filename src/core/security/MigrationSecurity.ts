import chalk from "chalk";

/**
 * 🧱 MigrationSecurityContract
 * Defines the required interface for all migration-privilege systems.
 */
export interface MigrationSecurityContract {
  /**
   * Initialize the security context before any migration runs.
   * For example: load environment keys, verify tokens, etc.
   */
  init(): Promise<void>;

  /**
   * Confirm user permission to execute a migration command.
   * Must return true to allow, false to cancel.
   */
  confirmPrivilege(action: string): Promise<boolean>;

  /**
   * Optional post-migration audit hook.
   * Called after migrations finish (success or rollback).
   */
  logAudit(action: string, status: "success" | "failure"): Promise<void>;
}

/**
 * 🧩 Abstract Base Class — defines structure but no enforcement yet.
 * Extend this later to implement real auth, keys, or 2-factor prompts.
 */
export abstract class AbstractMigrationSecurity
  implements MigrationSecurityContract
{
  protected initialized = false;

  async init(): Promise<void> {
    this.initialized = true;
    console.log(chalk.gray("🔐 Migration security context initialized."));
  }

  /**
   * Default confirmation — always prompts user.
   * Override with your secure version later.
   */
  async confirmPrivilege(action: string): Promise<boolean> {
    console.log(
      chalk.yellowBright(`⚠️  Confirm required before executing "${action}".`)
    );
    return true; // Placeholder — replace with prompt or token check
  }

  async logAudit(
    action: string,
    status: "success" | "failure"
  ): Promise<void> {
    console.log(
      chalk.gray(`📋 Audit: ${action} finished with status: ${status}`)
    );
  }
}

/**
 * 🧩 Default no-security implementation (for local/dev)
 * Used automatically when no secure handler is configured.
 */
export class NoSecurity extends AbstractMigrationSecurity {
  async confirmPrivilege(): Promise<boolean> {
    return true;
  }
}
