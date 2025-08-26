declare global {
  interface Window {
    api: {
      getConnections: () => Promise<{ success: boolean; connections: EncryptedConnection[] }>;
      connectDb: (
        id: string,
        encryptionKey: string
      ) => Promise<{
        success: boolean;
        tables: TableInfo[];
        error?: string;
      }>;
      disconnectDb: (id: string) => Promise<{ success: boolean; error?: string }>;
      runQuery: (
        id: string,
        query: string
      ) => Promise<{
        success: boolean;
        result?: ResultData;
        error?: string;
      }>;
      askAI: (
        id: string,
        prompt: string,
        activeTable?: string | null
      ) => Promise<{ success: boolean; response?: string; error?: string }>;
      testConnection: (
        config: ConnectionConfig
      ) => Promise<{ success: boolean; tables?: TableInfo[]; error?: string }>;
      saveConnection: (
        config: ConnectionConfig,
        encryptionKey: string
      ) => Promise<{ success: boolean; error?: string }>;
      updateConnection: (id: string, name: string) => Promise<{ success: boolean; error?: string }>;
      deleteConnection: (id: string) => Promise<{ success: boolean; error?: string }>;
      exportConnections: () => Promise<{ success: boolean; message?: string; error?: string }>;
      importConnections: () => Promise<{ success: boolean; message?: string; error?: string }>;
      
      // Query History APIs
      getQueryHistory: (connectionId?: string, limit?: number) => Promise<{ 
        success: boolean; 
        history?: QueryHistoryItem[]; 
        error?: string; 
      }>;
      searchQueryHistory: (searchTerm: string, connectionId?: string) => Promise<{ 
        success: boolean; 
        history?: QueryHistoryItem[]; 
        error?: string; 
      }>;
      deleteHistoryItem: (id: string) => Promise<{ success: boolean; error?: string }>;
      clearQueryHistory: (connectionId?: string) => Promise<{ success: boolean; error?: string }>;
      toggleHistoryBookmark: (historyId: string) => Promise<{ 
        success: boolean; 
        isBookmarked?: boolean; 
        error?: string; 
      }>;

      // Bookmark APIs
      getBookmarks: (connectionId?: string) => Promise<{ 
        success: boolean; 
        bookmarks?: QueryBookmark[]; 
        error?: string; 
      }>;
      addBookmark: (bookmark: Omit<QueryBookmark, 'id' | 'createdAt'>) => Promise<{ 
        success: boolean; 
        id?: string; 
        error?: string; 
      }>;
      updateBookmark: (id: string, updates: Partial<Omit<QueryBookmark, 'id' | 'createdAt'>>) => Promise<{ 
        success: boolean; 
        error?: string; 
      }>;
      deleteBookmark: (id: string) => Promise<{ success: boolean; error?: string }>;
      searchBookmarks: (searchTerm: string) => Promise<{ 
        success: boolean; 
        bookmarks?: QueryBookmark[]; 
        error?: string; 
      }>;

      // Statistics
      getQueryStatistics: (connectionId?: string) => Promise<{ 
        success: boolean; 
        statistics?: QueryStatistics; 
        error?: string; 
      }>;

      // Data Export APIs
      exportQueryResults: (
        format: string, 
        data: any[], 
        headers?: string[], 
        filename?: string, 
        sheetName?: string
      ) => Promise<{ 
        success: boolean; 
        message?: string; 
        error?: string; 
        filePath?: string; 
      }>;
      
      getExportFormats: () => Promise<{ 
        success: boolean; 
        formats?: ExportFormat[]; 
        error?: string; 
      }>;
      
      validateExportData: (data: any[]) => Promise<{ 
        success: boolean; 
        validation?: ExportValidation; 
        error?: string; 
      }>;
      
      estimateExportSize: (data: any[], format: string) => Promise<{ 
        success: boolean; 
        estimatedSize?: string; 
        error?: string; 
      }>;
      
      // File Selection API
      selectFile: (options?: { 
        title?: string; 
        filters?: Array<{ name: string; extensions: string[] }>; 
        [key: string]: any; 
      }) => Promise<{ 
        success: boolean; 
        filePath?: string; 
        canceled?: boolean; 
        error?: string; 
      }>;
    };
  }
}

export enum ConnectionType {
  POSTGRESQL = 'postgresql',
  MONGODB = 'mongodb',
  MYSQL = 'mysql',
  SQLITE3 = 'sqlite3'
}

type PostgresConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

type MySQLConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
};

type SQLiteConfig = {
  filePath: string;
  readonly?: boolean;
};

export interface ConnectionConfig {
  id: string;
  name: string;
  type: ConnectionType;
  postgresql?: PostgresConfig;
  mongodb?: string; // For MongoDB
  mysql?: MySQLConfig;
  sqlite3?: SQLiteConfig;
}

export interface TableInfo {
  name: string;
  type: string; // table or collection
  schema?: string; // For PostgreSQL
  columns: Column[];
  relationships: Relationship[];
}

export interface ResultData {
  headers: string[];
  rows: Record<string, any>[];
}

export interface EncryptedConnection {
  id: string;
  name: string;
  type: ConnectionType;
  encryptedConfig: string; // base64 string
  tables?: TableInfo[];
}

export type ThemeMode = 'dark' | 'light' | 'system';

interface Column {
  name: string;
  type: string;
  is_nullable: string;
}

interface Relationship {
  column: string;
  references: {
    table: string;
    column: string;
  };
}

export interface RelationSchema {
  name: string;
  columns: Column[];
  relationships: Relationship[];
}

export interface QueryHistoryItem {
  id: string;
  connectionId: string;
  connectionName: string;
  query: string;
  executionTime: number; // in milliseconds
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  resultCount?: number;
  isBookmarked: boolean;
  tags?: string[];
}

export interface QueryBookmark {
  id: string;
  name: string;
  query: string;
  description?: string;
  connectionId?: string;
  tags?: string[];
  createdAt: Date;
  lastUsed?: Date;
}

export interface QueryStatistics {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  totalBookmarks: number;
  averageExecutionTime: number;
  mostUsedConnection: {
    connectionId: string;
    connectionName: string;
    count: number;
  } | null;
  recentActivity: QueryHistoryItem[];
}

export interface ExportFormat {
  value: string;
  label: string;
  extension: string;
}

export interface ExportValidation {
  valid: boolean;
  error?: string;
}
