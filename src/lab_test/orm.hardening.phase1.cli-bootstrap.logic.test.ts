import fs from "fs";
import path from "path";
import {
  applyCliTestConnectionOverride,
  isCliTestArgv,
  resolveCliRequestedStorageKind,
  shouldAutoLoadFactoriesForCli,
} from "../cli/utils/CliBootstrapSupport.js";

describe("ORM hardening phase 1 CLI bootstrap extraction", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/ORM-Hardening-Phase1-CLI-Bootstrap-Extraction-Plan.md"
  );
  const cliPath = path.resolve(rootDir, "src/cli/eloquent.ts");

  test("sub-plan exists and freezes the CLI bootstrap extraction scope", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# ORM Hardening Phase 1 CLI Bootstrap Extraction Plan",
      "Status: COMPLETED",
      "`--test` detection",
      "CLI test-connection environment override",
      "requested storage-kind resolution for factory loading",
      "factory auto-load command gating",
      "`src/cli/eloquent.ts` delegates bootstrap flag/env interpretation to a helper module.",
      "Existing CLI surface tests still pass unchanged.",
      "`npm run typecheck` stays green.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("helper keeps CLI test flag detection and test-connection override semantics", () => {
    const env = {
      DB_CONNECTION: "mysql",
      DB_TEST_CONNECTION: "pg_test",
    };

    expect(isCliTestArgv(["node", "eloquent", "db:seed", "--test"])).toBe(true);
    expect(isCliTestArgv(["node", "eloquent", "db:seed"])).toBe(false);

    applyCliTestConnectionOverride(["node", "eloquent", "db:seed"], env);
    expect(env.DB_CONNECTION).toBe("mysql");

    applyCliTestConnectionOverride(["node", "eloquent", "db:seed", "--test"], env);
    expect(env.DB_CONNECTION).toBe("pg_test");

    const fallbackEnv = {
      DB_CONNECTION: "sqlite",
      DB_TEST_CONNECTION: undefined,
    };
    applyCliTestConnectionOverride(["node", "eloquent", "db:seed", "--test"], fallbackEnv);
    expect(fallbackEnv.DB_CONNECTION).toBe("mysql_test");
  });

  test("helper keeps requested storage-kind resolution semantics for explicit and env-driven targeting", () => {
    expect(
      resolveCliRequestedStorageKind(["node", "eloquent", "db:seed", "--mongo"], {
        DB_CONNECTION: "mysql",
      })
    ).toBe("mongo");

    expect(
      resolveCliRequestedStorageKind(["node", "eloquent", "db:seed", "--pg"], {
        DB_CONNECTION: "mongo",
      })
    ).toBe("sql");

    expect(
      resolveCliRequestedStorageKind(["node", "eloquent", "db:seed"], {
        DB_CONNECTION: "mongo",
      })
    ).toBe("mongo");

    expect(
      resolveCliRequestedStorageKind(["node", "eloquent", "db:seed", "--test"], {
        DB_CONNECTION: "mysql",
        DB_TEST_CONNECTION: "mongo_test",
      })
    ).toBe("mongo");

    expect(
      resolveCliRequestedStorageKind(["node", "eloquent", "db:seed"], {
        DB_CONNECTION: "sqlite",
      })
    ).toBe("sql");

    expect(
      resolveCliRequestedStorageKind(["node", "eloquent", "db:seed"], {})
    ).toBeUndefined();
  });

  test("helper keeps factory autoload gating limited to the intended CLI commands", () => {
    expect(shouldAutoLoadFactoriesForCli(["node", "eloquent", "db:seed"])).toBe(true);
    expect(shouldAutoLoadFactoriesForCli(["node", "eloquent", "db:seed:fresh"])).toBe(true);
    expect(shouldAutoLoadFactoriesForCli(["node", "eloquent", "factory:status"])).toBe(true);
    expect(shouldAutoLoadFactoriesForCli(["node", "eloquent", "demo:scenario"])).toBe(true);
    expect(shouldAutoLoadFactoriesForCli(["node", "eloquent", "make:scenario"])).toBe(true);
    expect(shouldAutoLoadFactoriesForCli(["node", "eloquent", "make:model"])).toBe(false);
  });

  test("eloquent CLI delegates bootstrap decisions to the extracted helper module", () => {
    const source = fs.readFileSync(cliPath, "utf8");

    expect(source).toContain('from "./utils/CliBootstrapSupport.js"');
    expect(source).toContain("export async function runCli(");
    expect(source).toContain("applyCliTestConnectionOverride(argv, env);");
    expect(source).toContain("shouldAutoLoadFactoriesForCli(argv)");
    expect(source).toContain("isCliTestArgv(argv)");
    expect(source).toContain("resolveCliRequestedStorageKind(argv, env)");
  });
});
