// src/main/store/secure-store.ts
import Store from 'electron-store';
import { decrypt, encrypt } from './crypto';
import { ConnectionConfig, DbType, StoredConnection } from '../types';
// import log from 'electron-log';

// Initialize store
const store = new Store({
  defaults: {
    connections: []
  }
});

export function saveEncryptedConnection(config: ConnectionConfig, encryptionKey: string): void {
  function getConfig(dbType: DbType) {
    switch (dbType) {
      case DbType.POSTGRESQL:
        return config.postgresql;
      case DbType.MONGODB:
        return config.mongodb;
      case DbType.MYSQL:
        return config.mysql;
      case DbType.SQLITE3:
        return config.sqlite3;
      default:
        return null;
    }
  }

  const obj = getConfig(config.type);
  const encrypted = encrypt(JSON.stringify(obj), encryptionKey);
  const newConnection: StoredConnection = {
    id: config.id,
    name: config.name,
    type: config.type,
    encryptedConfig: encrypted
  };

  store.set('connections', [...getAllConnections(), newConnection]);
}

export function getAllConnections(): StoredConnection[] {
  return (store.get('connections') as StoredConnection[]) || [];
}

export function storeConnections(connections: StoredConnection[]): void {
  store.set('connections', connections);
}

export function getDecryptedConnection(id: string, encryptionKey: string): any {
  const connections = getAllConnections();
  const connection = connections.find((conn) => conn.id === id);

  if (!connection) throw new Error(`Connection not found: ${id}`);

  try {
    return {
      ...connection,
      [connection.type]: JSON.parse(decrypt(connection.encryptedConfig, encryptionKey))
    };
  } catch (error) {
    throw new Error('Failed to decrypt configuration. Wrong encryption key?');
  }
}

export function deleteConnection(id: string): void {
  const connections = getAllConnections().filter((conn) => conn.id !== id);
  store.set('connections', connections);
}

export function updateEncryptedConnection(id: string, name: string): void {
  const connections = getAllConnections().map((conn) =>
    conn.id === id ? { ...conn, name } : conn
  );
  store.set('connections', connections);
}
