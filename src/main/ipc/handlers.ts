// src/main/ipc/handlers.ts
import log from 'electron-log';
import { dialog, ipcMain } from 'electron';
import {
  CONNECT_DB,
  RUN_QUERY,
  DELETE_CONNECTION,
  UPDATE_CONNECTION,
  TEST_CONNECTION,
  DISCONNECT_DB,
  SAVE_CONNECTION,
  GET_CONNECTIONS,
  ASK_AI,
  EXPORT_CONNECTIONS,
  IMPORT_CONNECTIONS,
  GET_QUERY_HISTORY,
  SEARCH_QUERY_HISTORY,
  DELETE_HISTORY_ITEM,
  CLEAR_QUERY_HISTORY,
  TOGGLE_HISTORY_BOOKMARK,
  GET_BOOKMARKS,
  ADD_BOOKMARK,
  UPDATE_BOOKMARK,
  DELETE_BOOKMARK,
  SEARCH_BOOKMARKS,
  GET_QUERY_STATISTICS,
  EXPORT_QUERY_RESULTS,
  GET_EXPORT_FORMATS,
  VALIDATE_EXPORT_DATA,
  ESTIMATE_EXPORT_SIZE,
  SELECT_FILE
} from './channels';
import {
  saveEncryptedConnection,
  getDecryptedConnection,
  updateEncryptedConnection,
  deleteConnection,
  getAllConnections,
  storeConnections
} from '../store/secure-store';

import { getSchemaVisualization, getActiveClient, removeActiveClient } from '../connection/manager';
import { createDatabaseClient } from '../db';
import { askAI } from '../ai';
import { ExportFormat, ImportStrategy, StoredConnection } from '../types';
import { readFile, writeFile } from 'fs/promises';
import { encrypt, decrypt } from '../store/crypto';
import { queryHistoryManager } from '../store/query-history';
import { DataExporter } from '../utils/data-export';
import { ErrorHandler, ErrorType } from '../utils/error-handler';

ipcMain.handle(GET_CONNECTIONS, () => {
  try {
    const connections = getAllConnections();
    return ErrorHandler.formatSuccessResponse({ connections });
  } catch (error: any) {
    const appError = ErrorHandler.handleUnknownError(error, { action: 'GET_CONNECTIONS' });
    return ErrorHandler.formatErrorResponse(appError);
  }
});

ipcMain.handle(TEST_CONNECTION, async (_, { config }) => {
  try {
    const db = await createDatabaseClient(config);
    await db.connect();
    await db.disconnect();

    return ErrorHandler.formatSuccessResponse({}, 'Connection test successful');
  } catch (error: any) {
    const appError = ErrorHandler.handleDatabaseError(error, {
      action: 'TEST_CONNECTION',
      dbType: config.type,
      host: config.postgresql?.host || config.mysql?.host
    });
    return ErrorHandler.formatErrorResponse(appError);
  }
});

ipcMain.handle(SAVE_CONNECTION, async (_, { config, encryptionKey }) => {
  try {
    const db = await createDatabaseClient(config);
    await db.connect();
    const tables = await db.getSchemaVisualization();
    saveEncryptedConnection(config, encryptionKey);
    await db.disconnect();
    return ErrorHandler.formatSuccessResponse({ tables }, 'Connection saved successfully');
  } catch (error: any) {
    let appError;
    if (error.message?.includes('encrypt') || error.message?.includes('key')) {
      appError = ErrorHandler.handleEncryptionError(error, {
        action: 'SAVE_CONNECTION',
        connectionId: config.id
      });
    } else {
      appError = ErrorHandler.handleDatabaseError(error, {
        action: 'SAVE_CONNECTION',
        dbType: config.type,
        connectionId: config.id
      });
    }
    return ErrorHandler.formatErrorResponse(appError);
  }
});

ipcMain.handle(CONNECT_DB, async (_, { id, encryptionKey }) => {
  try {
    const config = getDecryptedConnection(id, encryptionKey);
    const existingClient = getActiveClient(id);
    if (existingClient) {
      return ErrorHandler.formatSuccessResponse({ tables: existingClient.tables || [] });
    }

    const tables = await getSchemaVisualization(id, config);

    return ErrorHandler.formatSuccessResponse({ tables }, 'Connected successfully');
  } catch (error: any) {
    let appError;
    if (error.message?.includes('decrypt') || error.message?.includes('key')) {
      appError = ErrorHandler.handleEncryptionError(error, {
        action: 'CONNECT_DB',
        connectionId: id
      });
    } else {
      appError = ErrorHandler.handleDatabaseError(error, {
        action: 'CONNECT_DB',
        connectionId: id
      });
    }
    return ErrorHandler.formatErrorResponse(appError);
  }
});

