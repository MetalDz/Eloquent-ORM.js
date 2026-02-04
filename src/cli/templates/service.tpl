import { {{ModelName}} } from "{{modelImportPath}}";

export class {{ModelName}}Service {
  async all() {
    return new {{ModelName}}().all();
  }

  async find(id: number | string) {
    return new {{ModelName}}().find(id);
  }

  async create(data: Record<string, unknown>) {
    return new {{ModelName}}().create(data);
  }

  async update(id: number | string, data: Record<string, unknown>) {
    return new {{ModelName}}().update(id, data);
  }

  async delete(id: number | string) {
    return new {{ModelName}}().delete(id);
  }
}
