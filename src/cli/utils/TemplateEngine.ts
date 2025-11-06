import fs from "fs";
import path from "path";
import chalk from "chalk";

export class TemplateEngine {
  static load(templateName: string): string {
    const tplPath = path.resolve(process.cwd(), `src/cli/templates/${templateName}.tpl`);
    if (!fs.existsSync(tplPath)) {
      console.error(chalk.red(`❌ Template not found: ${tplPath}`));
      throw new Error(`Template missing: ${templateName}.tpl`);
    }
    return fs.readFileSync(tplPath, "utf8");
  }

  static render(template: string, data: Record<string, string | number>): string {
    return Object.entries(data).reduce(
      (acc, [key, value]) => acc.replace(new RegExp(`{{${key}}}`, "g"), String(value)),
      template
    );
  }

  static save(outputPath: string, content: string): void {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, content, "utf8");
  }
}
