const SENSITIVE_KEY_RE =
  /pass(word)?|pwd|token|secret|api[_-]?key|access[_-]?key|private[_-]?key|authorization|bearer/i;

const URI_CREDENTIAL_RE = /([a-z][a-z0-9+.-]*:\/\/[^:\s/]+:)([^@\s/]+)(@)/gi;
const KV_PAIR_RE =
  /\b([A-Za-z0-9_-]*(?:password|passwd|pwd|token|secret|api[_-]?key|access[_-]?key|private[_-]?key|authorization)[A-Za-z0-9_-]*)\b\s*[:=]\s*([^\s,;]+)/gi;

function redactKeyValueText(input: string): string {
  return input
    .replace(KV_PAIR_RE, (_full, key) => `${key}=[REDACTED]`)
    .replace(URI_CREDENTIAL_RE, "$1[REDACTED]$3");
}

function redactError(error: Error): Error {
  const next = new Error(redactSecretsInText(error.message));
  if (error.stack) {
    next.stack = redactSecretsInText(error.stack);
  }
  next.name = error.name;
  return next;
}

function redactObject(
  value: Record<string, unknown>,
  seen: WeakSet<object>
): Record<string, unknown> {
  if (seen.has(value)) return value;
  seen.add(value);

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (SENSITIVE_KEY_RE.test(key)) {
      output[key] = "[REDACTED]";
      continue;
    }
    output[key] = redactSecretsInValueInternal(nested, seen);
  }
  return output;
}

function redactSecretsInValueInternal(
  value: unknown,
  seen: WeakSet<object>
): unknown {
  if (typeof value === "string") {
    return redactKeyValueText(value);
  }

  if (value instanceof Error) {
    return redactError(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactSecretsInValueInternal(entry, seen));
  }

  if (value && typeof value === "object") {
    return redactObject(value as Record<string, unknown>, seen);
  }

  return value;
}

export function redactSecretsInText(value: string): string {
  return redactKeyValueText(value);
}

export function redactSecretsInValue(value: unknown): unknown {
  return redactSecretsInValueInternal(value, new WeakSet<object>());
}

export function redactSecretsInArgs(args: unknown[]): unknown[] {
  return args.map((arg) => redactSecretsInValue(arg));
}
