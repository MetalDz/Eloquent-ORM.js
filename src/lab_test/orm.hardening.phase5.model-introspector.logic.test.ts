import fs from "fs";
import os from "os";
import path from "path";

import { mixin, relation, column } from "../core/schema/SchemaBlueprint";
import { ModelIntrospector } from "../cli/utils/ModelIntrospector";
import { PathMap } from "../cli/utils/PathMap";
import { loadModule } from "../cli/utils/typescript/tsRuntime";

jest.mock("../cli/utils/typescript/tsRuntime", () => ({
  loadModule: jest.fn(),
}));

const mockedLoadModule = loadModule as jest.MockedFunction<typeof loadModule>;

describe("ORM hardening phase 5 ModelIntrospector operations", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    jest.restoreAllMocks();
    mockedLoadModule.mockReset();
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  function makeTempDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-phase5-introspector-"));
    tempDirs.push(dir);
    return dir;
  }

  test("analyze() reports a missing model file clearly", async () => {
    const tempDir = makeTempDir();
    jest.spyOn(PathMap, "models").mockReturnValue(tempDir);

    await expect(ModelIntrospector.analyze("MissingModel")).rejects.toThrow(
      `Model file not found: ${path.resolve(tempDir, "MissingModel.ts")}`
    );
    expect(mockedLoadModule).not.toHaveBeenCalled();
  });

  test("analyze() reports a missing exported model class clearly", async () => {
    const tempDir = makeTempDir();
    const modelPath = path.resolve(tempDir, "Ghost.ts");
    fs.writeFileSync(modelPath, "export const nope = true;\n", "utf8");

    jest.spyOn(PathMap, "models").mockReturnValue(tempDir);
    mockedLoadModule.mockReturnValue({});

    await expect(ModelIntrospector.analyze("Ghost")).rejects.toThrow(
      "Could not load model class: Ghost"
    );
    expect(mockedLoadModule).toHaveBeenCalledWith(modelPath);
  });

  test("analyze() extracts fields, relations, features, and mixins from schema metadata", async () => {
    const tempDir = makeTempDir();
    const modelPath = path.resolve(tempDir, "BlogPost.ts");
    fs.writeFileSync(modelPath, "export class BlogPost {}\n", "utf8");

    jest.spyOn(PathMap, "models").mockImplementation((isTest = false) => {
      expect(isTest).toBe(true);
      return tempDir;
    });

    class BlogPost {
      static schema = {
        id: column("increments", undefined, { primary: true }),
        title: column("string", 255),
        body: column("text"),
        created_at: column("timestamp"),
        updated_at: column("timestamp"),
        deleted_at: column("timestamp"),
        author: relation("belongsTo", "User", { foreignKey: "user_id" }),
        tags: relation("belongsToMany", "Tag", { pivotTable: "post_tag" }),
        comments: relation("morphMany", "Comment", { morphName: "commentable" }),
        serialize: mixin("Serialize"),
        softDeletes: mixin("SoftDeletes"),
      };

      static timestamps = true;
      static softDeletes = true;
      static morphAlias = "blog_posts";
    }

    mockedLoadModule.mockReturnValue({ BlogPost });

    const result = await ModelIntrospector.analyze("BlogPost", { test: true });

    expect(mockedLoadModule).toHaveBeenCalledWith(modelPath);
    expect(result.fields).toEqual([
      { name: "title", type: "string" },
      { name: "body", type: "text" },
    ]);
    expect(result.relations).toEqual([
      {
        name: "author",
        type: "belongsTo",
        target: "User",
        pivotTable: undefined,
        morphName: undefined,
        isPivot: false,
        isMorph: false,
      },
      {
        name: "tags",
        type: "belongsToMany",
        target: "Tag",
        pivotTable: "post_tag",
        morphName: undefined,
        isPivot: true,
        isMorph: false,
      },
      {
        name: "comments",
        type: "morphMany",
        target: "Comment",
        pivotTable: undefined,
        morphName: "commentable",
        isPivot: false,
        isMorph: true,
      },
    ]);
    expect(result.features).toEqual({
      hasTimestamps: true,
      hasSoftDeletes: true,
      isMorphable: true,
      mixins: ["Serialize", "SoftDeletes"],
    });
  });
});
