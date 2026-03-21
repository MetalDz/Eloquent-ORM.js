import fs from "fs";
import path from "path";

describe("Docker coverage env hardening", () => {
  const rootDir = process.cwd();

  test("plan tracks the Docker coverage env hardening slice", () => {
    const plan = fs.readFileSync(
      path.resolve(rootDir, "validation tasks/Docker-Coverage-Env-Hardening-Plan.md"),
      "utf8",
    );

    expect(plan).toContain("# Docker Coverage Env Hardening Plan");
    expect(plan).toContain("Status: COMPLETED");
    expect(plan).toContain("APP_ENV=production");
    expect(plan).toContain("invalid ELF header");
  });

  test("coverage Dockerfile does not force production mode", () => {
    const dockerfile = fs.readFileSync(
      path.resolve(rootDir, "Dockerfile.coverage-debug"),
      "utf8",
    );

    expect(dockerfile).toContain("ENV APP_ENV=development");
    expect(dockerfile).toContain("ENV NODE_ENV=test");
    expect(dockerfile).not.toContain("ENV APP_ENV=production");
  });

  test("coverage compose service pins non-production env values", () => {
    const compose = fs.readFileSync(
      path.resolve(rootDir, "docker-compose.coverage-debug.yml"),
      "utf8",
    );

    expect(compose).toContain('APP_ENV: "development"');
    expect(compose).toContain('NODE_ENV: "test"');
  });

  test("dockerignore excludes host node_modules from container builds", () => {
    const dockerignore = fs.readFileSync(path.resolve(rootDir, ".dockerignore"), "utf8");

    expect(dockerignore).toContain("node_modules");
    expect(dockerignore).toContain("coverage");
    expect(dockerignore).toContain("dist");
    expect(dockerignore).not.toContain(".github");
    expect(dockerignore).not.toContain(".npmignore");
  });
});
