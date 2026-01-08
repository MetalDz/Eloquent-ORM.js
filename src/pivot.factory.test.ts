/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

import path from "path";

//
// === CONFIG: set this to the relative module path of your generated pivot factory ===
// e.g. "../src/cli/utils/factories/UserRolePivotFactory"
//
const FACTORY_MODULE_PATH = "../src/cli/utils/factories/UserRolePivotFactory";

describe("PivotFactory (createPivot)", () => {
  const absFactoryPath = path.resolve(__dirname, FACTORY_MODULE_PATH);

  beforeEach(() => {
    // Ensure fresh module state for each test
    jest.resetModules();

    // clear any global side-effect arrays
    (global as any).__attachCalls = [];
    (global as any).__attachManyCalls = [];
    (global as any).__transactions = [];
  });

  test("calls attach(...) with expected normalized args", async () => {
    // Mock PivotHelperMixin -> return a class with `attach` implementation that records calls
    jest.doMock(path.resolve(__dirname, "../../orm/mixins/PivotHelperMixin"), () => {
      return {
        PivotHelperMixin: (Base: any) => {
          return class MockPivot extends Base {
            attach = async (
              pivotTable: string,
              foreignKey: string,
              relatedKey: string,
              foreignId: string | number,
              relatedIds: Array<string | number>,
              extra?: Record<string, unknown> | undefined
            ): Promise<void> => {
              // record in a global array so the test can assert it
              (global as any).__attachCalls.push({
                pivotTable,
                foreignKey,
                relatedKey,
                foreignId,
                relatedIds,
                extra,
              });
            };
          };
        },
      };
    });

    // Import the pivot factory module after mocking
    const { [Object.keys(require(absFactoryPath))[0]]: NamedExport } = (() => require(absFactoryPath))() as any;
    // The line above is a little defensive: the pivot file may export class with a name; we'll find first export.
    // Simpler: require the module and pick the first exported class.
    const mod = require(absFactoryPath) as Record<string, unknown>;
    const exportNames = Object.keys(mod);
    expect(exportNames.length).toBeGreaterThan(0);
    const PivotFactoryCtor = mod[exportNames[0]] as new () => any;

    const factory = new PivotFactoryCtor();

    // call createPivot with an array
    await factory.createPivot(42, [7, 13], { grantedBy: "admin" });

    // assert attach was called once with normalized array
    const calls = (global as any).__attachCalls as Array<Record<string, unknown>>;
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call.pivotTable).toBeDefined();
    expect(call.foreignId).toBe(42);
    expect(call.relatedIds).toEqual([7, 13]);
    expect(call.extra).toEqual({ grantedBy: "admin" });
  });

  test("prefers attachMany if available (batch path)", async () => {
    jest.doMock(path.resolve(__dirname, "../../orm/mixins/PivotHelperMixin"), () => {
      return {
        PivotHelperMixin: (Base: any) => {
          return class MockPivot extends Base {
            // provide attachMany and withTransaction to simulate optimized API
            attachMany = async (entries: Array<Record<string, unknown>>): Promise<void> => {
              (global as any).__attachManyCalls.push(entries);
            };

            withTransaction = async <R>(fn: () => Promise<R>): Promise<R> => {
              (global as any).__transactions.push("started");
              try {
                const res = await fn();
                (global as any).__transactions.push("committed");
                return res;
              } catch (err) {
                (global as any).__transactions.push("rolledback");
                throw err;
              }
            };

            // keep attach too (not used in this test)
            attach = async (): Promise<void> => {
              (global as any).__attachCalls.push({ fallback: true });
            };
          };
        },
      };
    });

    const mod = require(absFactoryPath) as Record<string, unknown>;
    const exportNames = Object.keys(mod);
    expect(exportNames.length).toBeGreaterThan(0);
    const PivotFactoryCtor = mod[exportNames[0]] as new () => any;

    const factory = new PivotFactoryCtor();

    // call createPivot with a Set (iterable) to ensure iterable normalization works
    const relatedSet = new Set<number | string>([101, 202]);
    await factory.createPivot("user-9", relatedSet, { note: "batch" });

    // assert attachMany was invoked with entries having foreignKey/relatedKey and extra attrs
    const attachManyCalls = (global as any).__attachManyCalls as Array<Array<Record<string, unknown>>>;
    expect(attachManyCalls).toHaveLength(1);

    const entries = attachManyCalls[0];
    expect(entries.length).toBe(2);
    // each entry should include extraPivotAttrs
    expect(entries[0]).toHaveProperty("note", "batch");

    // assert transaction wrapper used if provided
    const txs = (global as any).__transactions as string[];
    // we expect that withTransaction was called and committed
    expect(txs).toContain("started");
    expect(txs).toContain("committed");
  });
});
