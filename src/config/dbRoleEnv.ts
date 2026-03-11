export type DbExecutionRole = "runtime" | "migration";

function pickFirstDefined(
  env: NodeJS.ProcessEnv,
  keys: string[],
  fallback: string
): string {
  for (const key of keys) {
    const value = env[key];
    if (value !== undefined && value !== "") {
      return value;
    }
  }
  return fallback;
}

function pickFirstNumber(
  env: NodeJS.ProcessEnv,
  keys: string[],
  fallback: number
): number {
  const raw = pickFirstDefined(env, keys, String(fallback));
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pickFirstList(
  env: NodeJS.ProcessEnv,
  keys: string[]
): string[] {
  const raw = pickFirstDefined(env, keys, "");
  if (!raw) return [];

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function resolveDbExecutionRole(
  env: NodeJS.ProcessEnv = process.env
): DbExecutionRole {
  const value = String(env.ELOQUENT_DB_ROLE ?? "runtime")
    .trim()
    .toLowerCase();
  return value === "migration" ? "migration" : "runtime";
}

export function resolveMysqlEnv(
  env: NodeJS.ProcessEnv = process.env,
  options: { test?: boolean } = {}
): {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
} {
  const role = resolveDbExecutionRole(env);
  const isTest = !!options.test;
  const roleKey = role === "migration" ? "MIGRATION" : "RUNTIME";
  const prefix = isTest ? "DB_TEST" : "DB";

  const host = pickFirstDefined(
    env,
    [
      `${prefix}_${roleKey}_HOST`,
      `${prefix}_HOST`,
      `DB_${roleKey}_HOST`,
      "DB_HOST",
    ],
    "localhost"
  );
  const user = pickFirstDefined(
    env,
    [
      `${prefix}_${roleKey}_USER`,
      `${prefix}_USER`,
      `DB_${roleKey}_USER`,
      "DB_USER",
    ],
    "root"
  );
  const password = pickFirstDefined(
    env,
    [
      `${prefix}_${roleKey}_PASSWORD`,
      `${prefix}_PASSWORD`,
      `DB_${roleKey}_PASSWORD`,
      "DB_PASSWORD",
    ],
    ""
  );
  const database = pickFirstDefined(
    env,
    [
      `${prefix}_${roleKey}_NAME`,
      `${prefix}_${roleKey}_DB_NAME`,
      `${prefix}_NAME`,
      `${prefix}_DB_NAME`,
      `DB_${roleKey}_NAME`,
      `DB_${roleKey}_DB_NAME`,
      "DB_NAME",
    ],
    isTest ? "db_test" : "eloquentjs"
  );
  const port = pickFirstNumber(
    env,
    [
      `${prefix}_${roleKey}_PORT`,
      `${prefix}_PORT`,
      `DB_${roleKey}_PORT`,
      "DB_PORT",
    ],
    3306
  );

  return {
    host,
    user,
    password,
    database,
    port,
  };
}

export function resolvePgEnv(
  env: NodeJS.ProcessEnv = process.env,
  options: { test?: boolean } = {}
): {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
} {
  const role = resolveDbExecutionRole(env);
  const isTest = !!options.test;
  const roleKey = role === "migration" ? "MIGRATION" : "RUNTIME";
  const prefix = isTest ? "PG_TEST" : "PG";

  const host = pickFirstDefined(
    env,
    [
      `${prefix}_${roleKey}_HOST`,
      `${prefix}_HOST`,
      `PG_${roleKey}_HOST`,
      "PG_HOST",
    ],
    "localhost"
  );
  const user = pickFirstDefined(
    env,
    [
      `${prefix}_${roleKey}_USER`,
      `${prefix}_USER`,
      `PG_${roleKey}_USER`,
      "PG_USER",
    ],
    "postgres"
  );
  const password = pickFirstDefined(
    env,
    [
      `${prefix}_${roleKey}_PASSWORD`,
      `${prefix}_PASSWORD`,
      `PG_${roleKey}_PASSWORD`,
      "PG_PASSWORD",
    ],
    ""
  );
  const database = pickFirstDefined(
    env,
    [
      `${prefix}_${roleKey}_NAME`,
      `${prefix}_${roleKey}_DB_NAME`,
      `${prefix}_NAME`,
      `${prefix}_DB_NAME`,
      `PG_${roleKey}_NAME`,
      `PG_${roleKey}_DB_NAME`,
      "PG_NAME",
      "PG_DB_NAME",
    ],
    isTest ? "db_test_pg" : "test_db"
  );
  const port = pickFirstNumber(
    env,
    [
      `${prefix}_${roleKey}_PORT`,
      `${prefix}_PORT`,
      `PG_${roleKey}_PORT`,
      "PG_PORT",
    ],
    5432
  );

  return {
    host,
    user,
    password,
    database,
    port,
  };
}

export function resolveSqlitePath(
  env: NodeJS.ProcessEnv = process.env,
  options: { test?: boolean } = {}
): string {
  const role = resolveDbExecutionRole(env);
  const isTest = !!options.test;
  const roleKey = role === "migration" ? "MIGRATION" : "RUNTIME";
  const prefix = isTest ? "SQLITE_TEST" : "SQLITE";

  return pickFirstDefined(
    env,
    [
      `${prefix}_${roleKey}_PATH`,
      `${prefix}_PATH`,
      `SQLITE_${roleKey}_PATH`,
      "SQLITE_PATH",
    ],
    isTest ? "./data.test.sqlite" : "./data.sqlite"
  );
}

export function resolveMongoEnv(
  env: NodeJS.ProcessEnv = process.env,
  options: { test?: boolean } = {}
): {
  uri: string;
  database: string;
  dnsServers: string[];
} {
  const role = resolveDbExecutionRole(env);
  const isTest = !!options.test;
  const roleKey = role === "migration" ? "MIGRATION" : "RUNTIME";
  const prefix = isTest ? "MONGO_TEST" : "MONGO";

  const uri = pickFirstDefined(
    env,
    [
      `${prefix}_${roleKey}_URI`,
      `${prefix}_URI`,
      `MONGO_${roleKey}_URI`,
      "MONGO_URI",
    ],
    "mongodb://localhost:27017"
  );

  const database = pickFirstDefined(
    env,
    [
      `${prefix}_${roleKey}_DB`,
      `${prefix}_${roleKey}_DATABASE`,
      `${prefix}_DB`,
      `${prefix}_DATABASE`,
      `MONGO_${roleKey}_DB`,
      `MONGO_${roleKey}_DATABASE`,
      "MONGO_DB",
      "MONGO_DATABASE",
    ],
    isTest ? "eloquentjs_db_test" : "eloquentjs_db"
  );

  const dnsServers = pickFirstList(env, [
    `${prefix}_${roleKey}_DNS_SERVERS`,
    `${prefix}_DNS_SERVERS`,
    `MONGO_${roleKey}_DNS_SERVERS`,
    "MONGO_DNS_SERVERS",
  ]);

  return { uri, database, dnsServers };
}

