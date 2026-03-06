import fs from "fs";
import path from "path";
import { redactSecretsInValue } from "../../core/security/SecretRedactor";

export type AuditResult = "success" | "failure";

export type AuditEventInput = {
  command: string;
  connectionName?: string;
  result: AuditResult;
  test?: boolean;
  actor?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
};

export type AuditEventRecord = {
  timestamp: string;
  command: string;
  actor: string;
  connection: string;
  mode: "test" | "app";
  result: AuditResult;
  metadata?: Record<string, unknown>;
};

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function isFalsey(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "0" || normalized === "false" || normalized === "no";
}

export function isAuditEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (isFalsey(env.ELOQUENT_AUDIT_ENABLED)) return false;
  if (isTruthy(env.ELOQUENT_AUDIT_ENABLED)) return true;
  return true;
}

export function resolveAuditActor(
  env: NodeJS.ProcessEnv = process.env
): string {
  return (
    env.ELOQUENT_ACTOR ||
    env.GITHUB_ACTOR ||
    env.CI_ACTOR ||
    env.USER ||
    env.USERNAME ||
    "unknown"
  );
}

export function resolveAuditPath(
  env: NodeJS.ProcessEnv = process.env
): string {
  return (
    env.ELOQUENT_AUDIT_PATH ||
    path.join(process.cwd(), "src", "test", "logs", "audit.log")
  );
}

export function buildAuditEvent(input: AuditEventInput): AuditEventRecord {
  return {
    timestamp: input.timestamp || new Date().toISOString(),
    command: input.command,
    actor: input.actor || resolveAuditActor(),
    connection: input.connectionName || "unknown",
    mode: input.test ? "test" : "app",
    result: input.result,
    metadata: input.metadata
      ? (redactSecretsInValue(input.metadata) as Record<string, unknown>)
      : undefined,
  };
}

export function appendAuditEvent(
  input: AuditEventInput,
  env: NodeJS.ProcessEnv = process.env
): void {
  if (!isAuditEnabled(env)) return;

  const record = buildAuditEvent({
    ...input,
    actor: input.actor || resolveAuditActor(env),
  });

  try {
    const auditPath = resolveAuditPath(env);
    fs.mkdirSync(path.dirname(auditPath), { recursive: true });
    fs.appendFileSync(auditPath, `${JSON.stringify(record)}\n`, "utf8");
  } catch {
    // Audit log failures must not block migrations/seeding commands.
  }
}

