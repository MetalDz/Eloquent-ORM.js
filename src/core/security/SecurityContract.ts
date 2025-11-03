/**
 * 🧩 Migration & Operation Security Contract
 * Defines the minimum behavior for secure ORM commands.
 */
export interface SecurityContract {
  /** Initialize security context (e.g., load keys, env vars, or vault). */
  init(): Promise<void>;

  /** Confirm privilege before performing dangerous actions (returns true to allow). */
  confirmPrivilege(action: string): Promise<boolean>;

  /** Optionally log or audit privileged actions. */
  logAudit(action: string, status: "success" | "failure"): Promise<void>;
}
