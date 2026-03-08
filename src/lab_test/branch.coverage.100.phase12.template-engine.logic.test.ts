import fs from "fs";
import os from "os";
import path from "path";
import { TemplateEngine } from "../cli/utils/TemplateEngine";
import { PathMap } from "../cli/utils/PathMap";

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

describe("Branch coverage 100% - phase 12 TemplateEngine edge paths", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.clearAllMocks();
  });

  test("TemplateEngine.load returns template content when file exists", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "tpl-load-"));
    const templatePath = path.join(root, "example.tpl");
    fs.writeFileSync(templatePath, "Hello {{name}}", "utf8");

    jest.spyOn(PathMap, "template").mockReturnValue(templatePath);
    expect(TemplateEngine.load("example")).toBe("Hello {{name}}");

    fs.rmSync(root, { recursive: true, force: true });
  });

  test("render covers simple key booleans, malformed expression, unknown op, and escaped quotes", () => {
    const template = [
      "{{#if enabled}}ENABLED{{else}}DISABLED{{/if}}",
      "{{#if disabled}}SHOULD_NOT{{else}}DISABLED_OK{{/if}}",
      "{{#if zero}}SHOULD_NOT{{else}}ZERO_OK{{/if}}",
      "{{#if (eq note \"a\\\"b\")}}ESCAPED_OK{{else}}ESCAPED_BAD{{/if}}",
      "{{#if (eq note}}MALFORMED_BAD{{else}}MALFORMED_OK{{/if}}",
      "{{#if (unknown user.name 1)}}UNKNOWN_BAD{{else}}UNKNOWN_OK{{/if}}",
    ].join("\n");

    const rendered = TemplateEngine.render(template, {
      enabled: "1",
      disabled: "false",
      zero: "0",
      note: 'a"b',
      user: { name: "neo" },
    });

    expect(rendered).toContain("ENABLED");
    expect(rendered).toContain("DISABLED_OK");
    expect(rendered).toContain("ZERO_OK");
    expect(rendered).toContain("ESCAPED_OK");
    expect(rendered).toContain("MALFORMED_OK");
    expect(rendered).toContain("UNKNOWN_OK");
  });

  test("evalCondition handles numeric and boolean literal tokens", () => {
    const evalCondition = (TemplateEngine as unknown as { evalCondition: Function }).evalCondition;

    expect(evalCondition.call(TemplateEngine, "(eq 5 5)", {})).toBe(true);
    expect(evalCondition.call(TemplateEngine, "(eq true true)", {})).toBe(true);
    expect(evalCondition.call(TemplateEngine, "(eq false false)", {})).toBe(true);
    expect(evalCondition.call(TemplateEngine, "(neq 9 10)", {})).toBe(true);
    expect(evalCondition.call(TemplateEngine, "(exists profile.name)", { profile: { name: "x" } })).toBe(
      true
    );
    expect(
      evalCondition.call(TemplateEngine, "(exists profile.missing)", { profile: { name: "x" } })
    ).toBe(false);
  });

  test("save does not recreate directory when it already exists", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "tpl-save-existing-"));
    const outputDir = path.join(root, "nested");
    const outputPath = path.join(outputDir, "file.txt");
    fs.mkdirSync(outputDir, { recursive: true });

    const mkdirSpy = jest.spyOn(fs, "mkdirSync");
    TemplateEngine.save(outputPath, "content");

    expect(fs.readFileSync(outputPath, "utf8")).toBe("content\n");
    expect(mkdirSpy).not.toHaveBeenCalled();

    fs.rmSync(root, { recursive: true, force: true });
  });
});
