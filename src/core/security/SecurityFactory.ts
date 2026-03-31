import { EnvKeySecurity } from "./EnvKeySecurity.js";
import { NoSecurity } from "./NoSecurity.js";
import { SecurityContract } from "./SecurityContract.js";
import chalk from "chalk";

/**
 * 🧠 SecurityFactory
 * Chooses the appropriate security module dynamically.
 */
export class SecurityFactory {
  static create(): SecurityContract {
    const mode = process.env.ELOQUENT_SECURITY_MODE ?? "none";

    switch (mode.toLowerCase()) {
      case "envkey":
        console.log(chalk.gray("🔐 Security mode: EnvKey"));
        return new EnvKeySecurity();
      case "none":
      default:
        console.log(chalk.gray("🔓 Security mode: Disabled (NoSecurity)"));
        return new NoSecurity();
    }
  }
}
