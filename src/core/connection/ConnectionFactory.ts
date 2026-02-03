import { connectDB, ConnectionName } from "./DatabaseConnection";
import { createAdapter } from "./DriverAdapter";
import type { DriverAdapter } from "./DriverAdapter";
export type { ConnectionName };

type ConnectionInstance = any;
const connectionCache: Partial<Record<ConnectionName, ConnectionInstance>> = {};
const adapterCache: Partial<Record<ConnectionName, DriverAdapter>> = {};

/**
 * 🏭 Get or create a connection from the factory.
 * Lazily initializes and caches the connection.
 */
export async function getConnection(name: ConnectionName): Promise<ConnectionInstance> {
  if (!connectionCache[name]) {
    console.log(`🔌 Creating new ${name} connection...`);
    connectionCache[name] = await connectDB(name);
  }
  return connectionCache[name];
}

/**
 * Get or create a driver adapter for SQL connections.
 */
export async function getAdapter(name: ConnectionName): Promise<DriverAdapter> {
  if (!adapterCache[name]) {
    const conn = await getConnection(name);
    adapterCache[name] = createAdapter(name, conn);
  }
  return adapterCache[name] as DriverAdapter;
}

/**
 * 🧹 Gracefully close all connections (useful during app shutdown)
 */
export async function closeAllConnections(): Promise<void> {
  for (const [name, conn] of Object.entries(connectionCache)) {
    if (!conn) continue;

    try {
      switch (name) {
        case "mysql":
        case "pg":
          if (conn.end) await conn.end();
          break;

        case "sqlite":
          if (conn.close) await conn.close();
          break;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("closed state")) {
        console.error(`❌ Error closing ${name}:`, err);
      }
    }

    delete connectionCache[name as ConnectionName];
    delete adapterCache[name as ConnectionName];
    console.log(`🔒 Closed ${name} connection.`);
  }
}
