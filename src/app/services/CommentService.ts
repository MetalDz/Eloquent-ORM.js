import { Comment } from "../models/Comment";

export class CommentService {
  async all() {
    return new Comment().all();
  }

  async find(id: number | string) {
    return new Comment().find(id);
  }

  async create(data: Record<string, unknown>) {
    return new Comment().create(data);
  }

  async update(id: number | string, data: Record<string, unknown>) {
    return new Comment().update(id, data);
  }

  async delete(id: number | string) {
    return new Comment().delete(id);
  }

  async restore(id: number | string) {
    const model = new Comment() as unknown as { restore?: (value: number | string) => unknown };
    if (typeof model.restore === "function") {
      return model.restore(id);
    }
    throw new Error("Restore not supported for this model.");
  }
}