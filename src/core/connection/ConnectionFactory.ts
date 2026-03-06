import {
  connectDB,
  closeMongoClient,
  ConnectionName,
} from "./DatabaseConnection";
import { createAdapter } from "./DriverAdapter";
import type { DriverAdapter } from "./DriverAdapter";
import { dbConfig } from "../../config/database";

export type { ConnectionName };

const connectionCache: Partial<Record<ConnectionName, ConnectionInstance>> = {};
const adapterCache: Partial<Record<ConnectionName, DriverAdapter>> = {};
const connectionInitCache: Partial<Record<ConnectionName, Promise<ConnectionInstance>>> = {};
const adapterInitCache: Partial<Record<ConnectionName, Promise<DriverAdapter>>> = {};
type ConnectionInstance = any;

/**
 * Get or create a connection from the factory.
 * Lazily initializes and caches the connection.
 */
export async function getConnection(name: ConnectionName): Promise<ConnectionInstance> {
  if (connectionCache[name]) {
    return connectionCache[name] as ConnectionInstance;
  }

  if (connectionInitCache[name]) {
    return await connectionInitCache[name];
  }

  console.log(`Creating new ${name} connection...`);
  const initPromise = connectDB(name)
    .then((connection) => {
      connectionCache[name] = connection;
      return connection;
    })
    .finally(() => {
      delete connectionInitCache[name];
    });

  connectionInitCache[name] = initPromise;
  return await initPromise;
}

/**
 * Get or create a driver adapter for SQL connections.
 */
export async function getAdapter(name: ConnectionName): Promise<DriverAdapter> {
  if (adapterCache[name]) {
    return adapterCache[name] as DriverAdapter;
  }

  if (adapterInitCache[name]) {
    return await adapterInitCache[name];
  }

  const initPromise = getConnection(name)
    .then((conn) => {
      const adapter = createAdapter(name, conn);
      adapterCache[name] = adapter;
      return adapter;
    })
    .finally(() => {
      delete adapterInitCache[name];
    });

  adapterInitCache[name] = initPromise;
  return await initPromise;
}

/**
 * Gracefully close all cached DB connections.
 */
export async function closeAllConnections(): Promise<void> {
  const inFlightConnections = Object.values(connectionInitCache).filter(
    (promise): promise is Promise<ConnectionInstance> => Boolean(promise)
  );
  const inFlightAdapters = Object.values(adapterInitCache).filter(
    (promise): promise is Promise<DriverAdapter> => Boolean(promise)
  );
  if (inFlightConnections.length > 0 || inFlightAdapters.length > 0) {
    await Promise.allSettled([...inFlightConnections, ...inFlightAdapters]);
  }

  for (const [name, conn] of Object.entries(connectionCache)) {
    if (!conn) continue;

    const connectionName = name as ConnectionName;
    const driver = dbConfig.connections[connectionName]?.driver;

    try {
      switch (driver) {
        case "mysql":
        case "pg":
          if (typeof (conn as { end?: () => Promise<void> | void }).end === "function") {
            await (conn as { end: () => Promise<void> | void }).end();
          }
          break;

        case "sqlite":
          if (typeof (conn as { close?: () => Promise<void> | void }).close === "function") {
            await (conn as { close: () => Promise<void> | void }).close();
          }
          break;

        case "mongo": {
          const closedByTracker = await closeMongoClient(conn as ConnectionInstance);
          if (!closedByTracker) {
            const maybeClose = conn as { close?: () => Promise<void> | void };
            if (typeof maybeClose.close === "function") {
              await maybeClose.close();
            }
          }
          break;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("closed state")) {
        console.error(`Error closing ${connectionName}:`, err);
      }
    }

    delete connectionCache[connectionName];
    delete adapterCache[connectionName];
    delete connectionInitCache[connectionName];
    delete adapterInitCache[connectionName];
    console.log(`Closed ${connectionName} connection.`);
  }
}
