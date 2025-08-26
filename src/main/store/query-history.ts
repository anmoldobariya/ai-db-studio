// src/main/store/query-history.ts

import Store from 'electron-store';
import log from 'electron-log';

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
  historyId: string;
  name: string;
  query: string;
  description?: string;
  connectionId?: string; // Optional - can be used for any connection
  tags?: string[];
  createdAt: Date;
  lastUsed?: Date;
}

interface QueryHistoryStore {
  history: QueryHistoryItem[];
  bookmarks: QueryBookmark[];
  settings: {
    maxHistoryItems: number;
    retentionDays: number;
    autoCleanup: boolean;
  };
}

class QueryHistoryManager {
  private store: Store<QueryHistoryStore>;

  constructor() {
    this.store = new Store<QueryHistoryStore>({
      name: 'query-history',
      defaults: {
        history: [],
        bookmarks: [],
        settings: {
          maxHistoryItems: 1000,
          retentionDays: 30,
          autoCleanup: true
        }
      },
      clearInvalidConfig: true
    });

    // Auto cleanup on initialization
    this.autoCleanup();
  }

  // History Management
  addToHistory(item: Omit<QueryHistoryItem, 'id' | 'timestamp' | 'isBookmarked'>): string {
    const historyItem: QueryHistoryItem = {
      ...item,
      id: this.generateId(),
      timestamp: new Date(),
      isBookmarked: false
    };

    const history = this.store.get('history', []);
    history.unshift(historyItem); // Add to beginning

    // Limit history size
    const settings = this.store.get('settings');
    if (history.length > settings.maxHistoryItems) {
      history.splice(settings.maxHistoryItems);
    }

    this.store.set('history', history);
    log.info('Added query to history:', historyItem.id);
    
    return historyItem.id;
  }

  getHistory(connectionId?: string, limit?: number): QueryHistoryItem[] {
    let history = this.store.get('history', []);
    
    if (connectionId) {
      history = history.filter(item => item.connectionId === connectionId);
    }

    if (limit && limit > 0) {
      history = history.slice(0, limit);
    }

    return history;
  }

  searchHistory(searchTerm: string, connectionId?: string): QueryHistoryItem[] {
    let history = this.store.get('history', []);
    
    if (connectionId) {
      history = history.filter(item => item.connectionId === connectionId);
    }

    const lowercaseSearch = searchTerm.toLowerCase();
    return history.filter(item => 
      item.query.toLowerCase().includes(lowercaseSearch) ||
      item.connectionName.toLowerCase().includes(lowercaseSearch) ||
      (item.tags && item.tags.some(tag => tag.toLowerCase().includes(lowercaseSearch)))
    );
  }

  deleteHistoryItem(id: string): boolean {
    const history = this.store.get('history', []);
    const index = history.findIndex(item => item.id === id);
    
    if (index !== -1) {
      history.splice(index, 1);
      this.store.set('history', history);
      log.info('Deleted history item:', id);
      return true;
    }
    
    return false;
  }

  clearHistory(connectionId?: string): void {
    if (connectionId) {
      const history = this.store.get('history', []);
      const filteredHistory = history.filter(item => item.connectionId !== connectionId);
      this.store.set('history', filteredHistory);
      log.info('Cleared history for connection:', connectionId);
    } else {
      this.store.set('history', []);
      log.info('Cleared all history');
    }
  }

  // Bookmark Management
  addBookmark(bookmark: Omit<QueryBookmark, 'id' | 'createdAt'>): string {
    const newBookmark: QueryBookmark = {
      ...bookmark,
      id: this.generateId(),
      createdAt: new Date()
    };

    const bookmarks = this.store.get('bookmarks', []);
    bookmarks.push(newBookmark);
    this.store.set('bookmarks', bookmarks);
    
    log.info('Added bookmark:', newBookmark.id);
    return newBookmark.id;
  }

