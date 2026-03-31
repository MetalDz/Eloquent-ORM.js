import {
  PROD_DESTRUCTIVE_ALLOW_ENV,
  checkProductionDestructiveCommand,
  checkProductionTestOnlyCommand,
  isProductionRuntime,
} from "../cli/utils/ProductionSafety.js";

describe("CLI production safety guard", () => {
  test("detects production runtime using NODE_ENV or APP_ENV", () => {
    expect(isProductionRuntime({ NODE_ENV: "production" })).toBe(true);
    expect(isProductionRuntime({ APP_ENV: "production" })).toBe(true);
    expect(isProductionRuntime({ NODE_ENV: "development", APP_ENV: "local" })).toBe(false);
  });

  test("allows destructive command outside production", () => {
    const result = checkProductionDestructiveCommand({
      command: "migrate:fresh",
      force: false,
      yes: false,
      env: { NODE_ENV: "development" },
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  test("blocks destructive command in production when allow env flag is missing", () => {
    const result = checkProductionDestructiveCommand({
      command: "migrate:fresh",
      env: { NODE_ENV: "production" },
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain(`${PROD_DESTRUCTIVE_ALLOW_ENV}=true`);
  });

  test("blocks destructive command in production when --force is missing", () => {
    const result = checkProductionDestructiveCommand({
      command: "migrate:fresh",
      yes: true,
      env: {
        NODE_ENV: "production",
        [PROD_DESTRUCTIVE_ALLOW_ENV]: "true",
      },
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("--force");
  });

  test("blocks destructive command in production when --yes is missing", () => {
    const result = checkProductionDestructiveCommand({
      command: "migrate:fresh",
      force: true,
      env: {
        APP_ENV: "production",
        [PROD_DESTRUCTIVE_ALLOW_ENV]: "true",
      },
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("--yes");
  });

  test("allows destructive command in production only with env flag + --force + --yes", () => {
    const result = checkProductionDestructiveCommand({
      command: "migrate:fresh",
      force: true,
      yes: true,
      env: {
        NODE_ENV: "production",
        [PROD_DESTRUCTIVE_ALLOW_ENV]: "yes",
      },
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  test("production test-only guard blocks app-mode command in production", () => {
    const result = checkProductionTestOnlyCommand({
      command: "db:seed",
      test: false,
      env: { NODE_ENV: "production" },
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("--test");
  });

  test("production test-only guard allows test-mode command in production", () => {
    const result = checkProductionTestOnlyCommand({
      command: "db:seed",
      test: true,
      env: { APP_ENV: "production" },
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});

