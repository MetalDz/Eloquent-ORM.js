import fs from "fs";
import os from "os";
import path from "path";
import {
  appendAuditEvent,
  buildAuditEvent,
  isAuditEnabled,
  resolveAuditActor,
  resolveAuditPath,
} from "../cli/utils/AuditTrail";

describe("Branch coverage 100% - phase 20 audit trail branches", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("isAuditEnabled covers explicit true/false and default fallback", () => {
    expect(isAuditEnabled()).toBe(true);
    expect(isAuditEnabled({ ELOQUENT_AUDIT_ENABLED: "yes" })).toBe(true);
    expect(isAuditEnabled({ ELOQUENT_AUDIT_ENABLED: "0" })).toBe(false);
    expect(isAuditEnabled({ ELOQUENT_AUDIT_ENABLED: "maybe" })).toBe(true);
    expect(isAuditEnabled({})).toBe(true);
  });

  test("resolveAuditActor walks all fallback sources", () => {
    expect(resolveAuditActor({ ELOQUENT_ACTOR: "eloquent-user" })).toBe("eloquent-user");
    expect(resolveAuditActor({ GITHUB_ACTOR: "gh-user" })).toBe("gh-user");
    expect(resolveAuditActor({ CI_ACTOR: "ci-user" })).toBe("ci-user");
    expect(resolveAuditActor({ USER: "shell-user" })).toBe("shell-user");
    expect(resolveAuditActor({ USERNAME: "windows-user" })).toBe("windows-user");
    expect(resolveAuditActor({})).toBe("unknown");
  });

  test("resolveAuditPath supports explicit path and default fallback", () => {
    const explicit = path.join(os.tmpdir(), "eloquent-audit-custom.log");
    expect(resolveAuditPath({ ELOQUENT_AUDIT_PATH: explicit })).toBe(explicit);
    expect(resolveAuditPath()).toContain(path.join("src", "test", "logs", "audit.log"));
    expect(resolveAuditPath({})).toContain(path.join("src", "test", "logs", "audit.log"));
  });

  test("buildAuditEvent covers metadata optional branch and unknown connection fallback", () => {
    const noMetadata = buildAuditEvent({
      timestamp: "2026-03-09T00:00:00.000Z",
      command: "migrate:run",
      result: "success",
    });

    expect(noMetadata.timestamp).toBe("2026-03-09T00:00:00.000Z");
    expect(noMetadata.connection).toBe("unknown");
    expect(noMetadata.actor).toBeTruthy();
    expect(noMetadata.metadata).toBeUndefined();

    const withMetadata = buildAuditEvent({
      command: "db:seed",
      connectionName: "sqlite_test",
      result: "failure",
      metadata: { password: "secret" },
    });

    expect(withMetadata.connection).toBe("sqlite_test");
    expect(withMetadata.metadata).toEqual(
      expect.objectContaining({ password: "[REDACTED]" })
    );
  });

  test("appendAuditEvent returns early when audit is disabled", () => {
    const mkdirSpy = jest.spyOn(fs, "mkdirSync").mockImplementation(() => undefined as never);
    const appendSpy = jest
      .spyOn(fs, "appendFileSync")
      .mockImplementation(() => undefined as never);

    appendAuditEvent(
      {
        command: "migrate:run",
        result: "success",
      },
      { ELOQUENT_AUDIT_ENABLED: "false" }
    );

    expect(mkdirSpy).not.toHaveBeenCalled();
    expect(appendSpy).not.toHaveBeenCalled();
  });

  test("appendAuditEvent writes file when enabled and actor falls back from env", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-audit-phase20-"));
    const auditPath = path.join(tempDir, "audit.log");

    appendAuditEvent(
      {
        command: "migrate:rollback",
        connectionName: "pg_test",
        result: "success",
      },
      {
        ELOQUENT_AUDIT_ENABLED: "true",
        ELOQUENT_AUDIT_PATH: auditPath,
        GITHUB_ACTOR: "ci-bot",
      }
    );

    const lines = fs.readFileSync(auditPath, "utf8").trim().split("\n");
    const last = JSON.parse(lines[lines.length - 1]) as {
      actor: string;
      connection: string;
      command: string;
    };

    expect(last.actor).toBe("ci-bot");
    expect(last.connection).toBe("pg_test");
    expect(last.command).toBe("migrate:rollback");

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
