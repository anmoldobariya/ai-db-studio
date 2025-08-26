// src/main/db/index.ts

import { ConnectionConfig, DbType } from '../types';
import { Mongodb } from './mongodb';
import { Postgresql } from './postgresql';
import { MySQL } from './mysql';
import { SQLite } from './sqlite';
// import log from 'electron-log';

export interface DatabaseClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getSchemaVisualization(): Promise<any>;
  executeQuery(query: string): Promise<any[]>;
}

/**
 * Factory to create a database client based on config
 */
export async function createDatabaseClient(config: ConnectionConfig): Promise<DatabaseClient> {
  switch (config.type) {
    case DbType.POSTGRESQL:
      return new Postgresql(config?.postgresql!);

    case DbType.MONGODB:
      return new Mongodb(config?.mongodb!);

    case DbType.MYSQL:
      return new MySQL(config?.mysql!);

    case DbType.SQLITE3:
      return new SQLite(config?.sqlite3!);

    default:
      throw new Error(`Unsupported database type: ${config.type}`);
  }
}