ipcMain.handle(RUN_QUERY, async (_, { id, query }) => {
  const startTime = performance.now();
  let success = false;
  let result: any = null;
  let errorMessage: string | undefined;
  let resultCount = 0;

  try {
    const clientInstance = getActiveClient(id);
    if (!clientInstance) {
      const appError = ErrorHandler.createError(
        ErrorType.CONNECTION_ERROR,
        'No active database connection found. Please connect to a database first.',
        undefined,
        'NO_ACTIVE_CONNECTION',
        true,
        { action: 'RUN_QUERY', connectionId: id }
      );
      return ErrorHandler.formatErrorResponse(appError);
    }

    result = await clientInstance.client.executeQuery(query);
    success = true;
    resultCount = Array.isArray(result) ? result.length : 0;

    // Add to query history
    const executionTime = performance.now() - startTime;

    // Get connection name from stored connections
    const connections = getAllConnections();
    const connection = connections.find((conn) => conn.id === id);
    const connectionName = connection?.name || 'Unknown Connection';

    queryHistoryManager.addToHistory({
      connectionId: id,
      connectionName,
      query: query.trim(),
      executionTime,
      success,
      resultCount
    });

    return ErrorHandler.formatSuccessResponse(
      { result },
      `Query executed successfully in ${executionTime.toFixed(2)}ms`
    );
  } catch (error: any) {
    errorMessage = error.message;
    const failedExecutionTime = performance.now() - startTime;

    // Add failed query to history
    const failedExecutionTimeForHistory = performance.now() - startTime;

    // Get connection name from stored connections
    const connections = getAllConnections();
    const connection = connections.find((conn) => conn.id === id);
    const connectionName = connection?.name || 'Unknown Connection';

    queryHistoryManager.addToHistory({
      connectionId: id,
      connectionName,
      query: query.trim(),
      executionTime: failedExecutionTimeForHistory,
      success: false,
      errorMessage,
      resultCount: 0
    });

    const appError = ErrorHandler.handleDatabaseError(error, {
      action: 'RUN_QUERY',
      connectionId: id,
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      executionTime: failedExecutionTime
    });
    return ErrorHandler.formatErrorResponse(appError);
  }
});

ipcMain.handle(ASK_AI, async (_, { id, prompt, activeTable }) => {
  try {
    const clientInstance = getActiveClient(id);
    if (!clientInstance) {
      const appError = ErrorHandler.createError(
        ErrorType.CONNECTION_ERROR,
        'No active database connection found for AI query.',
        undefined,
        'NO_ACTIVE_CONNECTION',
        true,
        { action: 'ASK_AI', connectionId: id }
      );
      return ErrorHandler.formatErrorResponse(appError);
    }

    const response = await askAI({
      prompt,
      activeTable,
      schema: clientInstance.tables,
      dbType: clientInstance.type
    });
    return ErrorHandler.formatSuccessResponse({ response });
  } catch (error: any) {
    const appError = ErrorHandler.handleUnknownError(error, {
      action: 'ASK_AI',
      connectionId: id,
      prompt: prompt.substring(0, 100)
    });
    return ErrorHandler.formatErrorResponse(appError);
  }
});

ipcMain.handle(DISCONNECT_DB, async (_, { id }) => {
  try {
    await removeActiveClient(id);
    return ErrorHandler.formatSuccessResponse({}, 'Database disconnected successfully');
  } catch (error: any) {
    const appError = ErrorHandler.handleDatabaseError(error, {
      action: 'DISCONNECT_DB',
      connectionId: id
    });
    return ErrorHandler.formatErrorResponse(appError);
  }
});

ipcMain.handle(UPDATE_CONNECTION, async (_, { id, name }) => {
  try {
    if (!name || name.trim().length === 0) {
      const appError = ErrorHandler.handleValidationError(
        'Connection name cannot be empty',
        'Please provide a valid connection name',
        { action: 'UPDATE_CONNECTION', connectionId: id }
      );
      return ErrorHandler.formatErrorResponse(appError);
    }

    updateEncryptedConnection(id, name.trim());
    return ErrorHandler.formatSuccessResponse({}, 'Connection updated successfully');
  } catch (error: any) {
    const appError = ErrorHandler.handleUnknownError(error, {
      action: 'UPDATE_CONNECTION',
      connectionId: id,
      newName: name
    });
    return ErrorHandler.formatErrorResponse(appError);
  }
});

