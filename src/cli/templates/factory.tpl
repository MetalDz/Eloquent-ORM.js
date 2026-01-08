import { Factory } from "../utils/Factory";
import { {{ModelName}} } from '../models/{{ModelName}}';
import { BaseModel } from '../../model/BaseModel';
{{#each relationImports}}
{{this}}
{{/each}}

export class {{FactoryName}} extends Factory<{{ModelName}}> {
  model = {{ModelName}};

  definition(index = 0): Partial<{{ModelName}}> {
    return {
{{#each fields}}
      {{name}}: {{fakerPath}},
{{/each}}
    };
  }

  {{#if hasRelations}}
  /**
   * Auto-generated relation wiring.
   * Uses BaseModel set/save and Factory.related / relatedPivot helpers.
   */
  async afterCreate(instance: {{ModelName}}): Promise<void> {
{{#each relations}}
    {{#if target}}
      {{!-- belongsTo --}}
      {{#if (eq type "belongsTo")}}
    try {
      const related = await this.related(new {{target}}Factory());
      // set FK on this instance and persist
      (instance as unknown as BaseModel).set('{{foreignKey}}' as keyof {{ModelName}}, (related as unknown as BaseModel).id as number);
      if (typeof (instance as unknown as BaseModel).save === "function") {
        await (instance as unknown as BaseModel).save();
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[factory] afterCreate {{FactoryName}} -> belongsTo '{{name}}' failed:`, err);
      throw err;
    }
      {{/if}}

      {{!-- hasMany --}}
      {{#if (eq type "hasMany")}}
    try {
      const count = 1;
      const children = await this.related(new {{target}}Factory(), count) as Array<InstanceType<typeof {{target}}Factory> extends { model: infer M } ? M : unknown>;
      for (const child of children) {
        // set child's FK to this instance id and persist
        (child as unknown as BaseModel).set('{{foreignKey}}' as keyof typeof child, (instance as unknown as BaseModel).id as number);
        if (typeof (child as unknown as BaseModel).save === "function") {
          await (child as unknown as BaseModel).save();
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[factory] afterCreate {{FactoryName}} -> hasMany '{{name}}' failed:`, err);
      throw err;
    }
      {{/if}}

      {{!-- belongsToMany --}}
      {{#if (eq type "belongsToMany")}}
    try {
      // create one related record
      const related = await this.related(new {{target}}Factory());

      {{#if isPivot}}
      // Use pivot factory to create join record(s)
      await this.relatedPivot(
        new {{ModelName}}{{target}}PivotFactory(),
        "{{pivotTable}}",
        "{{foreignKey}}",
        "{{relatedKey}}",
        (instance as unknown as BaseModel).id as number,
        [ (related as unknown as BaseModel).id as number ]
      );
      {{else}}
      // fallback: if relation attach exists on model, try using it
      // @ts-ignore - runtime attach method may be present on model instances
      if (typeof (instance as any).{{name}} === "function" && typeof (instance as any).{{name}}().attach === "function") {
        // @ts-ignore
        await (instance as any).{{name}}().attach([ (related as unknown as BaseModel).id ]);
      }
      {{/if}}
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[factory] afterCreate {{FactoryName}} -> belongsToMany '{{name}}' failed:`, err);
      throw err;
    }
      {{/if}}

      {{!-- morphTo --}}
      {{#if (eq type "morphTo")}}
    try {
      const related = await this.related(new {{target}}Factory());
      {{#if foreignKey}}
      (instance as unknown as BaseModel).set('{{foreignKey}}' as keyof {{ModelName}}, (related as unknown as BaseModel).id as number);
      if (typeof (instance as unknown as BaseModel).save === "function") {
        await (instance as unknown as BaseModel).save();
      }
      {{/if}}
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[factory] afterCreate {{FactoryName}} -> morphTo '{{name}}' failed:`, err);
      throw err;
    }
      {{/if}}

      {{!-- morphMany --}}
      {{#if (eq type "morphMany")}}
    try {
      const count = 1;
      const children = await this.related(new {{target}}Factory(), count) as Array<InstanceType<typeof {{target}}Factory> extends { model: infer M } ? M : unknown>;
      for (const child of children) {
        (child as unknown as BaseModel).set('{{morphName}}Id' as keyof typeof child, (instance as unknown as BaseModel).id as number);
        (child as unknown as BaseModel).set('{{morphName}}Type' as keyof typeof child, '{{ModelName}}' as unknown as string);
        if (typeof (child as unknown as BaseModel).save === "function") {
          await (child as unknown as BaseModel).save();
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[factory] afterCreate {{FactoryName}} -> morphMany '{{name}}' failed:`, err);
      throw err;
    }
      {{/if}}

    {{/if}}
{{/each}}
  }
  {{else}}
  // No relations detected for {{ModelName}}
  {{/if}}
}
