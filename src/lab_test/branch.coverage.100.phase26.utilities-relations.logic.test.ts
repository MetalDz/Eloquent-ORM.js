import { BelongsToMany } from "../core/orm/relations/BelongsToMany.js";
import type { DriverAdapter } from "../core/connection/DriverAdapter.js";
import { CastsMixin } from "../core/orm/mixins/CastsMixin.js";
import { TemplateEngine } from "../cli/utils/TemplateEngine.js";

jest.mock("chalk", () => ({
  __esModule: true,
  default: {
    red: (value: string) => value,
    redBright: (value: string) => value,
    gray: (value: string) => value,
    greenBright: (value: string) => value,
    yellow: (value: string) => value,
  },
}));

type Row = Record<string, unknown>;

type MockAdapter = {
  query: jest.Mock<Promise<Row[]>, [string, unknown[]?]>;
  execute: jest.Mock<Promise<void>, [string, unknown[]?]>;
} & Omit<DriverAdapter, "query" | "execute">;

function makeAdapter(name: DriverAdapter["name"] = "mysql"): MockAdapter {
  return {
    name,
    kind: "sql",
    query: jest.fn<Promise<Row[]>, [string, unknown[]?]>(async () => []),
    queryOne: jest.fn(async () => null),
    execute: jest.fn<Promise<void>, [string, unknown[]?]>(async () => undefined),
    insert: jest.fn(async () => ({ id: undefined })),
    placeholder: () => "?",
    placeholders: (count: number) =>
      Array.from({ length: count }, () => "?").join(", "),
    inClause: (field: string, values: unknown[], startIndex = 1) => ({
      sql: `${field} IN (${Array.from({ length: values.length }, () => "?").join(
        ", "
      )})`,
      params: values,
      nextIndex: startIndex + values.length,
    }),
    wrapId: (id: string) => id,
  };
}

describe("Branch coverage 100% - phase 26 utilities + relation closures", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test("TemplateEngine covers non-array #each path and malformed spaced condition tokenization edge", () => {
    const evalCondition = (
      TemplateEngine as unknown as { evalCondition: Function }
    ).evalCondition;

    const rendered = TemplateEngine.render(
      [
        "{{#each user}}SHOULD_NOT_RENDER{{/each}}",
        "{{#if disabled}}NOPE{{/if}}",
      ].join("\n"),
      {
        user: { name: "neo" },
        disabled: false,
      }
    );

    expect(rendered).not.toContain("SHOULD_NOT_RENDER");
    expect(rendered).not.toContain("NOPE");

    expect(
      evalCondition.call(TemplateEngine, "(eq left  right)", {
        left: 1,
        right: 1,
      })
    ).toBe(true);

    // Covers tokenizer branches where whitespace chunks are skipped and
    // no final token exists after parse.
    expect(() => evalCondition.call(TemplateEngine, "(eq   )", {})).toThrow();
  });

  test("TypeScriptCompiler covers default args, existing runtime hook branch, and compileWithDefaults success", () => {
    jest.resetModules();

    const originalTsExt = require.extensions[".ts"];
    const fakeTsHook: NodeJS.RequireExtensions[string] = (module) => {
      module.exports = {};
    };
    require.extensions[".ts"] = fakeTsHook;

    const registerSpy = jest.fn();
    const createProgram = jest.fn(() => ({}));

    jest.doMock("typescript", () => ({
      findConfigFile: jest.fn(() => undefined),
      sys: { fileExists: jest.fn(), readFile: jest.fn() },
      readConfigFile: jest.fn(),
      parseJsonConfigFileContent: jest.fn(),
      createProgram,
      getPreEmitDiagnostics: jest.fn(() => []),
      flattenDiagnosticMessageText: jest.fn((m: unknown) => String(m)),
      ScriptTarget: { ES2020: 7 },
      ModuleKind: { CommonJS: 1 },
      ModuleResolutionKind: { NodeJs: 2 },
    }));

    jest.doMock("ts-node", () => ({
      register: registerSpy,
    }));

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { TypeScriptCompiler: Compiler } = require("../cli/utils/typescript/TypeScriptCompiler") as {
        TypeScriptCompiler: {
          initialized: boolean;
          ensureRuntime(): void;
          compile(files?: string[], noEmit?: boolean): boolean;
        };
      };

      Compiler.initialized = false;
      expect(Compiler.compile()).toBe(true);
      expect(createProgram).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ noEmit: true })
      );

      expect(registerSpy).toHaveBeenCalledTimes(1);
    } finally {
      if (originalTsExt) require.extensions[".ts"] = originalTsExt;
      else delete require.extensions[".ts"];
    }
  });

  test("CastsMixin covers boolean fallback, json non-string branch, null find, and falsy create branch", async () => {
    class CastBase {
      async find(): Promise<Record<string, unknown> | null> {
        return null;
      }

      async all(): Promise<Record<string, unknown>[]> {
        return [];
      }

      async create(): Promise<Record<string, unknown> | undefined> {
        return undefined;
      }

      async update(): Promise<void> {
        return;
      }
    }

    class CastModel extends CastsMixin(
      CastBase as unknown as abstract new (...args: any[]) => object
    ) {
      castPublic(type: string, value: unknown): unknown {
        return (this as any).castValue(type, value);
      }
    }

    const model = new (CastModel as any)();

    expect(model.castPublic("boolean", { x: 1 })).toBe(true);
    expect(model.castPublic("json", { a: 1 })).toEqual({ a: 1 });
    await expect(model.find(1)).resolves.toBeNull();
    await expect(model.create({ x: 1 })).resolves.toBeUndefined();
  });

  test("BelongsToMany.match covers hydrateRow-null skip, missing pivot_parent, and grouped fallback []", async () => {
    const adapter = makeAdapter();
    adapter.query.mockResolvedValue([
      { id: 1, name: "skip", pivot_parent: 10, __skip: true },
      { id: 2, name: "no-pivot" },
      { id: 3, name: "tag", pivot_parent: 10 },
    ]);

    class RelatedModel {
      tableName = "tags";

      async getDB(): Promise<DriverAdapter> {
        return adapter as unknown as DriverAdapter;
      }

      static hydrateRow(row: Row | null): Row | null {
        if (row && row.__skip) return null;
        return row ? { ...row } : null;
      }

      static hydrateMany(rows: Row[]): Row[] {
        return rows;
      }
    }

    const relation = new BelongsToMany(
      RelatedModel as any,
      "post_tag_pivot",
      "post_id",
      "tag_id"
    );
    (relation as any).name = undefined;

    const parents: Row[] = [{ id: 10 }, { id: 999 }];
    await relation.match(parents);

    const firstParentRows = (parents[0] as any).relation as Row[];
    const secondParentRows = (parents[1] as any).relation as Row[];

    expect(firstParentRows).toHaveLength(1);
    expect(firstParentRows[0]).toEqual({ id: 3, name: "tag" });
    expect(secondParentRows).toEqual([]);
  });
});
