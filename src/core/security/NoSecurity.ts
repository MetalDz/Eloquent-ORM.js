import { AbstractSecurity } from "./AbstractSecurity";

/**
 * 🚧 NoSecurity
 * Used when no security checks are required (e.g., local dev or testing).
 */
export class NoSecurity extends AbstractSecurity {
  async confirmPrivilege(): Promise<boolean> {
    return true; // Always allow
  }

  async logAudit(): Promise<void> {
    return; // Silent
  }
}
