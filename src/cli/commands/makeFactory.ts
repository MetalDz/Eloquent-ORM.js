import fs from "fs";
import path from "path";
import chalk from "chalk";
import { PathMap } from "../utils/PathMap";
import { TemplateEngine } from "../utils/TemplateEngine";
import { writeFileSafe, overwriteFile } from "../utils/fileWriter";
import { ModelIntrospector } from "../utils/ModelIntrospector";

type MakeFactoryOptions = {
  model?: string;
  overwrite?: boolean;
  test?: boolean;
  force?: boolean;
  pivot?: boolean;
  // add future flags here, e.g. details?: boolean
};

type IntrospectedField = {
  name: string;
  type?: string | null;
};

type RelationKind =
  | "belongsTo"
  | "hasMany"
  | "belongsToMany"
  | "morphTo"
  | "morphMany"
  | string;

type IntrospectedRelation = {
  name: string;
  type: RelationKind;
  target?: string;
  isPivot?: boolean;
  pivotTable?: string;
  morphName?: string;
  foreignKey?: string;
  relatedKey?: string;
  [key: string]: unknown;
};

type ModelAnalysis = {
  fields?: IntrospectedField[];
  relations?: IntrospectedRelation[];
  features?: Record<string, unknown>;
};



function ensureDirSync(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * 🎯 EloquentJS ORM — make:factory
 * Generates factories for models and their pivot/morph relations.
 */
export async function makeFactory(factoryName: string, options: MakeFactoryOptions = {}): Promise<void> {
  try {
    console.log(chalk.cyan(`\n🧬 Generating Factory: ${factoryName}...`));

    const FactoryName = factoryName.endsWith("Factory") ? factoryName : `${factoryName}Factory`;
    const ModelName = options.model ?? factoryName.replace(/Factory$/i, "");

    // 🧠 Reflect schema using ModelIntrospector
    const analysisRaw = (await ModelIntrospector.analyze(ModelName, { test: !!options.test })) as unknown;

    if (!analysisRaw) {
      console.warn(chalk.yellow(`⚠️  No metadata found for model "${ModelName}". Aborting.`));
      return;
    }

    const analysis = analysisRaw as ModelAnalysis;
    const fields = analysis.fields ?? [];
    const relations = analysis.relations ?? [];
    const features = analysis.features ?? {};
    const shouldOverwrite = options.overwrite === true || options.force === true;

    // 🔹 Map field types → Faker paths (tweak to your faker API)
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
      fakerPath: fakerMap[String(f.type ?? "").toLowerCase()] ?? "lorem.word()",
    }));

    // 📁 Load main factory template (fail early if missing)
    const templatePath = PathMap.template("factory");
    if (!fs.existsSync(templatePath)) {
      console.error(chalk.red(`❌ Factory template not found at: ${templatePath}`));
      return;
    }
    const templateContent = fs.readFileSync(templatePath, "utf8");

    // Build relation imports and example usage snippets for template
    const relationImports = new Set<string>();
    const relationExamples: string[] = [];

    for (const rel of relations) {
      if (rel.target && typeof rel.target === "string") {
        const candidateFactoryName = `${rel.target}Factory`;
        const candidateImportPath = `../factories/${candidateFactoryName}`;
        relationImports.add(`import { ${candidateFactoryName} } from "${candidateImportPath}";`);
      }

      switch (rel.type) {
        case "belongsTo":
          relationExamples.push(
            `// create ${ModelName} with a new ${rel.target}: ${FactoryName}.with('${rel.name}', ${String(
              rel.target ?? "Related"
            )}Factory).create();`
          );
          break;
        case "hasMany":
          relationExamples.push(
            `// create ${ModelName} and 3 ${rel.target}: ${FactoryName}.with('${rel.name}', ${String(
              rel.target ?? "Related"
            )}Factory, 3).create();`
          );
          break;
        case "belongsToMany":
          relationExamples.push(
            `// attach existing ${String(rel.target)}: const r = await ${String(rel.target)}Factory.create(); await my${ModelName}.${rel.name}().attach([r.id]);`
          );
          break;
        case "morphTo":
        case "morphMany":
          relationExamples.push(
            `// morph example: await ${String(rel.target)}Factory.morphFor(parentInstance, '${rel.name}').create();`
          );
          break;
        default:
          relationExamples.push(`// relation ${rel.name} (${String(rel.type)})`);
      }
    }

    const renderData = {
      ModelName,
      FactoryName,
      fields: fakeFields,
      hasRelations: relations.length > 0,
      relations,
      relationImports: Array.from(relationImports),
      relationExamples,
      features,
    } as const;

    let rendered = TemplateEngine.render(templateContent, renderData);
    if (options.test) {
      rendered = rendered.replace(/from \"\.\.\/\.\.\/models\//g, 'from "../models/');
    }

    // ensure output directory exists
    const factoriesDir = PathMap.factories(!!options.test);
    ensureDirSync(factoriesDir);

    // 🧾 Write main factory file using writeFileSafe / overwriteFile
    const outputPath = path.join(factoriesDir, `${FactoryName}.ts`);
    if (fs.existsSync(outputPath)) {
      if (shouldOverwrite) {
        overwriteFile(outputPath, rendered);
      } else {
        console.log(chalk.yellow(`ℹ️  Factory file already exists: ${outputPath}. Use overwrite option to replace.`));
      }
    } else {
      writeFileSafe(outputPath, rendered);
    }

    // 🔄 Generate Pivot Factories automatically
    for (const rel of relations) {
      if (rel.isPivot && rel.target && typeof rel.target === "string") {
        const left = ModelName;
        const right = rel.target;
        const pivotTable =
          rel.pivotTable ??
          [left.toLowerCase(), right.toLowerCase()].sort().join("_") + "_pivot";
        const pivotFactoryName = `${left}${right}PivotFactory`;
        const pivotTemplatePath = PathMap.template("pivot-factory");

        if (!fs.existsSync(pivotTemplatePath)) {
          console.warn(
            chalk.yellow(`⚠️  Pivot template not found at: ${pivotTemplatePath} — skipping pivot ${pivotTable}.`)
          );
          continue;
        }

        const foreignKey = typeof rel.foreignKey === "string" ? rel.foreignKey : `${left.toLowerCase()}_id`;
        const relatedKey = typeof rel.relatedKey === "string" ? rel.relatedKey : `${right.toLowerCase()}_id`;

        const pivotRenderData = {
          PivotFactoryName: pivotFactoryName,
          pivotTable,
          foreignKey,
          relatedKey,
        } as const;

        const pivotRendered = TemplateEngine.render(fs.readFileSync(pivotTemplatePath, "utf8"), pivotRenderData);

        const pivotOutputPath = path.join(factoriesDir, `${pivotFactoryName}.ts`);
        if (fs.existsSync(pivotOutputPath)) {
          if (shouldOverwrite) {
            overwriteFile(pivotOutputPath, pivotRendered);
          } else {
            console.log(chalk.yellow(`ℹ️  Pivot factory already exists: ${pivotOutputPath}`));
          }
        } else {
          writeFileSafe(pivotOutputPath, pivotRendered);
        }
      }
    }

    console.log(chalk.greenBright(`\n🎉 Factory generation complete for model: ${ModelName}\n`));
  } catch (err: unknown) {
    console.error(chalk.red("❌ Factory generation failed"));
    if (err instanceof Error) {
      console.error(chalk.red(err.message));
      if (err.stack) console.error(chalk.gray(err.stack));
    } else {
      console.error(chalk.red(String(err)));
    }
  }
}
