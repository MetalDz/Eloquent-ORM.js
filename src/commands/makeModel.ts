import fs from "fs";
import path from "path";
import chalk from "chalk";

export async function makeModel(name: string) {
  const modelDir = path.resolve(process.cwd(), "src", "models");
  const modelPath = path.join(modelDir, `${name}.ts`);

  // Ensure folder exists
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }

  // Template content
  const content = `export class ${name} {
  constructor() {
    // Define your model properties here
  }
}
`;

  // Write file
  fs.writeFileSync(modelPath, content);
  console.log(chalk.green(`✅ Model created: ${modelPath}`));
}

