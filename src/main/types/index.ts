// src/main/connection/types.ts

export enum DbType {
  POSTGRESQL = 'postgresql',
  MONGODB = 'mongodb',
  MYSQL = 'mysql',
  SQLITE3 = 'sqlite3'
}

export interface ConnectionConfig {
  id: string;
  name: string;
  type: DbType;
  postgresql?: PostgresConfig;
  mongodb?: string;
  mysql?: MySQLConfig;
  sqlite3?: SQLiteConfig;
}

export type PostgresConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

export type MySQLConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
};

export type SQLiteConfig = {
  filePath: string;
  readonly?: boolean;
};

export interface TableInfo {
  name: string;
  type: 'table' | 'collection';
  schema?: string;
  columns?: Array<{
    name: string;
    is_nullable: string;
    type: string;
  }>;
  relationships?: Array<{
    column: string;
    references: {
      table: string;
      column: string;
    };
  }>;
}

export type StoredConnection = {
  id: string;
  name: string;
  type: DbType;
  encryptedConfig: string; // base64 string
};

export interface ResultData {
  headers: string[];
  rows: Record<string, any>[];
}

export interface ExportFormat {
  version: number;
  exportDate: string;
  connections: StoredConnection[];
}

// Import strategies
export type ImportStrategy = 'replace' | 'merge' | 'skip-duplicates';
