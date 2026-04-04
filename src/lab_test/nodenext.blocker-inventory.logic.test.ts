import fs from "fs";
import path from "path";

describe("NodeNext blocker inventory", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.unmock("fs");
  });

  test("generated inventory snapshot stays in sync with the audit generator", () => {
    const actualFs = jest.requireActual("fs") as typeof fs;
    const {
      buildNodeNextBlockerInventory,
      renderMarkdownReport,
    } = jest.requireActual("../../scripts/generate-nodenext-blocker-inventory.cjs") as {
      buildNodeNextBlockerInventory: (options?: { cwd?: string }) => unknown;
      renderMarkdownReport: (inventory: unknown) => string;
    };

    const cwd = process.cwd();
    const inventory = buildNodeNextBlockerInventory({ cwd });
    const expectedJson = `${JSON.stringify(inventory, null, 2)}\n`;
    const expectedMarkdown = renderMarkdownReport(inventory);

    const committedJson = actualFs.readFileSync(
      path.resolve(cwd, "validation tasks", "NodeNext-Blocker-Inventory.json"),
      "utf8",
    );
    const committedMarkdown = actualFs.readFileSync(
      path.resolve(cwd, "validation tasks", "NodeNext-Blocker-Inventory.md"),
      "utf8",
    );

    expect(committedJson).toBe(expectedJson);
    expect(committedMarkdown).toBe(expectedMarkdown);
  });
});
