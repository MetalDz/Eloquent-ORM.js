import fs from "fs";
import path from "path";
import chalk from "chalk";

export async function makeController(name: string) {
  const controllerDir = path.resolve(process.cwd(), "src", "controllers");
  const controllerPath = path.join(controllerDir, `${name}Controller.ts`);

  if (!fs.existsSync(controllerDir)) {
    fs.mkdirSync(controllerDir, { recursive: true });
  }

  const content = `export class ${name}Controller {
  async index(req, res) {
    return res.json({ message: "${name} index" });
  }

  async show(req, res) {
    return res.json({ message: "${name} show" });
  }

  async store(req, res) {
    return res.json({ message: "${name} store" });
  }

  async update(req, res) {
    return res.json({ message: "${name} update" });
  }

  async delete(req, res) {
    return res.json({ message: "${name} delete" });
  }
}
`;

  fs.writeFileSync(controllerPath, content);
  console.log(chalk.green(`✅ Controller created: ${controllerPath}`));
}

