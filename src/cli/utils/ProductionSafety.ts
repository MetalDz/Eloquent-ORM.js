export const PROD_DESTRUCTIVE_ALLOW_ENV = "ELOQUENT_ALLOW_PROD_DESTRUCTIVE";

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function isProductionRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  const appEnv = String(env.APP_ENV ?? "").trim().toLowerCase();
  const nodeEnv = String(env.NODE_ENV ?? "").trim().toLowerCase();
  return appEnv === "production" || nodeEnv === "production";
}

export type ProductionSafetyCheckInput = {
  command: string;
  force?: boolean;
  yes?: boolean;
  env?: NodeJS.ProcessEnv;
  allowEnvKey?: string;
};

export type ProductionSafetyCheckResult = {
  allowed: boolean;
  reason?: string;
};

/**
 * Blocks destructive CLI actions in production unless the operator explicitly
 * opts in using an environment allow flag plus --force --yes.
 */
export function checkProductionDestructiveCommand(
  input: ProductionSafetyCheckInput
): ProductionSafetyCheckResult {
  const env = input.env ?? process.env;
  const allowEnvKey = input.allowEnvKey ?? PROD_DESTRUCTIVE_ALLOW_ENV;

  if (!isProductionRuntime(env)) {
    return { allowed: true };
  }

  if (!isTruthy(env[allowEnvKey])) {
    return {
      allowed: false,
      reason: `${input.command} is blocked in production. Set ${allowEnvKey}=true and re-run with --force --yes.`,
    };
  }

  const missingFlags: string[] = [];
  if (input.force !== true) missingFlags.push("--force");
  if (input.yes !== true) missingFlags.push("--yes");

  if (missingFlags.length > 0) {
    return {
      allowed: false,
      reason: `${input.command} is blocked in production. Missing ${missingFlags.join(
        " and "
      )}. Re-run with --force --yes and ${allowEnvKey}=true.`,
    };
  }

  return { allowed: true };
}

