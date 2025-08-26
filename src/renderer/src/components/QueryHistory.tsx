import { useState, useEffect } from 'react';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { Card } from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog';
import { 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Star, 
  StarOff, 
  Trash2, 
  Copy,
  Play,
  Calendar,
  Database
} from 'lucide-react';
import { QueryHistoryItem, QueryBookmark } from '@renderer/types/index';
import { showSuccessNotification, showErrorNotification } from '@renderer/utils/notifications';

interface QueryHistoryProps {
  connectionId?: string;
  onQuerySelect?: (query: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const QueryHistory = ({ connectionId, onQuerySelect, isOpen, onClose }: QueryHistoryProps) => {
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [bookmarks, setBookmarks] = useState<QueryBookmark[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('history');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch data
  useEffect(() => {
    if (isOpen) {
      fetchHistory();
      fetchBookmarks();
      setSearchTerm(''); // Clear search when opening
    }
  }, [isOpen, connectionId]);

  // Auto-search when switching tabs
  useEffect(() => {
    if (searchTerm.trim()) {
      handleSearch(searchTerm);
    } else {
      if (activeTab === 'history') {
        fetchHistory();
      } else {
        fetchBookmarks();
      }
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const result = await window.api.getQueryHistory(connectionId, 100);
      if (result.success && result.history) {
        setHistory(result.history);
      }
    } catch (error) {
      showErrorNotification('Failed to fetch query history');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const result = await window.api.getBookmarks(connectionId);
      if (result.success && result.bookmarks) {
        setBookmarks(result.bookmarks);
      }
    } catch (error) {
      showErrorNotification('Failed to fetch bookmarks');
    }
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      fetchHistory();
      return;
    }

    try {
      if (activeTab === 'history') {
        const result = await window.api.searchQueryHistory(term, connectionId);
        if (result.success && result.history) {
          setHistory(result.history);
        }
      } else {
        const result = await window.api.searchBookmarks(term);
        if (result.success && result.bookmarks) {
          setBookmarks(result.bookmarks);
        }
      }
    } catch (error) {
      showErrorNotification('Search failed');
    }
  };

  const handleToggleBookmark = async (historyItem: QueryHistoryItem) => {
    try {
      const result = await window.api.toggleHistoryBookmark(historyItem.id);
      if (result.success) {
        // Update the history item locally
        setHistory(prev => prev.map(item => 
          item.id === historyItem.id 
            ? { ...item, isBookmarked: result.isBookmarked || false }
            : item
        ));

        fetchBookmarks();
        
        showSuccessNotification(
          result.isBookmarked 
            ? 'Query bookmarked successfully' 
            : 'Bookmark removed successfully'
        );
        
        // Always refresh bookmarks to keep them in sync
        await fetchBookmarks();
      }
    } catch (error) {
      showErrorNotification('Failed to toggle bookmark');
    }
  };

  const handleDeleteHistoryItem = async (id: string) => {
    try {
      const result = await window.api.deleteHistoryItem(id);
      if (result.success) {
        setHistory(prev => prev.filter(item => item.id !== id));
        showSuccessNotification('History item deleted');
      }
    } catch (error) {
      showErrorNotification('Failed to delete history item');
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    try {
      const result = await window.api.deleteBookmark(id);
      if (result.success) {
        setBookmarks(prev => prev.filter(bookmark => bookmark.id !== id));
        showSuccessNotification('Bookmark deleted');
      }
    } catch (error) {
      showErrorNotification('Failed to delete bookmark');
    }
  };

  const handleCopyQuery = (query: string) => {
    navigator.clipboard.writeText(query);
    showSuccessNotification('Query copied to clipboard');
  };

  const handleExecuteQuery = (query: string) => {
    if (onQuerySelect) {
      onQuerySelect(query);
      onClose();
      showSuccessNotification('Query loaded into editor');
    }
  };

  const formatExecutionTime = (time: number) => {
    if (time < 1000) {
      return `${time.toFixed(0)}ms`;
    }
    return `${(time / 1000).toFixed(2)}s`;
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Query History & Bookmarks</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col space-y-4">
          {/* Search Bar */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="history" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                History ({history.length})
              </TabsTrigger>
              <TabsTrigger value="bookmarks" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Bookmarks ({bookmarks.length})
              </TabsTrigger>
            </TabsList>

            {/* History Tab */}
            <TabsContent value="history" className="flex-1 min-h-0">
              <ScrollArea allowVerticalScroll className="h-[60vh]">
                <div className="space-y-3 pr-4">
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading history...
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No query history found
                    </div>
                  ) : (
                    history.map((item) => (
                      <Card key={item.id} className="p-4 hover:bg-accent/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge variant={item.success ? "default" : "destructive"} className="text-xs">
                                {item.success ? (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                ) : (
                                  <XCircle className="h-3 w-3 mr-1" />
                                )}
                                {item.success ? 'Success' : 'Failed'}
                              </Badge>
                              
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatExecutionTime(item.executionTime)}
                              </Badge>
                              
                              {item.resultCount !== undefined && (
                                <Badge variant="outline" className="text-xs">
                                  {item.resultCount} rows
                                </Badge>
                              )}

                              <Badge variant="outline" className="text-xs">
                                <Database className="h-3 w-3 mr-1" />
                                {item.connectionName}
                              </Badge>
                            </div>

                            {/* Query */}
                            <pre className="text-sm bg-muted p-2 rounded whitespace-pre-wrap font-mono break-words">
                              {item.query.length > 200 
                                ? `${item.query.substring(0, 200)}...` 
                                : item.query}
                            </pre>

                            {/* Error Message */}
                            {!item.success && item.errorMessage && (
                              <div className="mt-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                                {item.errorMessage}
                              </div>
                            )}

                            {/* Timestamp */}
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDate(item.timestamp)}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleBookmark(item)}
                              className="h-8 w-8 p-0"
                              title={item.isBookmarked ? "Remove bookmark" : "Add bookmark"}
                            >
                              {item.isBookmarked ? (
                                <Star className="h-4 w-4 fill-current text-yellow-500" />
                              ) : (
                                <StarOff className="h-4 w-4" />
                              )}
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyQuery(item.query)}
                              className="h-8 w-8 p-0"
                              title="Copy query"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            
                            {onQuerySelect && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleExecuteQuery(item.query)}
                                className="h-8 w-8 p-0"
                                title="Load query into editor"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteHistoryItem(item.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              title="Delete history item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Bookmarks Tab */}
            <TabsContent value="bookmarks" className="flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="space-y-3 pr-4">
                  {bookmarks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No bookmarks found
                    </div>
                  ) : (
                    bookmarks.map((bookmark) => (
                      <Card key={bookmark.id} className="p-4 hover:bg-accent/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h4 className="font-medium text-sm">{bookmark.name}</h4>
                              {bookmark.tags && bookmark.tags.map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>

                            {/* Description */}
                            {bookmark.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {bookmark.description}
                              </p>
                            )}

                            {/* Query */}
                            <pre className="text-sm bg-muted p-2 rounded whitespace-pre-wrap font-mono break-words">
                              {bookmark.query.length > 200 
                                ? `${bookmark.query.substring(0, 200)}...` 
                                : bookmark.query}
                            </pre>

                            {/* Metadata */}
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Created: {formatDate(bookmark.createdAt)}
                              </div>
                              {bookmark.lastUsed && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Last used: {formatDate(bookmark.lastUsed)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyQuery(bookmark.query)}
                              className="h-8 w-8 p-0"
                              title="Copy query"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            
                            {onQuerySelect && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleExecuteQuery(bookmark.query)}
                                className="h-8 w-8 p-0"
                                title="Load query into editor"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteBookmark(bookmark.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              title="Delete bookmark"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QueryHistory;