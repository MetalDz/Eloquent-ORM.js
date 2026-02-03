import { Factory } from "../../../cli/utils/factories/Factory";
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
