// src/types/db.types.d.ts
declare module "db.types" {
  export type ConnectionName = "mysql" | "pg" | "sqlite" | "mongo";

  export interface SqlConnection {
    query<T = any>(sql: string, params?: any[]): Promise<[T[], any]>;
  }

  export interface SqliteConnection {
    run(sql: string, params?: any[]): Promise<any>;
    get<T = any>(sql: string, params?: any[]): Promise<T>;
    all<T = any>(sql: string, params?: any[]): Promise<T[]>;
  }

  export interface MongoConnection {
    collection(name: string): {
      find(filter?: Record<string, any>): { toArray(): Promise<any[]> };
      findOne(filter: Record<string, any>): Promise<any>;
      insertOne(doc: any): Promise<{ insertedId: any }>;
      updateOne(filter: any, update: any): Promise<any>;
      deleteOne(filter: any): Promise<any>;
    };
  }

  export type AnyConnection =
    | SqlConnection
    | SqliteConnection
    | MongoConnection;
}
