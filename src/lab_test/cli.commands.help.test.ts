import fs from "fs";
import path from "path";
import { spawnSync, type SpawnSyncReturns } from "child_process";

type CliRun = SpawnSyncReturns<string> & {
  combined: string;
};

const rootDir = process.cwd();
const cliDist = path.resolve(rootDir, "dist/cli/eloquent.js");
const hasBuiltCli = fs.existsSync(cliDist);

const describeIfBuilt = hasBuiltCli ? describe : describe.skip;

const commandHelpMatrix: Array<{ label: string; args: string[] }> = [
  { label: "make:model", args: ["make:model", "--help"] },
  { label: "make:controller", args: ["make:controller", "--help"] },
  { label: "make:service", args: ["make:service", "--help"] },
  { label: "make:seed", args: ["make:seed", "--help"] },
  { label: "make:factory", args: ["make:factory", "--help"] },
  { label: "make:scenario", args: ["make:scenario", "--help"] },
  { label: "make:migration", args: ["make:migration", "--help"] },
  { label: "db:seed", args: ["db:seed", "--help"] },
  { label: "db:seed:precheck", args: ["db:seed:precheck", "--help"] },
  { label: "db:seed:fresh", args: ["db:seed:fresh", "--help"] },
  { label: "demo:scenario", args: ["demo:scenario", "--help"] },
  { label: "migrate:run", args: ["migrate:run", "--help"] },
  { label: "migrate:rollback", args: ["migrate:rollback", "--help"] },
  { label: "migrate:status", args: ["migrate:status", "--help"] },
  { label: "migrate:fresh", args: ["migrate:fresh", "--help"] },
  { label: "migrate:reset", args: ["migrate:reset", "--help"] },
  { label: "cache:clear", args: ["cache:clear", "--help"] },
  { label: "cache:stats", args: ["cache:stats", "--help"] },
  { label: "factory:status", args: ["factory:status", "--help"] },
  { label: "list", args: ["list", "--help"] },
];

function runCli(args: string[], timeoutMs = 60000): CliRun {
  const result = spawnSync(process.execPath, [cliDist, ...args], {
    cwd: rootDir,
    env: { ...process.env, FORCE_COLOR: "0" },
    encoding: "utf8",
    timeout: timeoutMs,
  });

  return {
    ...result,
    combined: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  };
}

function assertOk(result: CliRun, args: string[]): void {
  if (result.error) {
      throw new Error(
      `CLI spawn failed for "${args.join(" ")}": ${result.error.message}\n\n${result.combined}`
      );
  }
  expect(result.signal).toBeNull();
  expect(result.status).toBe(0);
}

describeIfBuilt("CLI command help validation", () => {
  test("root --help exits cleanly", () => {
    const res = runCli(["--help"]);
    assertOk(res, ["--help"]);
    expect(res.combined.toLowerCase()).toContain("usage");
  });

  test("migrate:run help exposes connection targeting flags", () => {
    const res = runCli(["migrate:run", "--help"]);
    assertOk(res, ["migrate:run", "--help"]);
    expect(res.combined).toContain("--mysql");
    expect(res.combined).toContain("--pg");
    expect(res.combined).toContain("--sqlite");
    expect(res.combined).toContain("--all-connections");
    expect(res.combined).toContain("--all-migrations");
  });

  test.each([
    "migrate:rollback",
    "migrate:status",
    "migrate:fresh",
    "migrate:reset",
  ])("%s help exposes connection targeting flags", (commandName) => {
    const res = runCli([commandName, "--help"]);
    assertOk(res, [commandName, "--help"]);
    expect(res.combined).toContain("--mysql");
    expect(res.combined).toContain("--pg");
    expect(res.combined).toContain("--sqlite");
    expect(res.combined).toContain("--all-connections");
    expect(res.combined).toContain("--all-migrations");
  });

  test("make:migration help exposes connection targeting flags", () => {
    const res = runCli(["make:migration", "--help"]);
    assertOk(res, ["make:migration", "--help"]);
    expect(res.combined).toContain("--mysql");
    expect(res.combined).toContain("--pg");
    expect(res.combined).toContain("--sqlite");
    expect(res.combined).toContain("--all-connections");
  });

  test("db:seed help exposes connection targeting flags", () => {
    const res = runCli(["db:seed", "--help"]);
    assertOk(res, ["db:seed", "--help"]);
    expect(res.combined).toContain("--mysql");
    expect(res.combined).toContain("--pg");
    expect(res.combined).toContain("--sqlite");
    expect(res.combined).toContain("--all-connections");
    expect(res.combined).toContain("--silent");
    expect(res.combined).toContain("--no-hooks");
  });

  test("db:seed:fresh help exposes silent and no-hooks flags", () => {
    const res = runCli(["db:seed:fresh", "--help"]);
    assertOk(res, ["db:seed:fresh", "--help"]);
    expect(res.combined).toContain("--silent");
    expect(res.combined).toContain("--no-hooks");
  });

  test("all registered command --help entries exit cleanly", () => {
    const failures: string[] = [];

    for (const cmd of commandHelpMatrix) {
      const res = runCli(cmd.args);
      if (res.error || res.signal !== null || res.status !== 0) {
        failures.push(
          [
            `[${cmd.label}] failed`,
            `args: ${cmd.args.join(" ")}`,
            `status: ${String(res.status)}`,
            `signal: ${String(res.signal)}`,
            `error: ${res.error ? res.error.message : "none"}`,
            res.combined,
          ].join("\n")
        );
      }
    }

    expect(failures).toEqual([]);
  });
});
