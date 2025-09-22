// Schema manager for handling database metadata
import { ConnectionType, TableInfo } from '@renderer/types';

export interface SchemaCache {
  connectionId: string;
  connectionType: ConnectionType;
  tables: TableInfo[];
  lastUpdated: number;
  ttl: number; // Time to live in milliseconds
}

export interface SchemaField {
  name: string;
  type: string;
  description?: string;
}

export interface CollectionSchema {
  name: string;
  fields: SchemaField[];
  sampleCount?: number;
}

export class SchemaManager {
  private static instance: SchemaManager;
  private schemaCache = new Map<string, SchemaCache>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): SchemaManager {
    if (!SchemaManager.instance) {
      SchemaManager.instance = new SchemaManager();
    }
    return SchemaManager.instance;
  }

  private constructor() {}

  /**
   * Get schema for a connection, using cache if available and valid
   */
  public getSchema(connectionId: string): SchemaCache | null {
    const cached = this.schemaCache.get(connectionId);

    if (!cached) {
      return null;
    }

    // Check if cache is still valid
    if (Date.now() - cached.lastUpdated > cached.ttl) {
      this.schemaCache.delete(connectionId);
      return null;
    }

    return cached;
  }

  /**
   * Update schema cache with fresh data
   */
  public updateSchema(
    connectionId: string,
    connectionType: ConnectionType,
    tables: TableInfo[],
    ttl: number = this.DEFAULT_TTL
  ): void {
    // Process tables based on connection type
    const processedTables = this.processTables(connectionType, tables);

    const schemaCache: SchemaCache = {
      connectionId,
      connectionType,
      tables: processedTables,
      lastUpdated: Date.now(),
      ttl
    };

    this.schemaCache.set(connectionId, schemaCache);
  }

  /**
   * Process tables based on connection type to ensure consistency
   */
  private processTables(connectionType: ConnectionType, tables: TableInfo[]): TableInfo[] {
    if (connectionType === ConnectionType.MONGODB) {
      return this.processMongoCollections(tables);
    }

    return this.processSqlTables(tables);
  }

  /**
   * Process MongoDB collections to infer field structure
   */
  private processMongoCollections(collections: TableInfo[]): TableInfo[] {
    return collections.map((collection) => ({
      ...collection,
      type: 'collection',
      // MongoDB collections don't have predefined columns
      // We could potentially sample documents to infer fields in the future
      columns: collection.columns || [],
      relationships: []
    }));
  }

  /**
   * Process SQL tables to ensure consistent structure
   */
  private processSqlTables(tables: TableInfo[]): TableInfo[] {
    return tables.map((table) => ({
      ...table,
      type: table.type || 'table',
      columns: table.columns || [],
      relationships: table.relationships || []
    }));
  }

  /**
   * Clear schema cache for a specific connection
   */
  public clearSchema(connectionId: string): void {
    this.schemaCache.delete(connectionId);
  }

  /**
   * Clear all schema cache
   */
  public clearAllSchema(): void {
    this.schemaCache.clear();
  }

  /**
   * Get table by name from schema
   */
  public getTable(connectionId: string, tableName: string): TableInfo | null {
    const schema = this.getSchema(connectionId);
    if (!schema) {
      return null;
    }

    return (
      schema.tables.find((table) => table.name.toLowerCase() === tableName.toLowerCase()) || null
    );
  }

  /**
   * Get all table names for a connection
   */
  public getTableNames(connectionId: string): string[] {
    const schema = this.getSchema(connectionId);
    if (!schema) {
      return [];
    }

    return schema.tables.map((table) => table.name);
  }

  /**
   * Get all column names for a specific table
   */
  public getColumnNames(connectionId: string, tableName: string): string[] {
    const table = this.getTable(connectionId, tableName);
    if (!table || !table.columns) {
      return [];
    }

    return table.columns.map((column) => column.name);
  }

  /**
   * Search tables by name pattern
   */
  public searchTables(connectionId: string, pattern: string): TableInfo[] {
    const schema = this.getSchema(connectionId);
    if (!schema) {
      return [];
    }

    const lowerPattern = pattern.toLowerCase();
    return schema.tables.filter((table) => table.name.toLowerCase().includes(lowerPattern));
  }

  /**
   * Search columns by name pattern across all tables
   */
  public searchColumns(
    connectionId: string,
    pattern: string
  ): Array<{ table: string; column: string; type: string }> {
    const schema = this.getSchema(connectionId);
    if (!schema) {
      return [];
    }

    const results: Array<{ table: string; column: string; type: string }> = [];
    const lowerPattern = pattern.toLowerCase();

    schema.tables.forEach((table) => {
      if (table.columns) {
        table.columns.forEach((column) => {
          if (column.name.toLowerCase().includes(lowerPattern)) {
            results.push({
              table: table.name,
              column: column.name,
              type: column.type
            });
          }
        });
      }
    });

    return results;
  }

  /**
   * Get foreign key relationships for a table
   */
  public getRelationships(
    connectionId: string,
    tableName: string
  ): Array<{
    column: string;
    references: { table: string; column: string };
  }> {
    const table = this.getTable(connectionId, tableName);
    if (!table || !table.relationships) {
      return [];
    }

    return table.relationships;
  }

  /**
   * Get tables that reference a specific table (reverse foreign keys)
   */
  public getReferencingTables(
    connectionId: string,
    tableName: string
  ): Array<{
    table: string;
    column: string;
    referencedColumn: string;
  }> {
    const schema = this.getSchema(connectionId);
    if (!schema) {
      return [];
    }

    const referencingTables: Array<{
      table: string;
      column: string;
      referencedColumn: string;
    }> = [];

    schema.tables.forEach((table) => {
      if (table.relationships) {
        table.relationships.forEach((rel) => {
          if (rel.references.table.toLowerCase() === tableName.toLowerCase()) {
            referencingTables.push({
              table: table.name,
              column: rel.column,
              referencedColumn: rel.references.column
            });
          }
        });
      }
    });

    return referencingTables;
  }

  /**
   * Generate table statistics for debugging/analysis
   */
  public getSchemaStats(connectionId: string): {
    totalTables: number;
    totalColumns: number;
    totalRelationships: number;
    avgColumnsPerTable: number;
    tablesWithRelationships: number;
  } | null {
    const schema = this.getSchema(connectionId);
    if (!schema) {
      return null;
    }

    let totalColumns = 0;
    let totalRelationships = 0;
    let tablesWithRelationships = 0;

    schema.tables.forEach((table) => {
      totalColumns += table.columns?.length || 0;
      const relCount = table.relationships?.length || 0;
      totalRelationships += relCount;
      if (relCount > 0) {
        tablesWithRelationships++;
      }
    });

    return {
      totalTables: schema.tables.length,
      totalColumns,
      totalRelationships,
      avgColumnsPerTable: schema.tables.length > 0 ? totalColumns / schema.tables.length : 0,
      tablesWithRelationships
    };
  }

  /**
   * Check if schema cache is valid and not expired
   */
  public isSchemaValid(connectionId: string): boolean {
    const schema = this.getSchema(connectionId);
    return schema !== null;
  }

  /**
   * Force refresh schema (clear cache to trigger refetch)
   */
  public refreshSchema(connectionId: string): void {
    this.clearSchema(connectionId);
  }

  /**
   * Export schema cache for debugging
   */
  public exportCache(): Array<{
    connectionId: string;
    connectionType: ConnectionType;
    tableCount: number;
    lastUpdated: string;
    isExpired: boolean;
  }> {
    const result: Array<{
      connectionId: string;
      connectionType: ConnectionType;
      tableCount: number;
      lastUpdated: string;
      isExpired: boolean;
    }> = [];

    this.schemaCache.forEach((cache, connectionId) => {
      result.push({
        connectionId,
        connectionType: cache.connectionType,
        tableCount: cache.tables.length,
        lastUpdated: new Date(cache.lastUpdated).toISOString(),
        isExpired: Date.now() - cache.lastUpdated > cache.ttl
      });
    });

    return result;
  }
}

// Export singleton instance
export const schemaManager = SchemaManager.getInstance();
