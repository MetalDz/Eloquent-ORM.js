import { connectDB, ConnectionName } from "./DatabaseConnection";

type ConnectionInstance = any;
const connectionCache: Partial<Record<ConnectionName, ConnectionInstance>> = {};

/**
 * Get or create a connection from the factory.
 * Lazily initializes and caches the connection.
 */
export async function getConnection(name: ConnectionName): Promise<ConnectionInstance> {
  if (!connectionCache[name]) {
    console.log(`🔌 Creating new ${name} connection...`);
    connectionCache[name] = await connectDB(name);
  } else {
    // Already created
    // console.log(`♻️ Reusing existing ${name} connection`);
  }

  return connectionCache[name];
}

/**
 * Gracefully close all connections (useful in app shutdown)
 */
export async function closeAllConnections(): Promise<void> {
  for (const [name, conn] of Object.entries(connectionCache)) {
    try {
      if (!conn) continue;

      if (name === "mysql" && conn.end) {
        await conn.end();
      } else if (name === "pg" && conn.end) {
        await conn.end();
      } else if (name === "sqlite" && conn.close) {
        await conn.close();
      }

      console.log(`🔒 Closed ${name} connection.`);
    } catch (err) {
      console.error(`❌ Error closing ${name}:`, err);
    }
  }
}
