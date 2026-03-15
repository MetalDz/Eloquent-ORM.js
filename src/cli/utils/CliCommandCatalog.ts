export type CliCommandCatalogEntry = {
  Command: string;
  Description: string;
};

export const CLI_COMMAND_CATALOG: CliCommandCatalogEntry[] = [
  {
    Command: "make:model <name>",
    Description:
      "--test --mongo --with-migration --attrs-from-schema --force --yes",
  },
  {
    Command: "make:registry",
    Description: "--test --force --yes",
  },
  {
    Command: "make:controller <name>",
    Description: "--soft --test --force --yes",
  },
  { Command: "make:service <name>", Description: "--test --force --yes" },
  {
    Command: "make:seed <model>",
    Description: "--count <number> --test --mongo --force --yes",
  },
  {
    Command: "make:scenario <name>",
    Description:
      "--test --mongo --preset <blog|media> --controllers --services --run --force --yes",
  },
  {
    Command: "make:factory <name>",
    Description: "--model <model> --test --mongo --force --yes",
  },
  {
    Command: "make:migration [model]",
    Description:
      "--test --all --mysql --pg --sqlite --mongo --all-connections --pivot-separate --force --yes",
  },
  {
    Command: "factory:status",
    Description:
      "--test --mysql --pg --sqlite --mongo --all-connections --details --graph",
  },
  {
    Command: "db:seed",
    Description:
      "--test --mysql --pg --sqlite --mongo --all-connections --class <name> --silent --no-hooks",
  },
  {
    Command: "db:seed:precheck",
    Description:
      "--test --mysql --pg --sqlite --mongo --all-connections",
  },
  {
    Command: "db:seed:fresh",
    Description:
      "--test --mysql --pg --sqlite --mongo --all-connections --class <name> --silent --no-hooks --force --yes",
  },
  {
    Command: "demo:scenario",
    Description: "--user <id> --random --test --mysql --pg --sqlite --mongo",
  },
  {
    Command: "migrate:run [model]",
    Description:
      "--test --mysql --pg --sqlite --mongo --all-connections --all-migrations --pivot-separate",
  },
  {
    Command: "migrate:rollback",
    Description:
      "--test --mysql --pg --sqlite --mongo --all-connections --all-migrations --step <number>",
  },
  {
    Command: "migrate:status",
    Description:
      "--test --mysql --pg --sqlite --mongo --all-connections --all-migrations",
  },
  {
    Command: "migrate:fresh",
    Description:
      "--test --mysql --pg --sqlite --mongo --all-connections --all-migrations --force --yes",
  },
  {
    Command: "migrate:reset",
    Description:
      "--test --mysql --pg --sqlite --mongo --all-connections --all-migrations --force --yes",
  },
  { Command: "cache:clear", Description: "(no options)" },
  { Command: "cache:stats", Description: "(no options)" },
  { Command: "list", Description: "(no options)" },
];
