// src/main/db/postgres/client.ts

import { Client } from 'pg';
import { PostgresConfig } from '../types';
import log from 'electron-log';

export class Postgresql {
  private client: Client;

  constructor(private config: PostgresConfig) {
    this.client = new Client(this.config);
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.end();
  }

  async getSchemaVisualization() {
    // First, get all available schemas (excluding system schemas)
    // const schemasQuery = `
    //   SELECT schema_name 
    //   FROM information_schema.schemata 
    //   WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    //   AND schema_name NOT LIKE 'pg_temp_%'
    //   AND schema_name NOT LIKE 'pg_toast_temp_%'
    //   ORDER BY 
    //     CASE WHEN schema_name = 'public' THEN 1 ELSE 2 END,
    //     schema_name;
    // `;

    const columnsQuery = `
      SELECT table_schema, table_name, column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      AND table_schema NOT LIKE 'pg_temp_%'
      AND table_schema NOT LIKE 'pg_toast_temp_%'
      ORDER BY table_schema, table_name, ordinal_position;
    `;

    const relationshipsQuery = `
      SELECT
        tc.table_schema AS table_schema,
        tc.table_name AS table_name,
        kcu.column_name AS column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      AND tc.table_schema NOT LIKE 'pg_temp_%'
      AND tc.table_schema NOT LIKE 'pg_toast_temp_%';
    `;

    try {
      const [columnsResult, relationshipsResult] = await Promise.all([
        this.client.query(columnsQuery),
        this.client.query(relationshipsQuery)
      ]);

      const tables: Record<string, any> = {};

      // Process columns by schema.table
      columnsResult.rows.forEach(({ table_schema, table_name, column_name, is_nullable, data_type }) => {
        const tableKey = `${table_schema}.${table_name}`;
        if (!tables[tableKey]) {
          tables[tableKey] = { 
            schema: table_schema,
            name: table_name,
            columns: [], 
            relationships: [] 
          };
        }
        tables[tableKey].columns.push({ name: column_name, is_nullable, type: data_type });
      });

      // Process relationships
      relationshipsResult.rows.forEach(
        ({ table_schema, table_name, column_name, foreign_table_schema, foreign_table_name, foreign_column_name }) => {
          const tableKey = `${table_schema}.${table_name}`;
          if (tables[tableKey]) {
            tables[tableKey].relationships.push({
              column: column_name,
              references: { 
                table: foreign_table_name, 
                column: foreign_column_name,
                schema: foreign_table_schema
              }
            });
          }
        }
      );

      // Return sorted tables with schema information
      return Object.keys(tables)
        .sort((a, b) => {
          const [schemaA, tableA] = a.split('.');
          const [schemaB, tableB] = b.split('.');
          
          // Sort by schema first (public first), then by table name
          if (schemaA !== schemaB) {
            if (schemaA === 'public') return -1;
            if (schemaB === 'public') return 1;
            return schemaA.localeCompare(schemaB);
          }
          return tableA.localeCompare(tableB);
        })
        .map((tableKey) => ({
          name: tables[tableKey].name,
          type: 'table',
          schema: tables[tableKey].schema,
          columns: tables[tableKey].columns,
          relationships: tables[tableKey].relationships
        }));
    } catch (error: any) {
      log.error('Error fetching PostgreSQL schema:', error.message);
      throw error;
    }
  }

  async executeQuery(query: string): Promise<any[]> {
    const result = await this.client.query(query);
    return result.rows;
  }
}
