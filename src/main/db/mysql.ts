// src/main/db/mysql.ts

import mysql from 'mysql2/promise';
import { MySQLConfig } from '../types';
import log from 'electron-log';

export class MySQL {
  private connection: mysql.Connection | null = null;

  constructor(private config: MySQLConfig) {}

  async connect(): Promise<void> {
    try {
      this.connection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        // ssl: this.config.ssl || false,
        // ssl: {
        //   rejectUnauthorized: false
        // },
        connectTimeout: 10000
      });

      // Test the connection
      await this.connection.ping();
      log.info('MySQL connection established successfully');
    } catch (error: any) {
      log.error('Failed to connect to MySQL:', error.message);
      throw new Error(`MySQL connection failed: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
      log.info('MySQL connection closed');
    }
  }

  async getSchemaVisualization() {
    if (!this.connection) {
      throw new Error('MySQL connection not established');
    }

    const columnsQuery = `
      SELECT 
        TABLE_NAME as table_name,
        COLUMN_NAME as column_name,
        IS_NULLABLE as is_nullable,
        DATA_TYPE as data_type,
        TABLE_SCHEMA as table_schema
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME, ORDINAL_POSITION;
    `;

    const relationshipsQuery = `
      SELECT 
        TABLE_NAME as table_name,
        COLUMN_NAME as column_name,
        REFERENCED_TABLE_NAME as foreign_table_name,
        REFERENCED_COLUMN_NAME as foreign_column_name
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? 
        AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY TABLE_NAME;
    `;

    try {
      const [columnsResult] = await this.connection.execute(columnsQuery, [this.config.database]);
      const [relationshipsResult] = await this.connection.execute(relationshipsQuery, [this.config.database]);

      const tables: Record<string, any> = {};

      // Process columns
      (columnsResult as any[]).forEach(({ table_name, column_name, is_nullable, data_type }) => {
        if (!tables[table_name]) {
          tables[table_name] = { columns: [], relationships: [] };
        }
        tables[table_name].columns.push({ 
          name: column_name, 
          is_nullable, 
          type: data_type 
        });
      });

      // Process relationships
      (relationshipsResult as any[]).forEach(
        ({ table_name, column_name, foreign_table_name, foreign_column_name }) => {
          if (tables[table_name]) {
            tables[table_name].relationships.push({
              column: column_name,
              references: { table: foreign_table_name, column: foreign_column_name }
            });
          }
        }
      );

      return Object.keys(tables)
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({
          name,
          type: 'table',
          schema: this.config.database,
          columns: tables[name].columns,
          relationships: tables[name].relationships
        }));
    } catch (error: any) {
      log.error('Error fetching MySQL schema:', error.message);
      throw error;
    }
  }

  async executeQuery(query: string): Promise<any[]> {
    if (!this.connection) {
      throw new Error('MySQL connection not established');
    }

    try {
      const [rows] = await this.connection.execute(query);
      
      // Handle different types of results
      if (Array.isArray(rows)) {
        return rows as any[];
      } else {
        // For non-SELECT queries (INSERT, UPDATE, DELETE)
        const result = rows as mysql.ResultSetHeader;
        return [{
          affectedRows: result.affectedRows,
          insertId: result.insertId,
          changedRows: result.changedRows || 0,
          message: result.info || 'Query executed successfully'
        }];
      }
    } catch (error: any) {
      log.error('MySQL query error:', error.message);
      throw error;
    }
  }
}