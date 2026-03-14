import fs from "fs";
import path from "path";
import { CLI_COMMAND_CATALOG } from "../cli/utils/CliCommandCatalog";

type CommandSpec = {
  name: string;
  expectedFlags: string[];
};

type ParsedCommand = {
  block: string;
  commandDeclaration: string;
  name: string;
  optionFlags: string[];
};

const rootDir = process.cwd();
const cliSourcePaths = [
  path.resolve(rootDir, "src/cli/eloquent.ts"),
  path.resolve(rootDir, "src/cli/utils/CliScaffoldCommandRegistration.ts"),
  path.resolve(rootDir, "src/cli/utils/CliMakeArtifactCommandRegistration.ts"),
  path.resolve(rootDir, "src/cli/utils/CliSeedScenarioCommandRegistration.ts"),
  path.resolve(rootDir, "src/cli/utils/CliMigrationCommandRegistration.ts"),
  path.resolve(rootDir, "src/cli/utils/CliSupportCommandRegistration.ts"),
];

const commandMatrix: CommandSpec[] = [
  {
    name: "make:model",
    expectedFlags: [
      "--test",
      "--mongo",
      "--with-migration",
      "--attrs-from-schema",
      "--force",
      "--yes",
    ],
  },
  {
    name: "make:controller",
    expectedFlags: ["--test", "--soft", "--force", "--yes"],
  },
  {
    name: "make:service",
    expectedFlags: ["--test", "--force", "--yes"],
  },
  {
    name: "make:seed",
    expectedFlags: ["--count <number>", "--test", "--mongo", "--force", "--yes"],
  },
  {
    name: "make:factory",
    expectedFlags: ["--model <model>", "--test", "--mongo", "--force", "--yes"],
  },
  {
    name: "make:scenario",
    expectedFlags: [
      "--test",
      "--mongo",
      "--preset <name>",
      "--controllers",
      "--services",
      "--run",
      "--force",
      "--yes",
    ],
  },
  {
    name: "make:migration",
    expectedFlags: [
      "--test",
      "--all",
      "--mysql",
      "--pg",
      "--sqlite",
      "--mongo",
      "--all-connections",
      "--pivot-separate",
      "--force",
      "--yes",
    ],
  },
  {
    name: "db:seed",
    expectedFlags: [
      "--test",
      "--mysql",
      "--pg",
      "--sqlite",
      "--mongo",
      "--all-connections",
      "--class <name>",
      "--silent",
      "--no-hooks",
    ],
  },
  {
    name: "db:seed:precheck",
    expectedFlags: [
      "--test",
      "--mysql",
      "--pg",
      "--sqlite",
      "--mongo",
      "--all-connections",
    ],
  },
  {
    name: "db:seed:fresh",
    expectedFlags: [
      "--test",
      "--mysql",
      "--pg",
      "--sqlite",
      "--mongo",
      "--all-connections",
      "--class <name>",
      "--silent",
      "--no-hooks",
      "--force",
      "--yes",
    ],
  },
  {
    name: "demo:scenario",
    expectedFlags: [
      "--user <id>",
      "--random",
      "--test",
      "--mysql",
      "--pg",
      "--sqlite",
      "--mongo",
    ],
  },
  {
    name: "migrate:run",
    expectedFlags: [
      "--test",
      "--mysql",
      "--pg",
      "--sqlite",
      "--mongo",
      "--all-connections",
      "--all-migrations",
      "--pivot-separate",
    ],
  },
  {
    name: "migrate:rollback",
    expectedFlags: [
      "--test",
      "--mysql",
      "--pg",
      "--sqlite",
      "--mongo",
      "--all-connections",
      "--all-migrations",
      "--step <number>",
    ],
  },
  {
    name: "migrate:status",
    expectedFlags: [
      "--test",
      "--mysql",
      "--pg",
      "--sqlite",
      "--mongo",
      "--all-connections",
      "--all-migrations",
    ],
  },
  {
    name: "migrate:fresh",
    expectedFlags: [
      "--test",
      "--mysql",
      "--pg",
      "--sqlite",
      "--mongo",
      "--all-connections",
      "--all-migrations",
      "--force",
      "--yes",
    ],
  },
  {
    name: "migrate:reset",
    expectedFlags: [
      "--test",
      "--mysql",
      "--pg",
      "--sqlite",
      "--mongo",
      "--all-connections",
      "--all-migrations",
      "--force",
      "--yes",
    ],
  },
  {
    name: "cache:clear",
    expectedFlags: [],
  },
  {
    name: "cache:stats",
    expectedFlags: [],
  },
  {
    name: "factory:status",
    expectedFlags: [
      "--test",
      "--mysql",
      "--pg",
      "--sqlite",
      "--mongo",
      "--all-connections",
      "--details",
      "--graph",
    ],
  },
  {
    name: "list",
    expectedFlags: [],
  },
];

function parseCommandBlocks(source: string): ParsedCommand[] {
  const commandMatches = [...source.matchAll(/\.command\(\s*"([^"]+)"\s*\)/g)];
  const parseBoundary = source.indexOf("program.parse(process.argv);");
  const defaultBoundary = parseBoundary === -1 ? source.length : parseBoundary;

  return commandMatches.map((match, index) => {
    const declaration = match[1];
    const start = match.index ?? 0;
    const nextStart =
      index + 1 < commandMatches.length
        ? commandMatches[index + 1].index ?? defaultBoundary
        : defaultBoundary;
    const block = source.slice(start, nextStart);
    const optionFlags = [...block.matchAll(/\.option\(\s*"([^"]+)"/g)].map(
      (optionMatch) => optionMatch[1]
    );

    return {
      block,
      commandDeclaration: declaration,
      name: declaration.split(" ")[0],
      optionFlags,
    };
  });
}

function parseCommandBlocksFromFiles(sourcePaths: string[]): ParsedCommand[] {
  return sourcePaths.flatMap((sourcePath) =>
    parseCommandBlocks(fs.readFileSync(sourcePath, "utf8")),
  );
}

function sortFlags(flags: string[]): string[] {
  return [...flags].sort((a, b) => a.localeCompare(b));
}

describe("Eloquent CLI commands + parameters surface", () => {
  const parsedCommands = parseCommandBlocksFromFiles(cliSourcePaths);
  const commandMap = new Map(parsedCommands.map((command) => [command.name, command]));

  test("all expected commands are registered in CLI bootstrap", () => {
    const expected = commandMatrix.map((entry) => entry.name).sort((a, b) => a.localeCompare(b));
    const actual = parsedCommands.map((entry) => entry.name).sort((a, b) => a.localeCompare(b));
    expect(actual).toEqual(expected);
  });

  test.each(commandMatrix)(
    "$name command declares exactly the expected parameters",
    ({ name, expectedFlags }) => {
      const command = commandMap.get(name);
      expect(command).toBeDefined();
      expect(sortFlags(command?.optionFlags ?? [])).toEqual(sortFlags(expectedFlags));
    }
  );

  test("list command includes all registered command names", () => {
    const listCommand = commandMap.get("list");
    expect(listCommand).toBeDefined();
    expect(listCommand?.block).toContain("CLI_COMMAND_CATALOG");

    const catalogCommands = CLI_COMMAND_CATALOG.map((entry) => entry.Command.split(" ")[0]).sort(
      (a, b) => a.localeCompare(b)
    );
    const expectedCommands = commandMatrix.map((entry) => entry.name).sort((a, b) =>
      a.localeCompare(b)
    );
    expect(catalogCommands).toEqual(expectedCommands);
  });

});