  getBookmarks(connectionId?: string): QueryBookmark[] {
    let bookmarks = this.store.get('bookmarks', []);
    
    if (connectionId) {
      bookmarks = bookmarks.filter(bookmark => 
        !bookmark.connectionId || bookmark.connectionId === connectionId
      );
    }

    return bookmarks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  updateBookmark(id: string, updates: Partial<Omit<QueryBookmark, 'id' | 'createdAt'>>): boolean {
    const bookmarks = this.store.get('bookmarks', []);
    const index = bookmarks.findIndex(bookmark => bookmark.id === id);
    
    if (index !== -1) {
      bookmarks[index] = { ...bookmarks[index], ...updates };
      this.store.set('bookmarks', bookmarks);
      log.info('Updated bookmark:', id);
      return true;
    }
    
    return false;
  }

  deleteBookmark(id: string): boolean {
    const bookmarks = this.store.get('bookmarks', []);
    const index = bookmarks.findIndex(bookmark => bookmark.id === id || bookmark.historyId === id);
    
    if (index !== -1) {
      bookmarks.splice(index, 1);
      this.store.set('bookmarks', bookmarks);
      log.info('Deleted bookmark:', id);
      return true;
    }
    
    return false;
  }

  searchBookmarks(searchTerm: string): QueryBookmark[] {
    const bookmarks = this.store.get('bookmarks', []);
    const lowercaseSearch = searchTerm.toLowerCase();
    
    return bookmarks.filter(bookmark =>
      bookmark.name.toLowerCase().includes(lowercaseSearch) ||
      bookmark.query.toLowerCase().includes(lowercaseSearch) ||
      (bookmark.description && bookmark.description.toLowerCase().includes(lowercaseSearch)) ||
      (bookmark.tags && bookmark.tags.some(tag => tag.toLowerCase().includes(lowercaseSearch)))
    );
  }

  // Toggle bookmark for history item
  toggleHistoryBookmark(historyId: string): boolean {
    const history = this.store.get('history', []);
    const historyItem = history.find(item => item.id === historyId);

    if (!historyItem) {
      return false;
    }

    historyItem.isBookmarked = !historyItem.isBookmarked;
    this.store.set('history', history);

    if (historyItem.isBookmarked) {
      // Add to bookmarks
      this.addBookmark({
        historyId: historyItem.id,
        name: `Query from ${historyItem.connectionName}`,
        query: historyItem.query,
        connectionId: historyItem.connectionId,
        description: `Bookmarked from history on ${new Date(historyItem.timestamp).toLocaleDateString()}`
      });
    } else {
      // Remove from bookmarks
      this.deleteBookmark(historyId);
    }

    return historyItem.isBookmarked;
  }

  // Settings Management
  getSettings() {
    return this.store.get('settings');
  }

  updateSettings(settings: Partial<QueryHistoryStore['settings']>): void {
    const currentSettings = this.store.get('settings');
    this.store.set('settings', { ...currentSettings, ...settings });
    log.info('Updated query history settings');
  }

  // Utility Methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private autoCleanup(): void {
    const settings = this.store.get('settings');
    
    if (!settings.autoCleanup) {
      return;
    }

    const history = this.store.get('history', []);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - settings.retentionDays);

    const filteredHistory = history.filter(item => 
      new Date(item.timestamp) > cutoffDate
    );

    if (filteredHistory.length !== history.length) {
      this.store.set('history', filteredHistory);
      log.info(`Cleaned up ${history.length - filteredHistory.length} old history items`);
    }
  }

  // Export/Import functionality
  exportData(): { history: QueryHistoryItem[], bookmarks: QueryBookmark[] } {
    return {
      history: this.store.get('history', []),
      bookmarks: this.store.get('bookmarks', [])
    };
  }

  importData(data: { history?: QueryHistoryItem[], bookmarks?: QueryBookmark[] }, merge = true): void {
    if (data.history) {
      if (merge) {
        const existingHistory = this.store.get('history', []);
        const mergedHistory = [...data.history, ...existingHistory];
        // Remove duplicates based on query + connectionId + timestamp
        const uniqueHistory = mergedHistory.filter((item, index, array) => 
          array.findIndex(i => 
            i.query === item.query && 
            i.connectionId === item.connectionId && 
            i.timestamp === item.timestamp
          ) === index
        );
        this.store.set('history', uniqueHistory);
      } else {
        this.store.set('history', data.history);
      }
    }

    if (data.bookmarks) {
      if (merge) {
        const existingBookmarks = this.store.get('bookmarks', []);
        const mergedBookmarks = [...data.bookmarks, ...existingBookmarks];
        // Remove duplicates based on name + query
        const uniqueBookmarks = mergedBookmarks.filter((bookmark, index, array) => 
          array.findIndex(b => b.name === bookmark.name && b.query === bookmark.query) === index
        );
        this.store.set('bookmarks', uniqueBookmarks);
      } else {
        this.store.set('bookmarks', data.bookmarks);
      }
    }

    log.info('Imported query history data');
  }

  // Statistics
  getStatistics(connectionId?: string) {
    const history = this.getHistory(connectionId);
    const bookmarks = this.getBookmarks(connectionId);
    
    return {
      totalQueries: history.length,
      successfulQueries: history.filter(item => item.success).length,
      failedQueries: history.filter(item => !item.success).length,
      totalBookmarks: bookmarks.length,
      averageExecutionTime: history.length > 0 
        ? history.reduce((sum, item) => sum + item.executionTime, 0) / history.length 
        : 0,
      mostUsedConnection: this.getMostUsedConnection(),
      recentActivity: history.slice(0, 10)
    };
  }

  private getMostUsedConnection(): { connectionId: string, connectionName: string, count: number } | null {
    const history = this.store.get('history', []);
    const connectionCounts = new Map<string, { name: string, count: number }>();

    history.forEach(item => {
      const existing = connectionCounts.get(item.connectionId);
      if (existing) {
        existing.count++;
      } else {
        connectionCounts.set(item.connectionId, {
          name: item.connectionName,
          count: 1
        });
      }
    });

    let mostUsed: { connectionId: string, connectionName: string, count: number } | null = null;
    connectionCounts.forEach((value, key) => {
      if (!mostUsed || value.count > mostUsed.count) {
        mostUsed = {
          connectionId: key,
          connectionName: value.name,
          count: value.count
        };
      }
    });

    return mostUsed;
  }
}

// Export singleton instance
export const queryHistoryManager = new QueryHistoryManager();