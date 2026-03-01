import fs from "fs";
import path from "path";
import chalk from "chalk";
import { PathMap } from "./PathMap";

/**
 * 🧩 TemplateEngine
 * Lightweight TypeScript-safe engine for .tpl rendering
 *
 * Supports:
 *  - {{variable}}
 *  - {{nested.key}}
 *  - {{#each array}}...{{/each}} (items can be objects or primitives, use {{this}} for primitive)
 *  - {{#if condition}}...{{else}}...{{/if}}
 *  - Condition expressions: (eq a b) and (neq a b) where a/b can be keys or quoted literals
 */
export class TemplateEngine {
  static load(templateName: string): string {
    const tplPath = PathMap.template(templateName);
    if (!fs.existsSync(tplPath)) {
      console.error(chalk.red(`❌ Template not found: ${tplPath}`));
      throw new Error(`Template missing: ${templateName}.tpl`);
    }
    return fs.readFileSync(tplPath, "utf8");
  }

  static render(template: string, data: Record<string, unknown>): string {
    let output = template;

    // --- 🔁 Handle {{#each array}} ... {{/each}} ---
    // Use non-greedy block capture and allow dashed/underscored keys
    const loopRegex = /{{#each\s+([\w.]+)}}([\s\S]*?){{\/each}}/g;
    output = output.replace(loopRegex, (_, key: string, block: string) => {
      const value = this.resolveKey(data, key);

      if (!Array.isArray(value)) return "";

      return value
        .map((item) => {
          let innerBlock = block;

          // if primitive (string/number/boolean/null), allow {{this}}
          if (typeof item !== "object" || item === null) {
            innerBlock = innerBlock.replace(/{{\s*this\s*}}/g, String(item));
            return innerBlock.trimEnd();
          }

          // item is an object — replace occurrences of {{prop}} inside the block
          for (const [subKey, subValue] of Object.entries(item as Record<string, unknown>)) {
            const pattern = new RegExp(`{{\\s*${this.escapeRegExp(subKey)}\\s*}}`, "g");
            innerBlock = innerBlock.replace(pattern, String(subValue));
          }

          // also allow {{this}} to render JSON of the item if needed
          innerBlock = innerBlock.replace(/{{\s*this\s*}}/g, JSON.stringify(item));

          return innerBlock.trimEnd();
        })
        .join("\n");
    });

    // --- 🔀 Handle {{#if ...}} ... {{else}} ... {{/if}} ---
    // supports (eq left right) and (neq left right) or simple key
    const ifRegex = /{{#if\s+([\s\S]+?)}}([\s\S]*?)((?:{{else}}([\s\S]*?))?){{\/if}}/g;
    output = output.replace(ifRegex, (_, expr: string, truthyBlock: string, _elseWhole: string, falsyBlock: string) => {
      const conditionValue = this.evalCondition(expr.trim(), data);
      return conditionValue ? truthyBlock.trim() : (falsyBlock ? falsyBlock.trim() : "");
    });

    // --- 🧩 Handle simple variables {{var}} or nested {{user.name}} ---
    const varRegex = /{{\s*([\w.]+)\s*}}/g;
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
      if (typeof acc === "object" && acc !== null && Object.prototype.hasOwnProperty.call(acc, part)) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, data);
  }

  /**
   * Evaluate a simple conditional expression string.
   * Supported forms:
   *   - key                 -> truthy if resolveKey(data, key) is truthy
   *   - (eq left right)     -> equality, left/right may be keys or quoted literals
   *   - (neq left right)    -> inequality
   */
  private static evalCondition(expr: string, data: Record<string, unknown>): boolean {
    // simple key
    if (!expr.startsWith("(")) {
      const val = this.resolveKey(data, expr);
      return !!val && val !== "false" && val !== "0";
    }

    // expression style: (op a b)
    const m = expr.match(/^\(\s*(\w+)\s+([^)]+)\s*\)$/);
    if (!m) return false;
    const op = m[1];
    const argsStr = m[2].trim();

    // split args by whitespace but keep quoted strings together
    const args = [];
    let current = "";
    let inQuote = false;
    for (let i = 0; i < argsStr.length; i++) {
      const ch = argsStr[i];
      if (ch === '"' && argsStr[i - 1] !== "\\") {
        inQuote = !inQuote;
        current += ch;
        continue;
      }
      if (!inQuote && /\s/.test(ch)) {
        if (current.length) {
          args.push(current.trim());
          current = "";
        }
        continue;
      }
      current += ch;
    }
    if (current.length) args.push(current.trim());

    const resolveArg = (token: string): unknown => {
      // quoted literal
      if (/^".*"$/.test(token)) return token.slice(1, -1).replace(/\\"/g, '"');
      // numeric literal
      if (!isNaN(Number(token))) return Number(token);
      // boolean literal
      if (token === "true") return true;
      if (token === "false") return false;
      // else treat as key
      return this.resolveKey(data, token);
    };

    const a = resolveArg(args[0]);
    const b = args.length > 1 ? resolveArg(args[1]) : undefined;

    switch (op) {
      case "eq":
        return a == b; // eslint-disable-line eqeqeq
      case "neq":
        return a != b; // eslint-disable-line eqeqeq
      case "exists":
        return a !== undefined && a !== null;
      default:
        return false;
    }
  }

  private static escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  static save(outputPath: string, content: string): void {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, content.trimEnd() + "\n", "utf8");
  }
}
