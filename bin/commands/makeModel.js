/* "use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeModel = makeModel;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
function makeModel(name) {
    const modelName = name.charAt(0).toUpperCase() + name.slice(1);
    const modelsDir = path_1.default.resolve("src/models");
    const filePath = path_1.default.join(modelsDir, `${modelName}.ts`);
    if (!fs_1.default.existsSync(modelsDir)) {
        fs_1.default.mkdirSync(modelsDir, { recursive: true });
    }
    const content = `import { Model } from "../core/Model";

export class ${modelName} extends Model {
  protected table = "${name.toLowerCase()}s";
  
  id!: number;
  created_at!: Date;
  updated_at!: Date;
}
`;
    if (fs_1.default.existsSync(filePath)) {
        console.log(chalk_1.default.yellow(`⚠️  Model ${modelName} already exists.`));
        return;
    }
    fs_1.default.writeFileSync(filePath, content);
    console.log(chalk_1.default.green(`✅ Model ${modelName} created successfully at ${filePath}`));
}
*/