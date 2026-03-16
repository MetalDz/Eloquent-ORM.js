import { Factory } from "{{packageImportPath}}";
import { {{ModelName}} } from "../../models/{{ModelName}}";

export class {{FactoryName}} extends Factory<{{ModelName}}> {
  model = {{ModelName}};

  definition(index = 0): Partial<{{ModelName}}> {
    return {
{{#each fields}}
      {{name}}: this.faker.{{fakerPath}},
{{/each}}
    };
  }
}
