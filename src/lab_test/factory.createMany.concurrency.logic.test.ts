jest.mock("@faker-js/faker", () => ({
  faker: {},
}));

import { Factory } from "../cli/utils/factories/Factory.js";
import { BaseModel } from "../core/model/BaseModel.js";

class FactoryTestModel extends BaseModel {}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function makeModel(index: number): FactoryTestModel {
  return { __index: index } as unknown as FactoryTestModel;
}

function getModelIndex(model: FactoryTestModel): number {
  return (model as unknown as { __index: number }).__index;
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

class ControlledFactory extends Factory<FactoryTestModel> {
  model = FactoryTestModel;
  private readonly createImpl: (index: number) => Promise<FactoryTestModel>;

  constructor(createImpl: (index: number) => Promise<FactoryTestModel>) {
    super();
    this.createImpl = createImpl;
  }

  definition(index = 0): Record<string, unknown> {
    return { index };
  }

  async create(_attrs: Partial<FactoryTestModel> = {}, index = 0): Promise<FactoryTestModel> {
    return this.createImpl(index);
  }
}

describe("Factory.createMany concurrency error propagation", () => {
  test("rejects when any concurrent create() worker fails", async () => {
    const factory = new ControlledFactory(async (index) => {
      if (index === 2) {
        throw new Error("worker-failed");
      }

      await sleep(5);
      return makeModel(index);
    });

    await expect(factory.createMany(5, undefined, 3)).rejects.toThrow("worker-failed");
  });

  test("rejects when callback fails in concurrent mode", async () => {
    const factory = new ControlledFactory(async (index) => {
      await sleep(2);
      return makeModel(index);
    });

    await expect(
      factory.createMany(
        5,
        async (_model, index) => {
          if (index === 1) {
            throw new Error("callback-failed");
          }
        },
        3
      )
    ).rejects.toThrow("callback-failed");
  });

  test("does not resolve partial results after a concurrent worker failure", async () => {
    const gate = createDeferred<void>();
    const started: number[] = [];

    const factory = new ControlledFactory(async (index) => {
      started.push(index);

      if (index === 0) {
        await gate.promise;
        return makeModel(index);
      }

      if (index === 1) {
        throw new Error("fail-fast");
      }

      return makeModel(index);
    });

    const run = factory.createMany(6, undefined, 2);
    const runRejection = expect(run).rejects.toThrow("fail-fast");

    await sleep(15);
    gate.resolve();

    await runRejection;
    expect(started).toEqual([0, 1]);
  });

  test("keeps result ordering by index when concurrent createMany succeeds", async () => {
    const delays = [35, 5, 20, 1];
    const completionOrder: number[] = [];

    const factory = new ControlledFactory(async (index) => {
      await sleep(delays[index] ?? 0);
      completionOrder.push(index);
      return makeModel(index);
    });

    const results = await factory.createMany(4, undefined, 4);

    expect(completionOrder).toHaveLength(4);
    expect([...completionOrder].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
    expect(results.map(getModelIndex)).toEqual([0, 1, 2, 3]);
  });
});
