import fs from "fs";
import path from "path";
import chalk from "chalk";
import { PathMap } from "../utils/PathMap";
import { TemplateEngine } from "../utils/TemplateEngine";
import { writeFileSafe, overwriteFile } from "../utils/fileWriter";
import { ModelIntrospector } from "../utils/ModelIntrospector";
import { ImportResolver } from "../utils/ImportResolver";

type MakeFactoryOptions = {
  model?: string;
  overwrite?: boolean;
  test?: boolean;
  force?: boolean;
  mongo?: boolean;
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
 * EloquentJS ORM - make:factory
 * Generates factories for models and their pivot/morph relations.
 */
export async function makeFactory(
  factoryName: string,
  options: MakeFactoryOptions = {},
): Promise<void> {
  try {
    console.log(chalk.cyan(`\nGenerating factory: ${factoryName}...`));

    const FactoryName = factoryName.endsWith("Factory")
      ? factoryName
      : `${factoryName}Factory`;
    const ModelName = options.model ?? factoryName.replace(/Factory$/i, "");

    // Reflect schema using ModelIntrospector.
    const analysisRaw = (await ModelIntrospector.analyze(ModelName, {
      test: !!options.test,
    })) as unknown;

    if (!analysisRaw) {
      console.warn(
        chalk.yellow(
          `WARN: No metadata found for model "${ModelName}". Aborting.`,
        ),
      );
      return;
    }

    const analysis = analysisRaw as ModelAnalysis;
    const fields = analysis.fields ?? [];
    const relations = analysis.relations ?? [];
    const features = analysis.features ?? {};
    const shouldOverwrite =
      options.overwrite === true || options.force === true;

    // Map field types to faker paths.
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

    // Load the main factory template and fail early if it is missing.
    const templatePath = PathMap.template("factory");
    if (!fs.existsSync(templatePath)) {
      console.error(
        chalk.red(`ERROR: Factory template not found at: ${templatePath}`),
      );
      return;
    }
    const templateContent = fs.readFileSync(templatePath, "utf8");

    // Build relation imports and example usage snippets for template.
    const relationImports = new Set<string>();
    const relationExamples: string[] = [];
    const rootDir = PathMap.root;
    const modelImportPath = ImportResolver.withRuntimeRelativeImportExtension(
      options.test ? `../models/${ModelName}` : `../../models/${ModelName}`,
      rootDir,
    );

    for (const rel of relations) {
      if (rel.target && typeof rel.target === "string") {
        const candidateFactoryName = `${rel.target}Factory`;
        const candidateImportPath = ImportResolver.withRuntimeRelativeImportExtension(
          `../factories/${candidateFactoryName}`,
          rootDir,
        );
        relationImports.add(
          `import { ${candidateFactoryName} } from "${candidateImportPath}";`,
        );
      }

      const relatedName = String(rel.target ?? "Related");

      switch (rel.type) {
        case "belongsTo":
          relationExamples.push(
            `// create ${ModelName} with a new ${relatedName}: ${FactoryName}.with('${rel.name}', ${relatedName}Factory).create();`,
          );
          break;
        case "hasMany":
          relationExamples.push(
            `// create ${ModelName} and 3 ${relatedName}: ${FactoryName}.with('${rel.name}', ${relatedName}Factory, 3).create();`,
          );
          break;
        case "belongsToMany":
          relationExamples.push(
            `// attach existing ${relatedName}: const r = await ${relatedName}Factory.create(); await my${ModelName}.${rel.name}().attach([r.id]);`,
          );
          break;
        case "morphTo":
        case "morphMany":
          relationExamples.push(
            `// morph example: await ${relatedName}Factory.morphFor(parentInstance, '${rel.name}').create();`,
          );
          break;
        default:
          relationExamples.push(
            `// relation ${rel.name} (${String(rel.type)})`,
          );
      }
    }

    const factoriesDir = PathMap.factories(!!options.test);
    const outputPath = path.join(factoriesDir, `${FactoryName}.ts`);
    const packageImportPath = ImportResolver.publicApiImportPath(outputPath, rootDir);
    const renderData = {
      ModelName,
      FactoryName,
      fields: fakeFields,
      hasRelations: relations.length > 0,
      relations,
      relationImports: Array.from(relationImports),
      relationExamples,
      features,
      modelImportPath,
      packageImportPath,
    } as const;

    const rendered = TemplateEngine.render(templateContent, renderData);

    // Write the main factory file using writeFileSafe / overwriteFile.
    ensureDirSync(factoriesDir);
    if (fs.existsSync(outputPath)) {
      if (shouldOverwrite) {
        overwriteFile(outputPath, rendered);
      } else {
        console.log(
          chalk.yellow(
            `INFO: Factory file already exists: ${outputPath}. Use overwrite option to replace.`,
          ),
        );
      }
    } else {
      writeFileSafe(outputPath, rendered);
    }

    // Generate pivot factories automatically.
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
            chalk.yellow(
              `WARN: Pivot template not found at: ${pivotTemplatePath} - skipping pivot ${pivotTable}.`,
            ),
          );
          continue;
        }

        const foreignKey =
          typeof rel.foreignKey === "string"
            ? rel.foreignKey
            : `${left.toLowerCase()}_id`;
        const relatedKey =
          typeof rel.relatedKey === "string"
            ? rel.relatedKey
            : `${right.toLowerCase()}_id`;

        const pivotOutputPath = path.join(
          factoriesDir,
          `${pivotFactoryName}.ts`,
        );
        const pivotPackageImportPath =
          ImportResolver.publicApiImportPath(pivotOutputPath, rootDir);
        const pivotRenderData = {
          PivotFactoryName: pivotFactoryName,
          pivotTable,
          foreignKey,
          relatedKey,
          packageImportPath: pivotPackageImportPath,
        } as const;

        const pivotRendered = TemplateEngine.render(
          fs.readFileSync(pivotTemplatePath, "utf8"),
          pivotRenderData,
        );

        if (fs.existsSync(pivotOutputPath)) {
          if (shouldOverwrite) {
            overwriteFile(pivotOutputPath, pivotRendered);
          } else {
            console.log(
              chalk.yellow(
                `INFO: Pivot factory already exists: ${pivotOutputPath}`,
              ),
            );
          }
        } else {
          writeFileSafe(pivotOutputPath, pivotRendered);
        }
      }
    }

    console.log(
      chalk.greenBright(
        `\nFactory generation complete for model: ${ModelName}\n`,
      ),
    );
  } catch (err: unknown) {
    console.error(chalk.red("ERROR: Factory generation failed"));
    if (err instanceof Error) {
      console.error(chalk.red(err.message));
      if (err.stack) console.error(chalk.gray(err.stack));
    } else {
      console.error(chalk.red(String(err)));
    }
  }
}
