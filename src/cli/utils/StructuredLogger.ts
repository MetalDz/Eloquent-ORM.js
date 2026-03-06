export type StructuredLogLevel = "debug" | "info" | "warn" | "error";

type StructuredLogContext = {
  command?: string;
  pid?: number;
};

const LOG_LEVEL_ORDER: Record<StructuredLogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export function resolveLogLevel(
  env: NodeJS.ProcessEnv = process.env
): StructuredLogLevel {
  const raw = String(env.ELOQUENT_LOG_LEVEL ?? "info")
    .trim()
    .toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return "info";
}

export function shouldLogAtLevel(
  level: StructuredLogLevel,
  minLevel: StructuredLogLevel
): boolean {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[minLevel];
}

export function isJsonLogFormat(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return String(env.ELOQUENT_LOG_FORMAT ?? "")
    .trim()
    .toLowerCase() === "json";
}

export function buildStructuredLogLine(
  level: StructuredLogLevel,
  args: unknown[],
  context: StructuredLogContext = {}
): string {
  const message =
    typeof args[0] === "string"
      ? args[0]
      : args
          .map((arg) => {
            if (typeof arg === "string") return arg;
            try {
              return JSON.stringify(arg);
            } catch {
              return String(arg);
            }
          })
          .join(" ");

  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    args,
    ...context,
  });
}

