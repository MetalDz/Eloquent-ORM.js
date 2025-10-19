import { connectDB, ConnectionName } from "./DatabaseConnection";
export type { ConnectionName };

type ConnectionInstance = any;
const connectionCache: Partial<Record<ConnectionName, ConnectionInstance>> = {};

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
      console.log(`🔒 Closed ${name} connection.`);
    } catch (err) {
      console.error(`❌ Error closing ${name}:`, err);
    }
  }
}
