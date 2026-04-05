import fs from "fs";
import path from "path";

let cachedCliVersion: string | null = null;

export function resolveCliVersion(): string {
  if (cachedCliVersion) return cachedCliVersion;

  try {
    const packageJsonPath = path.resolve(__dirname, "../../..", "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
      version?: string;
    };
    cachedCliVersion = packageJson.version?.trim() || "0.0.0";
  } catch {
    cachedCliVersion = "0.0.0";
  }

  return cachedCliVersion;
}

