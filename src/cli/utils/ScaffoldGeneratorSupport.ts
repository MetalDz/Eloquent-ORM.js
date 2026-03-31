import path from "path";
import chalk from "chalk";
import { PathMap } from "./PathMap.js";

export type ScaffoldKind = "controller" | "service";

function scaffoldKindLabel(kind: ScaffoldKind): string {
  return kind === "controller" ? "Controller" : "Service";
}

function scaffoldRelativeDir(kind: ScaffoldKind, isTest: boolean): string {
  if (kind === "controller") {
    return isTest ? "src/test/controllers" : "src/app/controllers";
  }

  return isTest ? "src/test/services" : "src/app/services";
}

function scaffoldFileSuffix(kind: ScaffoldKind): string {
  return kind === "controller" ? "Controller" : "Service";
}

export function normalizeScaffoldModelName(kind: ScaffoldKind, modelName: string): string {
  const trimmed = String(modelName ?? "").trim();
  const suffix = scaffoldFileSuffix(kind);

  if (trimmed.toLowerCase().endsWith(suffix.toLowerCase())) {
    const baseName = trimmed.slice(0, -suffix.length).trim();
    if (baseName) {
      return baseName;
    }
  }

  return trimmed;
}

export function capitalizeScaffoldName(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function camelCaseScaffoldName(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

export function resolveScaffoldArtifact(
  kind: ScaffoldKind,
  modelName: string,
  options: { test?: boolean } = {}
): {
  modelClassName: string;
  className: string;
  fileName: string;
  outputPath: string;
  relativePath: string;
} {
  const isTest = !!options.test;
  const normalizedModelName = normalizeScaffoldModelName(kind, modelName);
  const modelClassName = capitalizeScaffoldName(normalizedModelName);
  const className = `${modelClassName}${scaffoldFileSuffix(kind)}`;
  const fileName = `${className}.ts`;
  const relativeDir = scaffoldRelativeDir(kind, isTest);

  return {
    modelClassName,
    className,
    fileName,
    outputPath: path.resolve(PathMap.root, relativeDir, fileName),
    relativePath: `${relativeDir}/${fileName}`.replace(/\\/g, "/"),
  };
}

export function logScaffoldCreated(kind: ScaffoldKind, relativePath: string): void {
  console.log(chalk.greenBright(`${scaffoldKindLabel(kind)} created:`), chalk.cyan(relativePath));
}

export function logScaffoldFailure(kind: ScaffoldKind, modelName: string, err: unknown): void {
  console.error(chalk.red(`Failed to create ${kind} for model: ${modelName}`));
  console.error(err);
}
