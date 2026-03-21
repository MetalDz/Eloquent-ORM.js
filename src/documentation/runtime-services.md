# Runtime Services

Last updated: 2026-03-19

Services are the main application boundary for runtime behavior.

## Core rule

Services should own:

- CRUD orchestration
- query composition
- eager loading
- restore flows
- cache reads and invalidation

## Preferred CRUD service contract

```ts
export class UserService {
  async find(id: number | string) {
    return User.find(id);
  }

  async create(data: Record<string, unknown>) {
    return User.create(data);
  }

  async createMany(rows: Record<string, unknown>[]) {
    return User.createMany(rows);
  }

  async update(id: number | string, data: Record<string, unknown>) {
    const user = await User.find(id);
    if (!user) return null;
    user.update(data);
    await user.save();
    return user;
  }

  async delete(id: number | string) {
    return User.deleteById(id);
  }

  async restore(id: number | string) {
    return User.restoreById(id);
  }

  async deactivateMany(ids: Array<number | string>) {
    await User.updateMany(ids, { status: "inactive" });
  }
}
```
