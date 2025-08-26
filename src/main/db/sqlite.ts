// src/main/db/sqlite.ts

import Database from 'better-sqlite3';
import { SQLiteConfig } from '../types';
import log from 'electron-log';
import { existsSync } from 'fs';
import { dirname } from 'path';
import { mkdirSync } from 'fs';

export class SQLite {
  private db: Database.Database | null = null;

  constructor(private config: SQLiteConfig) {}

  async connect(): Promise<void> {
    try {
      // Ensure directory exists for the database file
      const dbDir = dirname(this.config.filePath);
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
      }

    this.db = new Database(this.config.filePath, {
      readonly: this.config.readonly || false,
      fileMustExist: false,
      timeout: 5000,
      verbose: (message) => log.debug('SQLite:', message)
    });

      // Test the connection with a simple query
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 1000000');
      this.db.pragma('foreign_keys = true');
      this.db.pragma('temp_store = memory');

      log.info('SQLite connection established successfully');
    } catch (error: any) {
      log.error('Failed to connect to SQLite:', error.message);
      throw new Error(`SQLite connection failed: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      log.info('SQLite connection closed');
    }
  }

  async getSchemaVisualization() {
    if (!this.db) {
      throw new Error('SQLite connection not established');
    }

    try {
      // Get all tables (excluding system tables)
      const tablesQuery = `
        SELECT name 
        FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name;
      `;

      const tables = this.db.prepare(tablesQuery).all() as { name: string }[];
      const tableSchemas: Record<string, any> = {};

      // Get column information for each table
      for (const table of tables) {
        const columnsQuery = `PRAGMA table_info(${table.name})`;
        const columns = this.db.prepare(columnsQuery).all() as Array<{
          cid: number;
          name: string;
          type: string;
          notnull: number;
          dflt_value: any;
          pk: number;
        }>;

        // Get foreign key information
        const foreignKeysQuery = `PRAGMA foreign_key_list(${table.name})`;
        const foreignKeys = this.db.prepare(foreignKeysQuery).all() as Array<{
          id: number;
          seq: number;
          table: string;
          from: string;
          to: string;
          on_update: string;
          on_delete: string;
          match: string;
        }>;

        tableSchemas[table.name] = {
          columns: columns.map(col => ({
            name: col.name,
            type: col.type,
            is_nullable: col.notnull === 0 ? 'YES' : 'NO',
            isPrimaryKey: col.pk === 1,
            defaultValue: col.dflt_value
          })),
          relationships: foreignKeys.map(fk => ({
            column: fk.from,
            references: {
              table: fk.table,
              column: fk.to
            }
          }))
        };
      }

      return Object.keys(tableSchemas)
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({
          name,
          type: 'table',
          schema: 'main',
          columns: tableSchemas[name].columns,
          relationships: tableSchemas[name].relationships
        }));
    } catch (error: any) {
      log.error('Error fetching SQLite schema:', error.message);
      throw error;
    }
  }

  async executeQuery(query: string): Promise<any[]> {
    if (!this.db) {
      throw new Error('SQLite connection not established');
    }

    try {
      const trimmedQuery = query.trim().toUpperCase();
      
      if (trimmedQuery.startsWith('SELECT') || 
          trimmedQuery.startsWith('WITH') || 
          trimmedQuery.startsWith('PRAGMA')) {
        // For SELECT queries, return the rows
        const stmt = this.db.prepare(query);
        return stmt.all() as any[];
      } else {
        // For INSERT, UPDATE, DELETE queries
        const stmt = this.db.prepare(query);
        const result = stmt.run();
        
        return [{
          changes: result.changes,
          lastInsertRowid: result.lastInsertRowid,
          message: `Query executed successfully. ${result.changes} row(s) affected.`
        }];
      }
    } catch (error: any) {
      log.error('SQLite query error:', error.message);
      throw error;
    }
  }

  // Utility method to get database info
  async getDatabaseInfo(): Promise<any> {
    if (!this.db) {
      throw new Error('SQLite connection not established');
    }

    try {
      const info = {
        filePath: this.config.filePath,
        readonly: this.config.readonly || false,
        pageSize: this.db.pragma('page_size', { simple: true }),
        pageCount: this.db.pragma('page_count', { simple: true }),
        journalMode: this.db.pragma('journal_mode', { simple: true }),
        synchronous: this.db.pragma('synchronous', { simple: true }),
        foreignKeys: this.db.pragma('foreign_keys', { simple: true }),
        userVersion: this.db.pragma('user_version', { simple: true })
      };

      return info;
    } catch (error: any) {
      log.error('Error getting SQLite database info:', error.message);
      throw error;
    }
  }
}