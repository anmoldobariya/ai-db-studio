import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import log from 'electron-log';

enum DbType {
  POSTGRESQL = 'postgresql',
  MONGODB = 'mongodb',
  MYSQL = 'mysql',
  SQLITE3 = 'sqlite3'
}

interface ConnectionConfig {
  id: string;
  name: string;
  type: DbType;
  postgresql?: PostgresConfig;
  mongodb?: string;
  // filePath?: string;
}

type PostgresConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

// Custom APIs for renderer
const api = {
  // Get all connections
  getConnections: () => ipcRenderer.invoke('get-connections'),

  // Save new connection after test
  testConnection: (config: ConnectionConfig) => ipcRenderer.invoke('test-connection', { config }),

  // Save new connection
  saveConnection: (config: ConnectionConfig, encryptionKey: string) =>
    ipcRenderer.invoke('save-connection', { config, encryptionKey }),

  // Connection management
  connectDb: (id: string, encryptionKey: string) =>
    ipcRenderer.invoke('connect-db', { id, encryptionKey }),

  // Query execution
  runQuery: (id: string, query: string) => ipcRenderer.invoke('run-query', { id, query }),

  // AI integration
  askAI: (id: string, activeTable: string, prompt: string) =>
    ipcRenderer.invoke('ask-ai', { id, activeTable, prompt }),

  // Connection lifecycle
  disconnectDb: (id: string) => ipcRenderer.invoke('disconnect-db', { id }),

  // Manage existing connections
  updateConnection: (id: string, name) =>
    ipcRenderer.invoke('update-connection', {
      id,
      name
    }),

  // delete connection
  deleteConnection: (id: string) => ipcRenderer.invoke('delete-connection', id),

  // Export connections
  exportConnections: () => ipcRenderer.invoke('export-connections', {}),

  // Import connections
  importConnections: () => ipcRenderer.invoke('import-connections', {}),

  // Query History APIs
  getQueryHistory: (connectionId?: string, limit?: number) => 
    ipcRenderer.invoke('get-query-history', { connectionId, limit }),
  
  searchQueryHistory: (searchTerm: string, connectionId?: string) => 
    ipcRenderer.invoke('search-query-history', { searchTerm, connectionId }),
  
  deleteHistoryItem: (id: string) => 
    ipcRenderer.invoke('delete-history-item', { id }),
  
  clearQueryHistory: (connectionId?: string) => 
    ipcRenderer.invoke('clear-query-history', { connectionId }),
  
  toggleHistoryBookmark: (historyId: string) => 
    ipcRenderer.invoke('toggle-history-bookmark', { historyId }),

  // Bookmark APIs
  getBookmarks: (connectionId?: string) => 
    ipcRenderer.invoke('get-bookmarks', { connectionId }),
  
  addBookmark: (bookmark: any) => 
    ipcRenderer.invoke('add-bookmark', { bookmark }),
  
  updateBookmark: (id: string, updates: any) => 
    ipcRenderer.invoke('update-bookmark', { id, updates }),
  
  deleteBookmark: (id: string) => 
    ipcRenderer.invoke('delete-bookmark', { id }),
  
  searchBookmarks: (searchTerm: string) => 
    ipcRenderer.invoke('search-bookmarks', { searchTerm }),

  // Statistics
  getQueryStatistics: (connectionId?: string) => 
    ipcRenderer.invoke('get-query-statistics', { connectionId }),

  // Data Export APIs
  exportQueryResults: (format: string, data: any[], headers?: string[], filename?: string, sheetName?: string) => 
    ipcRenderer.invoke('export-query-results', { format, data, headers, filename, sheetName }),
  
  getExportFormats: () => 
    ipcRenderer.invoke('get-export-formats'),
  
  validateExportData: (data: any[]) => 
    ipcRenderer.invoke('validate-export-data', { data }),
  
  estimateExportSize: (data: any[], format: string) => 
    ipcRenderer.invoke('estimate-export-size', { data, format }),

  // File Selection API
  selectFile: (options?: { title?: string; filters?: Array<{ name: string; extensions: string[] }>; [key: string]: any }) => 
    ipcRenderer.invoke('select-file', { options })
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    log.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
