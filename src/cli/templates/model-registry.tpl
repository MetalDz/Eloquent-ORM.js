import { registerModels, type RegisterModelsOptions } from "{{packageImportPath}}";
{{#each models}}
import { {{name}} } from "{{importPath}}";
{{/each}}

export const {{modelsConstName}} = [
{{#each models}}
  {{name}},
{{/each}}
] as const;

export function {{functionName}}(
  options: RegisterModelsOptions = {},
): void {
  registerModels([...{{modelsConstName}}], options);
}