ipcMain.handle(DELETE_CONNECTION, async (_, id: string) => {
  try {
    const client = getActiveClient(id);
    if (client) {
      await removeActiveClient(id);
    }
    deleteConnection(id);
    return ErrorHandler.formatSuccessResponse({}, 'Connection deleted successfully');
  } catch (error: any) {
    const appError = ErrorHandler.handleUnknownError(error, {
      action: 'DELETE_CONNECTION',
      connectionId: id
    });
    return ErrorHandler.formatErrorResponse(appError);
  }
});

ipcMain.handle(EXPORT_CONNECTIONS, async (_, { encryptionKey = 'import-export' }) => {
  try {
    const connections = getAllConnections();

    if (connections.length === 0) {
      const appError = ErrorHandler.handleValidationError(
        'No connections available to export',
        'Please create some database connections before attempting to export.',
        { action: 'EXPORT_CONNECTIONS' }
      );
      return ErrorHandler.formatErrorResponse(appError);
    }

    const exportData: ExportFormat = {
      version: 1,
      exportDate: new Date().toISOString(),
      connections
    };

    const encryptedData = encrypt(JSON.stringify(exportData), encryptionKey);

    const savePath = await dialog.showSaveDialog({
      title: 'Save Connection File',
      defaultPath: `connections-${new Date().toISOString().split('T')[0]}.dbexport`,
      filters: [{ name: 'AI Database Studio Export', extensions: ['dbexport'] }]
    });

    if (!savePath.canceled && savePath.filePath) {
      await writeFile(
        savePath.filePath,
        JSON.stringify({
          format: 'ai-db-studio-encrypted',
          data: encryptedData
        }),
        'utf-8'
      );
      return ErrorHandler.formatSuccessResponse(
        { filePath: savePath.filePath },
        `Successfully exported ${connections.length} connection(s)`
      );
    }

    return ErrorHandler.formatSuccessResponse({}, 'Export canceled by user');
  } catch (error: any) {
    let appError;
    if (error.code && (error.code.startsWith('E') || error.code === 'ENOENT')) {
      appError = ErrorHandler.handleFileError(error, { action: 'EXPORT_CONNECTIONS' });
    } else if (error.message?.includes('encrypt')) {
      appError = ErrorHandler.handleEncryptionError(error, { action: 'EXPORT_CONNECTIONS' });
    } else {
      appError = ErrorHandler.handleUnknownError(error, { action: 'EXPORT_CONNECTIONS' });
    }
    return ErrorHandler.formatErrorResponse(appError);
  }
});

