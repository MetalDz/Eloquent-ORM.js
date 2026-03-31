import fs from "fs";
import os from "os";
import path from "path";
import {
  appendAuditEvent,
  type AuditEventRecord,
} from "../cli/utils/AuditTrail.js";
import {
  buildStructuredLogLine,
  isJsonLogFormat,
  resolveLogLevel,
  shouldLogAtLevel,
} from "../cli/utils/StructuredLogger.js";

describe("CLI structured logging + audit trail", () => {
  test("structured log mode and level resolution behave predictably", () => {
    expect(isJsonLogFormat({ ELOQUENT_LOG_FORMAT: "json" })).toBe(true);
    expect(isJsonLogFormat({ ELOQUENT_LOG_FORMAT: "text" })).toBe(false);

    expect(resolveLogLevel({ ELOQUENT_LOG_LEVEL: "warn" })).toBe("warn");
    expect(resolveLogLevel({ ELOQUENT_LOG_LEVEL: "invalid" })).toBe("info");

    expect(shouldLogAtLevel("info", "warn")).toBe(false);
    expect(shouldLogAtLevel("error", "warn")).toBe(true);
  });

  test("buildStructuredLogLine emits valid JSON with context", () => {
    const line = buildStructuredLogLine(
      "info",
      ["Migrations applied", { count: 2 }],
      { command: "migrate:run", pid: 1234 }
    );
    const parsed = JSON.parse(line) as {
      level: string;
      message: string;
      command: string;
      pid: number;
      timestamp: string;
    };

    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("Migrations applied");
    expect(parsed.command).toBe("migrate:run");
    expect(parsed.pid).toBe(1234);
    expect(parsed.timestamp).toContain("T");
  });

  test("StructuredLogger covers normalization and non-string message fallback branches", () => {
    expect(isJsonLogFormat({ ELOQUENT_LOG_FORMAT: " JSON " })).toBe(true);
    expect(isJsonLogFormat({})).toBe(false);

    expect(resolveLogLevel({ ELOQUENT_LOG_LEVEL: " DEBUG " })).toBe("debug");
    expect(resolveLogLevel({})).toBe("info");

    const line = buildStructuredLogLine(
      "warn",
      [{ a: 1 }, "tail"],
      { command: "demo:scenario" }
    );
    const parsed = JSON.parse(line) as {
      level: string;
      message: string;
      command: string;
      timestamp: string;
    };

    expect(parsed.level).toBe("warn");
    expect(parsed.command).toBe("demo:scenario");
    expect(parsed.message).toContain('{"a":1}');
    expect(parsed.message).toContain("tail");
    expect(parsed.timestamp).toContain("T");
  });

  test("buildStructuredLogLine throws on non-serializable args payload", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() =>
      buildStructuredLogLine("error", ["circular", circular], { command: "migrate:run" })
    ).toThrow("Converting circular structure to JSON");
  });

  test("appendAuditEvent writes required migration/seed audit fields and redacts metadata", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-audit-"));
    const auditPath = path.join(tempDir, "audit.log");

    appendAuditEvent(
      {
        command: "db:seed",
        connectionName: "mysql_test",
        result: "failure",
        test: true,
        metadata: {
          className: "BlogScenarioSeeder",
          password: "supersecret",
        },
      },
      {
        ELOQUENT_AUDIT_ENABLED: "true",
        ELOQUENT_AUDIT_PATH: auditPath,
        ELOQUENT_ACTOR: "ci-bot",
      }
    );

    const raw = fs.readFileSync(auditPath, "utf8").trim();
    const parsed = JSON.parse(raw) as AuditEventRecord & {
      metadata?: { password?: string; className?: string };
    };

    expect(parsed.command).toBe("db:seed");
    expect(parsed.actor).toBe("ci-bot");
    expect(parsed.connection).toBe("mysql_test");
    expect(parsed.result).toBe("failure");
    expect(parsed.mode).toBe("test");
    expect(parsed.timestamp).toContain("T");
    expect(parsed.metadata?.className).toBe("BlogScenarioSeeder");
    expect(parsed.metadata?.password).toBe("[REDACTED]");

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test("migration and seed command sources include audit trail emission", () => {
    const rootDir = process.cwd();
    const migrateRunSource = fs.readFileSync(
      path.resolve(rootDir, "src/cli/commands/migrateRun.ts"),
      "utf8"
    );
    const migrateRollbackSource = fs.readFileSync(
      path.resolve(rootDir, "src/cli/commands/migrateRollback.ts"),
      "utf8"
    );
    const dbSeedSource = fs.readFileSync(
      path.resolve(rootDir, "src/cli/commands/dbSeed.ts"),
      "utf8"
    );

    expect(migrateRunSource).toContain("appendAuditEvent({");
    expect(migrateRollbackSource).toContain("appendAuditEvent({");
    expect(dbSeedSource).toContain("appendAuditEvent({");
  });
});

