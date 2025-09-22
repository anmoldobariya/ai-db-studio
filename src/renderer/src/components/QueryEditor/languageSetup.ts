import { ConnectionType, TableInfo } from '@renderer/types';
import { LanguageIdEnum } from 'monaco-sql-languages';
import { SchemaCompletionProvider } from './schemaCompletionProvider';
import { schemaManager } from './schemaManager';

/** import contribution file */
// Enable MySQL support
import 'monaco-sql-languages/esm/languages/mysql/mysql.contribution';
// import 'monaco-sql-languages/esm/languages/flink/flink.contribution';
// import 'monaco-sql-languages/esm/languages/spark/spark.contribution';
// import 'monaco-sql-languages/esm/languages/hive/hive.contribution';
// import 'monaco-sql-languages/esm/languages/trino/trino.contribution';
import 'monaco-sql-languages/esm/languages/pgsql/pgsql.contribution';
// import 'monaco-sql-languages/esm/languages/impala/impala.contribution';

// import 'monaco-sql-languages/esm/all.contributions';

/** import worker files */
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
// import FlinkSQLWorker from 'monaco-sql-languages/esm/languages/flink/flink.worker?worker';
// import SparkSQLWorker from 'monaco-sql-languages/esm/languages/spark/spark.worker?worker';
// import HiveSQLWorker from 'monaco-sql-languages/esm/languages/hive/hive.worker?worker';
import MySQLWorker from 'monaco-sql-languages/esm/languages/mysql/mysql.worker?worker';
import PGSQLWorker from 'monaco-sql-languages/esm/languages/pgsql/pgsql.worker?worker';
// import TrinoSQLWorker from 'monaco-sql-languages/esm/languages/trino/trino.worker?worker';
// import ImpalaSQLWorker from 'monaco-sql-languages/esm/languages/impala/impala.worker?worker';

/** define MonacoEnvironment.getWorker  */
(globalThis as any).MonacoEnvironment = {
  getWorker(_: any, label: string) {
    // if (label === LanguageIdEnum.FLINK) {
    // 	return new FlinkSQLWorker();
    // }
    // if (label === LanguageIdEnum.HIVE) {
    // 	return new HiveSQLWorker();
    // }
    // if (label === LanguageIdEnum.SPARK) {
    // 	return new SparkSQLWorker();
    // }
    if (label === LanguageIdEnum.PG) {
      return new PGSQLWorker();
    }
    if (label === LanguageIdEnum.MYSQL) {
      return new MySQLWorker();
    }
    // if (label === LanguageIdEnum.TRINO) {
    // 	return new TrinoSQLWorker();
    // }
    // if (label === LanguageIdEnum.IMPALA) {
    // 	return new ImpalaSQLWorker();
    // }
    return new EditorWorker();
  }
};

// Global schema completion providers
const schemaProviders = new Map<string, SchemaCompletionProvider>();

/**
 * Get the appropriate Monaco language ID for a connection type
 */
export function getLanguageIdForConnectionType(connectionType: ConnectionType): string {
  switch (connectionType) {
    case ConnectionType.POSTGRESQL:
      return LanguageIdEnum.PG;
    case ConnectionType.MYSQL:
      return LanguageIdEnum.MYSQL;
    case ConnectionType.SQLITE3:
      return LanguageIdEnum.PG; // Use PostgreSQL for SQLite (similar syntax)
    case ConnectionType.MONGODB:
      return 'javascript'; // MongoDB uses JavaScript-like syntax
    default:
      return LanguageIdEnum.PG;
  }
}

/**
 * Register or update schema completion provider for a connection
 */
export function registerSchemaCompletion(
  connectionId: string,
  connectionType: ConnectionType,
  tables: TableInfo[],
  activeTable?: TableInfo | null
): void {
  // Update schema manager
  schemaManager.updateSchema(connectionId, connectionType, tables);

  // Get existing provider or create new one
  let provider = schemaProviders.get(connectionId);
  const languageId = getLanguageIdForConnectionType(connectionType);

  const schemaContext = {
    connectionType,
    tables,
    currentDatabase: undefined, // Could be extracted from connection config if needed
    activeTable
  };

  if (provider) {
    // Update existing provider
    provider.updateSchema(schemaContext);
  } else {
    // Create new provider
    provider = new SchemaCompletionProvider(schemaContext);
    provider.registerProvider(languageId);
    schemaProviders.set(connectionId, provider);
  }
}

/**
 * Update schema for an existing connection
 */
export function updateSchemaCompletion(
  connectionId: string,
  connectionType: ConnectionType,
  tables: TableInfo[],
  activeTable?: TableInfo | null
): void {
  registerSchemaCompletion(connectionId, connectionType, tables, activeTable);
}

/**
 * Remove schema completion provider for a connection
 */
export function unregisterSchemaCompletion(connectionId: string): void {
  const provider = schemaProviders.get(connectionId);
  if (provider) {
    provider.dispose();
    schemaProviders.delete(connectionId);
  }
  schemaManager.clearSchema(connectionId);
}

/**
 * Get schema completion provider for a connection
 */
export function getSchemaCompletionProvider(
  connectionId: string
): SchemaCompletionProvider | undefined {
  return schemaProviders.get(connectionId);
}

/**
 * Clean up all schema completion providers
 */
export function disposeAllSchemaCompletions(): void {
  schemaProviders.forEach((provider) => provider.dispose());
  schemaProviders.clear();
  schemaManager.clearAllSchema();
}

/**
 * Refresh schema data from the backend for a connection
 */
export async function refreshSchemaCompletion(
  connectionId: string,
  _connectionType: ConnectionType
): Promise<void> {
  try {
    // This would typically fetch fresh schema data from the backend
    // For now, we just clear the cache to force a refresh on next use
    schemaManager.refreshSchema(connectionId);

    // In a real implementation, you might call:
    // const tables = await window.api.getSchemaVisualization(connectionId);
    // registerSchemaCompletion(connectionId, connectionType, tables);
  } catch (error) {
    console.error('Failed to refresh schema completion:', error);
  }
}

// Export LanguageIdEnum for backward compatibility
export { LanguageIdEnum };
