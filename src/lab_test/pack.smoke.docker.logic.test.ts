import fs from "fs";
import path from "path";

describe("Pack smoke Docker runner", () => {
  const rootDir = process.cwd();
  const dockerfilePath = path.resolve(rootDir, "Dockerfile.pack-smoke");
  const composePath = path.resolve(rootDir, "docker-compose.coverage-debug.yml");
  const packageJsonPath = path.resolve(rootDir, "package.json");
  const planPath = path.resolve(rootDir, "validation tasks/Pack-Smoke-Docker-Runner-Plan.md");

  test("plan tracks the dedicated pack-smoke Docker runner", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    expect(plan).toContain("# Pack Smoke Docker Runner Plan");
    expect(plan).toContain("Status: IN PROGRESS");
    expect(plan).toContain("Dockerfile.pack-smoke");
    expect(plan).toContain("docker-compose.coverage-debug.yml");
    expect(plan).toContain("npm run test:pack-smoke:docker");
  });

  test("Dockerfile.pack-smoke builds the repo and runs pack-smoke by default", () => {
    const dockerfile = fs.readFileSync(dockerfilePath, "utf8");

    expect(dockerfile).toContain("FROM node:20-bookworm");
    expect(dockerfile).toContain("COPY package*.json ./");
    expect(dockerfile).toContain("RUN npm ci");
    expect(dockerfile).toContain("COPY . .");
    expect(dockerfile).toContain('CMD ["npm", "run", "test:pack-smoke"]');
  });

  test("compose exposes a pack-smoke service with the required backing services", () => {
    const compose = fs.readFileSync(composePath, "utf8");

    expect(compose).toContain("pack-smoke:");
    expect(compose).toContain("dockerfile: Dockerfile.pack-smoke");
    expect(compose).toContain("command: npm run test:pack-smoke");
    expect(compose).toContain("mysql:");
    expect(compose).toContain("postgres:");
    expect(compose).toContain("mongo:");
    expect(compose).toContain("memcached:");
    expect(compose).toContain('ELOQUENT_PACK_SMOKE_ENABLE_MONGO_RUNTIME: "1"');
  });

  test("package.json exposes the Docker pack-smoke entrypoint", () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(pkg.scripts?.["test:pack-smoke"]).toBe("node scripts/pack-smoke.js");
    expect(pkg.scripts?.["test:pack-smoke:docker"]).toBe(
      "docker compose -f docker-compose.coverage-debug.yml run --rm pack-smoke",
    );
  });
});
