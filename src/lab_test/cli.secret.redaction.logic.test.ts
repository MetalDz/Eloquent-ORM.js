import {
  redactSecretsInArgs,
  redactSecretsInText,
  redactSecretsInValue,
} from "../core/security/SecretRedactor";

describe("CLI/core secret redaction", () => {
  test("redacts key/value secret patterns in text", () => {
    const input =
      "DB_PASSWORD=supersecret api_key:abc123 token=mytoken authorization=bearer-token";
    const output = redactSecretsInText(input);

    expect(output).not.toContain("supersecret");
    expect(output).not.toContain("abc123");
    expect(output).not.toContain("mytoken");
    expect(output).toContain("DB_PASSWORD=[REDACTED]");
  });

  test("redacts URI credentials", () => {
    const input = "postgres://db_user:plainpass@localhost:5432/app_db";
    const output = redactSecretsInText(input);
    expect(output).toContain("postgres://db_user:[REDACTED]@localhost:5432/app_db");
  });

  test("redacts nested object keys and error messages", () => {
    const payload = {
      user: "app",
      password: "plain",
      nested: {
        token: "abc",
      },
      error: new Error("connect failed: password=plain"),
    };

    const redacted = redactSecretsInValue(payload) as {
      password: string;
      nested: { token: string };
      error: Error;
    };

    expect(redacted.password).toBe("[REDACTED]");
    expect(redacted.nested.token).toBe("[REDACTED]");
    expect(redacted.error.message).toContain("[REDACTED]");
    expect(redacted.error.message).not.toContain("plain");
  });

  test("redacts mixed log args safely", () => {
    const args = [
      "password=topsecret",
      { apiKey: "my-key", nested: { secret: "hidden" } },
    ];
    const redacted = redactSecretsInArgs(args);

    expect(String(redacted[0])).toContain("[REDACTED]");
    const obj = redacted[1] as { apiKey: string; nested: { secret: string } };
    expect(obj.apiKey).toBe("[REDACTED]");
    expect(obj.nested.secret).toBe("[REDACTED]");
  });
});

