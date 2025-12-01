import fs from "fs";
import path from "path";
import chalk from "chalk";

/**
 * 🧩 TemplateEngine
 * Lightweight TypeScript-safe engine for .tpl rendering
 *
 * Supports:
 *  - {{variable}}
 *  - {{nested.key}}
 *  - {{#each array}}...{{/each}}
 *  - {{#if condition}}...{{else}}...{{/if}}
 */
export class TemplateEngine {
  /**
   * Load a template file (by name without extension)
   */
  static load(templateName: string): string {
    const tplPath = path.resolve(process.cwd(), `src/cli/templates/${templateName}.tpl`);
    if (!fs.existsSync(tplPath)) {
      console.error(chalk.red(`❌ Template not found: ${tplPath}`));
      throw new Error(`Template missing: ${templateName}.tpl`);
    }
    return fs.readFileSync(tplPath, "utf8");
  }

  /**
   * Render template with provided data (supports variables, loops, and conditionals)
   */
  static render(template: string, data: Record<string, unknown>): string {
    let output = template;

    // --- 🔁 Handle {{#each array}} ... {{/each}} ---
    const loopRegex = /{{#each (\w+)}}([\s\S]*?){{\/each}}/g;
    output = output.replace(loopRegex, (_, key: string, block: string) => {
      const value = data[key];

      if (Array.isArray(value)) {
        return value
          .map((item) => {
            if (typeof item !== "object" || item === null) return "";
            let innerBlock = block;
            for (const [subKey, subValue] of Object.entries(item)) {
              const pattern = new RegExp(`{{${subKey}}}`, "g");
              innerBlock = innerBlock.replace(pattern, String(subValue));
            }
            return innerBlock.trimEnd();
          })
          .join("\n");
      }

      return "";
    });

    // --- 🔀 Handle {{#if condition}} ... {{else}} ... {{/if}} ---
    const ifRegex = /{{#if (\w+)}}([\s\S]*?)({{else}}([\s\S]*?))?{{\/if}}/g;
    output = output.replace(ifRegex, (_, key: string, truthyBlock: string, _elseBlock, falsyBlock: string) => {
      const conditionValue = this.resolveKey(data, key);
      const isTrue = !!conditionValue && conditionValue !== "false" && conditionValue !== "0";
      return isTrue ? truthyBlock.trim() : (falsyBlock ? falsyBlock.trim() : "");
    });

    // --- 🧩 Handle simple variables {{var}} or nested {{user.name}} ---
    const varRegex = /{{(\w+(?:\.\w+)*)}}/g;
    output = output.replace(varRegex, (_, key: string) => {
      const value = this.resolveKey(data, key);
      return value !== undefined && value !== null ? String(value) : "";
    });

    return output.trimEnd();
  }

  /**
   * Resolve nested keys like "user.name" safely
   */
  private static resolveKey(data: Record<string, unknown>, key: string): unknown {
    return key.split(".").reduce((acc: unknown, part) => {
      if (typeof acc === "object" && acc !== null && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, data);
  }

  /**
   * Save rendered output to file (auto-creates directories)
   */
  static save(outputPath: string, content: string): void {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, content.trimEnd() + "\n", "utf8");
  }
}
