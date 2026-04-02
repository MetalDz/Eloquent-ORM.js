import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let cachedFaker;
function getFaker() {
    if (!cachedFaker) {
        cachedFaker = require("@faker-js/faker").faker;
    }
    return cachedFaker;
}
export class Factory {
    get faker() {
        return getFaker();
    }
    async create(attrs = {}, index = 0) {
        const base = this.definition(index);
        const merged = { ...base, ...attrs };
        if (this.beforeCreate) {
            const modified = await this.beforeCreate(merged, index);
            if (modified && typeof modified === "object") {
                Object.assign(merged, modified);
            }
        }
        let instance = new this.model();
        if (this.hasInstanceCreate(instance)) {
            const created = await instance.create(merged);
            if (created) {
                instance = created;
            }
        }
        else if (this.hasStaticCreate(this.model)) {
            return this.model.create(merged);
        }
        else if (this.hasInstanceSave(instance)) {
            Object.assign(instance, merged);
            await instance.save();
        }
        else {
            throw new Error(`Model '${this.model.name}' has no valid create/save method.`);
        }
        if (this.afterCreate) {
            await this.afterCreate(instance);
        }
        return instance;
    }
    async createMany(count, callback, concurrency = 1) {
        const results = [];
        const executeCreate = async (itemIndex) => {
            const model = await this.create({}, itemIndex);
            if (callback) {
                await callback(model, itemIndex);
            }
            results[itemIndex] = model;
        };
        if (concurrency <= 1) {
            for (let itemIndex = 0; itemIndex < count; itemIndex += 1) {
                await executeCreate(itemIndex);
            }
            return results;
        }
        let active = 0;
        let itemIndex = 0;
        let settled = false;
        return new Promise((resolve, reject) => {
            const maybeResolve = () => {
                if (!settled && itemIndex >= count && active === 0) {
                    settled = true;
                    resolve(results);
                }
            };
            const next = () => {
                if (settled) {
                    return;
                }
                while (active < concurrency && itemIndex < count && !settled) {
                    const currentIndex = itemIndex++;
                    active += 1;
                    void executeCreate(currentIndex)
                        .catch((error) => {
                        if (settled) {
                            return;
                        }
                        settled = true;
                        reject(error);
                    })
                        .finally(() => {
                        active -= 1;
                        if (settled) {
                            return;
                        }
                        next();
                    });
                }
                maybeResolve();
            };
            next();
        });
    }
    async related(factoryOrCtor, count = 1) {
        const factory = typeof factoryOrCtor === "function"
            ? new factoryOrCtor()
            : factoryOrCtor;
        if (count === 1) {
            return factory.create();
        }
        return factory.createMany(count);
    }
    async relatedPivot(factory, pivotTable, foreignKey, relatedKey, foreignId, relatedIds, extraPivotAttrs) {
        await factory.createPivot(foreignId, relatedIds, extraPivotAttrs);
        console.log(`[Pivot Attached] Table "${pivotTable}" (${foreignKey} -> ${relatedKey})`);
    }
    hasInstanceCreate(obj) {
        return typeof obj.create === "function";
    }
    hasStaticCreate(ctor) {
        return typeof ctor.create === "function";
    }
    hasInstanceSave(obj) {
        return typeof obj.save === "function";
    }
}
