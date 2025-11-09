import { Request, Response } from "express";
import { {{PascalCase}}Service } from "@/app/services/{{PascalCase}}Service";
import { {{PascalCase}} } from "@/app/models/{{PascalCase}}";

export class {{PascalCase}}Controller {
  private service = new {{PascalCase}}Service();

  // GET /{{camelCase}}
  async index(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.service.all();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /{{camelCase}}/:id
  async show(req: Request, res: Response): Promise<void> {
    try {
      const item = await this.service.find(req.params.id);
      if (!item) return res.status(404).json({ message: "{{PascalCase}} not found" });
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /{{camelCase}}
  async store(req: Request, res: Response): Promise<void> {
    try {
      const created = await this.service.create(req.body);
      res.status(201).json(created);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  // PUT /{{camelCase}}/:id
  async update(req: Request, res: Response): Promise<void> {
    try {
      const updated = await this.service.update(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "{{PascalCase}} not found" });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  // DELETE /{{camelCase}}/:id
  async destroy(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await this.service.delete(req.params.id);
      if (!deleted) return res.status(404).json({ message: "{{PascalCase}} not found" });
      res.json({ message: "{{PascalCase}} deleted successfully" });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  {{softDelete && `
  // PATCH /{{camelCase}}/:id/restore
  async restore(req: Request, res: Response): Promise<void> {
    try {
      const restored = await this.service.restore(req.params.id);
      if (!restored) return res.status(404).json({ message: "{{PascalCase}} not found or already restored" });
      res.json({ message: "{{PascalCase}} restored successfully" });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
  `}}
}
