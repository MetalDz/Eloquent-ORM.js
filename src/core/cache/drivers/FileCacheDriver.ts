// src/core/cache/drivers/FileCacheDriver.ts
import { CacheDriver } from "../CacheDriver";
import fs from "fs/promises";
import path from "path";

type FileEntry = { value: any; expiresAt: number | null };

export class FileCacheDriver extends CacheDriver {
  private dir: string;

  constructor(dir = ".cache") {
    super();
    this.dir = dir;
    // create dir synchronously-safe at startup; callers should handle errors
    fs.mkdir(this.dir, { recursive: true }).catch(() => {});
  }

  private filePath(key: string) {
    // sanitize key-ish (hash the key in production). Here we keep simple.
    const safe = encodeURIComponent(key);
    return path.join(this.dir, `${safe}.json`);
  }

  async get<T = any>(key: string): Promise<T | null> {
    const file = this.filePath(key);
    try {
      const raw = await fs.readFile(file, "utf8");
      const e: FileEntry = JSON.parse(raw);
      if (e.expiresAt && Date.now() > e.expiresAt) {
        await fs.unlink(file).catch(() => {});
        return null;
      }
      return e.value as T;
    } catch (err) {
      return null;
    }
  }

  async set<T = any>(key: string, value: T, ttl = 60): Promise<void> {
    const file = this.filePath(key);
    const expiresAt = ttl > 0 ? Date.now() + ttl * 1000 : null;
    const data: FileEntry = { value, expiresAt };
    await fs.writeFile(file, JSON.stringify(data), "utf8");
  }

  async delete(key: string): Promise<void> {
    const file = this.filePath(key);
    await fs.unlink(file).catch(() => {});
  }

  async clear(): Promise<void> {
    const files = await fs.readdir(this.dir).catch(() => []);
    await Promise.all(files.map(f => fs.unlink(path.join(this.dir, f)).catch(() => {})));
  }
}
