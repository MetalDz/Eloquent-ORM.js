"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeController = makeController;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
function makeController(name) {
    const controllerName = name.charAt(0).toUpperCase() + name.slice(1) + "Controller";
    const controllersDir = path_1.default.resolve("src/controllers");
    const filePath = path_1.default.join(controllersDir, `${controllerName}.ts`);
    if (!fs_1.default.existsSync(controllersDir)) {
        fs_1.default.mkdirSync(controllersDir, { recursive: true });
    }
    const content = `export class ${controllerName} {
  index() {
    console.log("Showing list of ${name}s");
  }
}
`;
    if (fs_1.default.existsSync(filePath)) {
        console.log(chalk_1.default.yellow(`⚠️  Controller ${controllerName} already exists.`));
        return;
    }
    fs_1.default.writeFileSync(filePath, content);
    console.log(chalk_1.default.green(`✅ Controller ${controllerName} created successfully at ${filePath}`));
}