ipcMain.handle(
  IMPORT_CONNECTIONS,
  async (_, { encryptionKey = 'import-export', strategy = 'merge' }) => {
    try {
      const openPath = await dialog.showOpenDialog({
        title: 'Select Connection File',
        filters: [{ name: 'AI Database Studio Export', extensions: ['dbexport'] }]
      });

      if (!openPath.canceled && openPath.filePaths.length > 0) {
        let fileData;
        try {
          const fileContent = await readFile(openPath.filePaths[0], 'utf-8');
          fileData = JSON.parse(fileContent);
        } catch (parseError: any) {
          const appError = ErrorHandler.handleFileError(parseError, {
            action: 'IMPORT_CONNECTIONS',
            filePath: openPath.filePaths[0]
          });
          return ErrorHandler.formatErrorResponse(appError);
        }

        if (!fileData.format || fileData.format !== 'ai-db-studio-encrypted') {
          const appError = ErrorHandler.handleValidationError(
            'Invalid file format',
            'The selected file is not a valid AI Database Studio export file.',
            { action: 'IMPORT_CONNECTIONS', filePath: openPath.filePaths[0] }
          );
          return ErrorHandler.formatErrorResponse(appError);
        }

        let decryptedJson;
        try {
          decryptedJson = decrypt(fileData.data, encryptionKey);
        } catch (decryptError: any) {
          const appError = ErrorHandler.handleEncryptionError(decryptError, {
            action: 'IMPORT_CONNECTIONS',
            filePath: openPath.filePaths[0]
          });
          return ErrorHandler.formatErrorResponse(appError);
        }

        let importData: ExportFormat;
        try {
          importData = JSON.parse(decryptedJson);

          // Validate structure
          if (!importData.connections || !Array.isArray(importData.connections)) {
            throw new Error('Invalid file format: missing connections array');
          }
        } catch (validationError: any) {
          const appError = ErrorHandler.handleValidationError(
            'Invalid file structure',
            'The import file contains invalid data or is corrupted.',
            { action: 'IMPORT_CONNECTIONS', error: validationError.message }
          );
          return ErrorHandler.formatErrorResponse(appError);
        }

        const existingConnections = getAllConnections();
        let resultConnections: StoredConnection[] = [];

        // Handle import based on strategy
        switch (strategy as ImportStrategy) {
          case 'replace':
            resultConnections = importData.connections;
            break;

          case 'merge':
            // Combine both sets, preferring existing connections on duplicate IDs
            const existingIds = new Set(existingConnections.map((conn) => conn.id));
            const newConnections = importData.connections.filter(
              (conn) => !existingIds.has(conn.id)
            );
            resultConnections = [...existingConnections, ...newConnections];
            break;

          case 'skip-duplicates':
            // Add unique connections, rename duplicates with timestamp suffix
            const idMap = new Map(existingConnections.map((conn) => [conn.id, conn]));

            importData.connections.forEach((conn) => {
              if (idMap.has(conn.id)) {
                // Create renamed duplicate
                const timestamp = Date.now();
                const renamedConn = {
                  ...conn,
                  id: `${conn.id}-${timestamp}`,
                  name: `${conn.name} (Imported)`
                };
                resultConnections.push(renamedConn);
              } else {
                resultConnections.push(conn);
                idMap.set(conn.id, conn);
              }
            });

            // Add all existing connections
            resultConnections.push(...existingConnections);
            break;
        }

        // Update the store
        storeConnections(resultConnections);

        return ErrorHandler.formatSuccessResponse(
          {
            importedCount: importData.connections.length,
            totalConnections: resultConnections.length,
            strategy
          },
          `Successfully imported ${importData.connections.length} connection(s)`
        );
      }

      return ErrorHandler.formatSuccessResponse({}, 'Import canceled by user');
    } catch (error: any) {
      const appError = ErrorHandler.handleUnknownError(error, { action: 'IMPORT_CONNECTIONS' });
      return ErrorHandler.formatErrorResponse(appError);
    }
  }
);

// Query History Handlers
ipcMain.handle(GET_QUERY_HISTORY, async (_, { connectionId, limit }) => {
  try {
    const history = queryHistoryManager.getHistory(connectionId, limit);
    return ErrorHandler.formatSuccessResponse({ history });
  } catch (error: any) {
    const appError = ErrorHandler.handleUnknownError(error, {
      action: 'GET_QUERY_HISTORY',
      connectionId,
      limit
    });
    return ErrorHandler.formatErrorResponse(appError);
  }
});

