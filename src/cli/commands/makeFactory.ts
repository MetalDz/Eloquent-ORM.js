import fs from "fs";
import path from "path";
import chalk from "chalk";
import { PathMap } from "../utils/PathMap";
import { TemplateEngine } from "../utils/TemplateEngine";
import { writeFileSafe } from "../utils/fileWriter";
import { ModelIntrospector } from "../utils/ModelIntrospector";

/**
 * 🎯 EloquentJS ORM — make:factory
 * Generates factories for models and their pivot/morph relations.
 */
export async function makeFactory(
  factoryName: string,
  options: { model?: string } = {}
): Promise<void> {
  try {
    console.log(chalk.cyan(`\n🧬 Generating Factory: ${factoryName}...`));

    const FactoryName = factoryName.endsWith("Factory")
      ? factoryName
      : `${factoryName}Factory`;

    const ModelName = options.model ?? factoryName.replace(/Factory$/i, "");

    // 🧠 Reflect schema using ModelIntrospector
    const { fields, relations, features } = await ModelIntrospector.analyze(ModelName);

    // 🔹 Map field types → Faker paths
    const fakerMap: Record<string, string> = {
      string: "person.fullName()",
      text: "lorem.sentence()",
      email: "internet.email()",
      password: "internet.password()",
      int: "number.int()",
      float: "number.float()",
      decimal: "number.float()",
      boolean: "datatype.boolean()",
      json: "datatype.json()",
      timestamp: "date.recent()",
      uuid: "string.uuid()",
    };

    const fakeFields = fields.map((f) => ({
      name: f.name,
      fakerPath: fakerMap[f.type] ?? "lorem.word()",
    }));

    // 📁 Load main factory template
    const templatePath = PathMap.template("factory");
    const templateContent = fs.readFileSync(templatePath, "utf8");

    // 🧩 Render factory using TemplateEngine (type-safe)
    const renderData = {
      ModelName,
      FactoryName,
      fields: fakeFields,
      hasRelations: relations.length > 0,
      relations,
      ...features,
    } satisfies Record<string, unknown>;

    const rendered = TemplateEngine.render(templateContent, renderData);

    // 🧾 Write main factory file
    const outputPath = path.join(PathMap.factories(), `${FactoryName}.ts`);
    writeFileSafe(outputPath, rendered);

    // 🔄 Generate Pivot Factories automatically
    for (const rel of relations) {
      if (rel.isPivot && rel.pivotTable && rel.target) {
        const PivotFactoryName = `${ModelName}${rel.target}PivotFactory`;
        const pivotTemplatePath = PathMap.template("pivot-factory");
        const pivotTemplate = fs.readFileSync(pivotTemplatePath, "utf8");

        const pivotRenderData = {
          PivotFactoryName,
          pivotTable: rel.pivotTable,
          foreignKey: rel.morphName ?? `${ModelName.toLowerCase()}_id`,
          relatedKey: `${rel.target.toLowerCase()}_id`,
        } satisfies Record<string, unknown>;

        const pivotRendered = TemplateEngine.render(pivotTemplate, pivotRenderData);
        const pivotOutputPath = path.join(PathMap.factories(), `${PivotFactoryName}.ts`);
        writeFileSafe(pivotOutputPath, pivotRendered);
      }
    }

    console.log(chalk.greenBright(`✅ Factory generation complete for model: ${ModelName}\n`));
  } catch (err: unknown) {
    console.error(chalk.red("❌ Factory generation failed"));
    if (err instanceof Error) console.error(chalk.red(err.message));
  }
}
