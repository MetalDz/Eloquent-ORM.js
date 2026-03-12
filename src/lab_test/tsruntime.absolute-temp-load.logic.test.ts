import fs from "fs";
import os from "os";
import path from "path";

import { loadModule } from "../cli/utils/typescript/tsRuntime";

describe("tsRuntime absolute temp load", () => {
  test("loads a temp TypeScript module outside src with relative imports", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-tsruntime-abs-"));
    const depFile = path.join(root, "dep.ts");
    const mainFile = path.join(root, "main.ts");

    try {
      fs.writeFileSync(depFile, "export const value = 7;", "utf8");
      fs.writeFileSync(
        mainFile,
        'import { value } from "./dep";\nexport const loaded = value + 1;\n',
        "utf8"
      );

      expect(loadModule(mainFile)).toEqual(
        expect.objectContaining({
          loaded: 8,
        })
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
