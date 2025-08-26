// src/main/ipc/channels.ts

export const GET_CONNECTIONS = 'get-connections';
export const TEST_CONNECTION = 'test-connection';
export const SAVE_CONNECTION = 'save-connection';
export const CONNECT_DB = 'connect-db';
export const RUN_QUERY = 'run-query';
export const ASK_AI = 'ask-ai';
export const DISCONNECT_DB = 'disconnect-db';
export const DELETE_CONNECTION = 'delete-connection';
export const UPDATE_CONNECTION = 'update-connection';
export const EXPORT_CONNECTIONS = 'export-connections';
export const IMPORT_CONNECTIONS = 'import-connections';
export const SELECT_FILE = 'select-file';

// Query History channels
export const GET_QUERY_HISTORY = 'get-query-history';
export const SEARCH_QUERY_HISTORY = 'search-query-history';
export const DELETE_HISTORY_ITEM = 'delete-history-item';
export const CLEAR_QUERY_HISTORY = 'clear-query-history';
export const TOGGLE_HISTORY_BOOKMARK = 'toggle-history-bookmark';

// Bookmark channels
export const GET_BOOKMARKS = 'get-bookmarks';
export const ADD_BOOKMARK = 'add-bookmark';
export const UPDATE_BOOKMARK = 'update-bookmark';
export const DELETE_BOOKMARK = 'delete-bookmark';
export const SEARCH_BOOKMARKS = 'search-bookmarks';

// Statistics
export const GET_QUERY_STATISTICS = 'get-query-statistics';

// Data Export channels
export const EXPORT_QUERY_RESULTS = 'export-query-results';
export const GET_EXPORT_FORMATS = 'get-export-formats';
export const VALIDATE_EXPORT_DATA = 'validate-export-data';
export const ESTIMATE_EXPORT_SIZE = 'estimate-export-size';