ipcMain.handle(SEARCH_QUERY_HISTORY, async (_, { searchTerm, connectionId }) => {
  try {
    const history = queryHistoryManager.searchHistory(searchTerm, connectionId);
    return { success: true, history };
  } catch (error: any) {
    log.error('Error searching query history:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle(DELETE_HISTORY_ITEM, async (_, { id }) => {
  try {
    const deleted = queryHistoryManager.deleteHistoryItem(id);
    return { success: deleted };
  } catch (error: any) {
    log.error('Error deleting history item:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle(CLEAR_QUERY_HISTORY, async (_, { connectionId }) => {
  try {
    queryHistoryManager.clearHistory(connectionId);
    return { success: true };
  } catch (error: any) {
    log.error('Error clearing query history:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle(TOGGLE_HISTORY_BOOKMARK, async (_, { historyId }) => {
  try {
    const isBookmarked = queryHistoryManager.toggleHistoryBookmark(historyId);
    return { success: true, isBookmarked };
  } catch (error: any) {
    log.error('Error toggling history bookmark:', error);
    return { success: false, error: error.message };
  }
});

// Bookmark Handlers
ipcMain.handle(GET_BOOKMARKS, async (_, { connectionId }) => {
  try {
    const bookmarks = queryHistoryManager.getBookmarks(connectionId);
    return { success: true, bookmarks };
  } catch (error: any) {
    log.error('Error fetching bookmarks:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle(ADD_BOOKMARK, async (_, { bookmark }) => {
  try {
    const id = queryHistoryManager.addBookmark(bookmark);
    return { success: true, id };
  } catch (error: any) {
    log.error('Error adding bookmark:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle(UPDATE_BOOKMARK, async (_, { id, updates }) => {
  try {
    const updated = queryHistoryManager.updateBookmark(id, updates);
    return { success: updated };
  } catch (error: any) {
    log.error('Error updating bookmark:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle(DELETE_BOOKMARK, async (_, { id }) => {
  try {
    const deleted = queryHistoryManager.deleteBookmark(id);
    return { success: deleted };
  } catch (error: any) {
    log.error('Error deleting bookmark:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle(SEARCH_BOOKMARKS, async (_, { searchTerm }) => {
  try {
    const bookmarks = queryHistoryManager.searchBookmarks(searchTerm);
    return { success: true, bookmarks };
  } catch (error: any) {
    log.error('Error searching bookmarks:', error);
    return { success: false, error: error.message };
  }
});

// Statistics Handler
ipcMain.handle(GET_QUERY_STATISTICS, async (_, { connectionId }) => {
  try {
    const statistics = queryHistoryManager.getStatistics(connectionId);
    return { success: true, statistics };
  } catch (error: any) {
    log.error('Error fetching query statistics:', error);
    return { success: false, error: error.message };
  }
});

// Data Export Handlers
ipcMain.handle(EXPORT_QUERY_RESULTS, async (_, { format, data, headers, filename, sheetName }) => {
  try {
    if (!data || !Array.isArray(data)) {
      const appError = ErrorHandler.handleValidationError(
        'Invalid data for export',
        'Export data must be a valid array.',
        { action: 'EXPORT_QUERY_RESULTS', format }
      );
      return ErrorHandler.formatErrorResponse(appError);
    }

    if (data.length === 0) {
      const appError = ErrorHandler.handleValidationError(
        'No data to export',
        'Cannot export empty result set.',
        { action: 'EXPORT_QUERY_RESULTS', format }
      );
      return ErrorHandler.formatErrorResponse(appError);
    }

    const result = await DataExporter.exportData({
      format,
      data,
      headers,
      filename,
      sheetName
    });

    if (result.success) {
      return ErrorHandler.formatSuccessResponse(result, 'Data exported successfully');
    } else {
      const appError = ErrorHandler.createError(
        ErrorType.EXPORT_ERROR,
        result.error || 'Export failed',
        undefined,
        undefined,
        true,
        { action: 'EXPORT_QUERY_RESULTS', format, dataLength: data.length }
      );
      return ErrorHandler.formatErrorResponse(appError);
    }
  } catch (error: any) {
    let appError;
    if (error.code && (error.code.startsWith('E') || error.code === 'ENOENT')) {
      appError = ErrorHandler.handleFileError(error, {
        action: 'EXPORT_QUERY_RESULTS',
        format,
        filename
      });
    } else {
      appError = ErrorHandler.handleUnknownError(error, {
        action: 'EXPORT_QUERY_RESULTS',
        format,
        dataLength: data?.length
      });
    }
    return ErrorHandler.formatErrorResponse(appError);
  }
});

ipcMain.handle(GET_EXPORT_FORMATS, async (_) => {
  try {
    const formats = DataExporter.getSupportedFormats();
    return { success: true, formats };
  } catch (error: any) {
    log.error('Error getting export formats:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle(VALIDATE_EXPORT_DATA, async (_, { data }) => {
  try {
    const validation = DataExporter.validateExportData(data);
    return { success: true, validation };
  } catch (error: any) {
    log.error('Error validating export data:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle(ESTIMATE_EXPORT_SIZE, async (_, { data, format }) => {
  try {
    const estimatedSize = DataExporter.estimateExportSize(data, format);
    return { success: true, estimatedSize };
  } catch (error: any) {
    log.error('Error estimating export size:', error);
    return { success: false, error: error.message };
  }
});

// File Selection Handler
ipcMain.handle(SELECT_FILE, async (_, { options }) => {
  try {
    const result = await dialog.showOpenDialog({
      title: options?.title || 'Select File',
      filters: options?.filters || [
        { name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile'],
      ...options
    });

    if (result.canceled || result.filePaths.length === 0) {
      return ErrorHandler.formatSuccessResponse({ canceled: true }, 'File selection canceled');
    }

    return ErrorHandler.formatSuccessResponse(
      {
        filePath: result.filePaths[0],
        canceled: false
      },
      'File selected successfully'
    );
  } catch (error: any) {
    const appError = ErrorHandler.handleFileError(error, { action: 'SELECT_FILE' });
    return ErrorHandler.formatErrorResponse(appError);
  }
});
