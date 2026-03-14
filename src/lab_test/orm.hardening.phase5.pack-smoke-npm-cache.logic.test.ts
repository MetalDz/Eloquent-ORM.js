import fs from "fs";
import path from "path";

describe("ORM hardening phase 5 pack-smoke npm cache", () => {
  test("pack-smoke uses a repo-local npm cache and cleans it up", () => {
    const scriptPath = path.resolve(process.cwd(), "scripts/pack-smoke.js");
    const content = fs.readFileSync(scriptPath, "utf8");

    expect(content).toContain('const npmCacheDir = path.join(repoRoot, ".npm-pack-smoke-cache");');
    expect(content).toContain("fs.mkdirSync(npmCacheDir, { recursive: true });");
    expect(content).toContain('const command = process.platform === "win32" ? "cmd.exe" : nodeCmd;');
    expect(content).toContain('? ["/d", "/s", "/c", "npm.cmd", ...args]');
    expect(content).toContain(": [npmCliPath, ...args];");
    expect(content).toContain("return run(command, commandArgs, {");
    expect(content).toContain("npm_config_cache: npmCacheDir,");
    expect(content).toContain("NPM_CONFIG_CACHE: npmCacheDir,");
    expect(content).toContain("if (fs.existsSync(npmCacheDir)) {");
    expect(content).toContain('fs.rmSync(npmCacheDir, { recursive: true, force: true });');
  });
});
