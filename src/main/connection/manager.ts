// src/main/connection/manager.ts

import { createDatabaseClient, DatabaseClient } from '../db';
import { ConnectionConfig, DbType } from '../types';
import log from 'electron-log';

interface ClientInstance {
  type: DbType;
  client: DatabaseClient;
  tables?: any[];
  lastUsed: number;
}

const ACTIVE_CLIENTS: Map<string, ClientInstance> = new Map();

export function getActiveClient(id: string): ClientInstance | null {
  return ACTIVE_CLIENTS.get(id) || null;
}

export async function getSchemaVisualization(id: string, config: ConnectionConfig): Promise<any[]> {
  const client = await createDatabaseClient(config);
  await client.connect();

  const tables = await client.getSchemaVisualization();

  ACTIVE_CLIENTS.set(id, {
    type: config.type,
    client,
    tables,
    lastUsed: Date.now()
  });

  return tables;
}

export async function removeActiveClient(id: string): Promise<void> {
  const instance = ACTIVE_CLIENTS.get(id);
  if (instance) {
    try {
      if (instance.type === DbType.POSTGRESQL) await instance.client.disconnect();
    } catch (err) {
      log.error(`Error disconnecting client ${id}:`, err);
    }
    ACTIVE_CLIENTS.delete(id);
  }
}

export async function clearAllClients(): Promise<void> {
  for (const id of Array.from(ACTIVE_CLIENTS.keys())) {
    await removeActiveClient(id);
  }
}
