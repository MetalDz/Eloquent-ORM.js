import fs from "fs";
import path from "path";

describe("ORM hardening phase 5 pack-smoke tarball staging", () => {
  test("pack-smoke stages the tarball once and reuses the staged snapshot for every sample app", () => {
    const scriptPath = path.resolve(process.cwd(), "scripts/pack-smoke.js");
    const content = fs.readFileSync(scriptPath, "utf8");

    expect(content).toContain("function stageTarballSnapshot(sourceTarballPath) {");
    expect(content).toContain(
      'const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-pack-smoke-tarball-"));'
    );
    expect(content).toContain("const stagedTarballPath = path.join(stagingDir, path.basename(sourceTarballPath));");
    expect(content).toContain("fs.copyFileSync(sourceTarballPath, stagedTarballPath);");
    expect(content).toContain("stagedTarballPath = stageTarballSnapshot(tarballPath);");
    expect(content).toContain("const tarballEntries = listTarballEntries(stagedTarballPath);");
    expect(content).toContain('const tarballName = path.basename(stagedTarballPath);');
    expect(content).toContain("fs.copyFileSync(stagedTarballPath, localTarballPath);");
    expect(content).toContain('const generalSample = createSampleApp(stagedTarballPath, "commands");');
    expect(content).toContain('const blogSample = createSampleApp(stagedTarballPath, "blog");');
    expect(content).toContain('const mediaSample = createSampleApp(stagedTarballPath, "media");');
    expect(content).toContain('const autoScenarioSample = createSampleApp(stagedTarballPath, "scenario-run");');
    expect(content).toContain("const stagedTarballDir = path.dirname(stagedTarballPath);");
    expect(content).toContain("fs.rmSync(stagedTarballDir, { recursive: true, force: true });");
  });
});
