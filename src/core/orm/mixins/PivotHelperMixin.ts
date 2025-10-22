export function PivotHelperMixin<
  TBase extends new (...args: any[]) => {
    tableName: string;
    connectionName: string;
    getDB(): Promise<any>;
  }
>(Base: TBase) {
  return class extends Base {
    async attach(pivotTable: string, foreignKey: string, relatedKey: string, id: string | number, relatedIds: (string | number)[]) {
      const db = await this.getDB();
      const rows = relatedIds.map((rid) => ({ [foreignKey]: id, [relatedKey]: rid }));

      switch (this.connectionName) {
        case "sqlite":
        case "mysql":
        case "pg":
          for (const row of rows) {
            const keys = Object.keys(row);
            const placeholders = keys.map(() => "?").join(", ");
            const sql = `INSERT INTO ${pivotTable} (${keys.join(", ")}) VALUES (${placeholders})`;
            await db.run?.(sql, Object.values(row)) ?? db.query?.(sql, Object.values(row));
          }
          break;
        case "mongo":
          await db.collection(pivotTable).insertMany(rows);
          break;
      }
    }

    async detach(pivotTable: string, foreignKey: string, id: string | number) {
      const db = await this.getDB();
      switch (this.connectionName) {
        case "sqlite":
          await db.run?.(`DELETE FROM ${pivotTable} WHERE ${foreignKey} = ?`, [id]);
          break;
        case "mysql":
        case "pg":
          await db.query?.(`DELETE FROM ${pivotTable} WHERE ${foreignKey} = ?`, [id]);
          break;
        case "mongo":
          await db.collection(pivotTable).deleteMany({ [foreignKey]: id });
          break;
      }
    }

    async sync(pivotTable: string, foreignKey: string, relatedKey: string, id: string | number, relatedIds: (string | number)[]) {
      await this.detach(pivotTable, foreignKey, id);
      await this.attach(pivotTable, foreignKey, relatedKey, id, relatedIds);
    }
  };
}
