import fs from "fs";
import path from "path";

describe("NodeNext blocker inventory", () => {
  test("generated inventory snapshot stays in sync with the audit generator", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      buildNodeNextBlockerInventory,
      renderMarkdownReport,
    } = require("../../scripts/generate-nodenext-blocker-inventory.cjs") as {
      buildNodeNextBlockerInventory: (options?: { cwd?: string }) => unknown;
      renderMarkdownReport: (inventory: unknown) => string;
    };

    const cwd = process.cwd();
    const inventory = buildNodeNextBlockerInventory({ cwd });
    const expectedJson = `${JSON.stringify(inventory, null, 2)}\n`;
    const expectedMarkdown = renderMarkdownReport(inventory);

    const committedJson = fs.readFileSync(
      path.resolve(cwd, "validation tasks", "NodeNext-Blocker-Inventory.json"),
      "utf8",
    );
    const committedMarkdown = fs.readFileSync(
      path.resolve(cwd, "validation tasks", "NodeNext-Blocker-Inventory.md"),
      "utf8",
    );

    expect(committedJson).toBe(expectedJson);
    expect(committedMarkdown).toBe(expectedMarkdown);
  });
});
