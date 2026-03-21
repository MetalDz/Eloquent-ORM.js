import { {{ModelName}} } from "{{modelImportPath}}";

export class {{ModelName}}Service {
  async all() {
    return new {{ModelName}}().all();
  }

  async find(id: number | string) {
    return {{ModelName}}.find(id);
  }

  async create(data: Record<string, unknown>) {
    return {{ModelName}}.create(data);
  }

  async createMany(rows: Record<string, unknown>[]) {
    return {{ModelName}}.createMany(rows);
  }

  async update(id: number | string, data: Record<string, unknown>) {
    const model = await {{ModelName}}.find(id);
    if (!model) return null;

    model.update(data);
    await model.save();
    return model;
  }

  async delete(id: number | string) {
    return {{ModelName}}.deleteById(id);
  }

  async restore(id: number | string) {
    return {{ModelName}}.restoreById(id);
  }

  async updateMany(ids: Array<number | string>, data: Record<string, unknown>) {
    return {{ModelName}}.updateMany(ids, data);
  }
}
