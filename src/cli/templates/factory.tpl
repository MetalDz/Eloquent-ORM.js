import { Factory } from "../utils/Factory"
import { {{ModelName}} } from '../models/{{ModelName}}'

export class {{FactoryName}} extends Factory<{{ModelName}}> {
  model = {{ModelName}}

  definition() {
    return {
      {{#each fields}}
      {{name}}: this.faker.{{fakerPath}},
      {{/each}}
    }
  }

  {{#if hasRelations}}
  async afterCreate(instance: {{ModelName}}): Promise<void> {
    {{#each relations}}
      await this.related(new {{relationFactory}}());
    {{/each}}
  }
  {{else}}
  // No relations detected
  {{/if}}
}
