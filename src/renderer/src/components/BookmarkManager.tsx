import { useState, useEffect } from 'react';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Textarea } from '@renderer/components/ui/textarea';
import { Card } from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@renderer/components/ui/dialog';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { Plus, Edit, Save, X, Tag } from 'lucide-react';
import { QueryBookmark } from '@renderer/types/index';
import { showSuccessNotification, showErrorNotification } from '@renderer/utils/notifications';

interface BookmarkManagerProps {
  connectionId?: string;
  currentQuery?: string;
  onBookmarkSelect?: (query: string) => void;
}

interface BookmarkFormData {
  name: string;
  query: string;
  description: string;
  tags: string[];
  connectionId?: string;
}

const BookmarkManager = ({ connectionId, currentQuery, onBookmarkSelect }: BookmarkManagerProps) => {
  const [bookmarks, setBookmarks] = useState<QueryBookmark[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<QueryBookmark | null>(null);
  const [formData, setFormData] = useState<BookmarkFormData>({
    name: '',
    query: currentQuery || '',
    description: '',
    tags: [],
    connectionId
  });
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchBookmarks();
  }, [connectionId]);

  useEffect(() => {
    if (currentQuery && !editingBookmark) {
      setFormData(prev => ({ ...prev, query: currentQuery }));
    }
  }, [currentQuery, editingBookmark]);

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

  const handleSaveBookmark = async () => {
    if (!formData.name.trim() || !formData.query.trim()) {
      showErrorNotification('Name and query are required');
      return;
    }

    setIsLoading(true);
    try {
      if (editingBookmark) {
        // Update existing bookmark
        const result = await window.api.updateBookmark(editingBookmark.id, {
          name: formData.name,
          query: formData.query,
          description: formData.description || undefined,
          tags: formData.tags.length > 0 ? formData.tags : undefined,
          connectionId: formData.connectionId
        });

        if (result.success) {
          showSuccessNotification('Bookmark updated successfully');
          setEditingBookmark(null);
        } else {
          showErrorNotification('Failed to update bookmark');
        }
      } else {
        // Create new bookmark
        const result = await window.api.addBookmark({
          name: formData.name,
          query: formData.query,
          description: formData.description || undefined,
          tags: formData.tags.length > 0 ? formData.tags : undefined,
          connectionId: formData.connectionId
        });

        if (result.success) {
          showSuccessNotification('Bookmark created successfully');
        } else {
          showErrorNotification('Failed to create bookmark');
        }
      }

      setIsDialogOpen(false);
      resetForm();
      fetchBookmarks();
    } catch (error) {
      showErrorNotification('Failed to save bookmark');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditBookmark = (bookmark: QueryBookmark) => {
    setEditingBookmark(bookmark);
    setFormData({
      name: bookmark.name,
      query: bookmark.query,
      description: bookmark.description || '',
      tags: bookmark.tags || [],
      connectionId: bookmark.connectionId
    });
    setIsDialogOpen(true);
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

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      query: currentQuery || '',
      description: '',
      tags: [],
      connectionId
    });
    setTagInput('');
    setEditingBookmark(null);
  };

  const handleQuickBookmark = async () => {
    if (!currentQuery?.trim()) {
      showErrorNotification('No query to bookmark');
      return;
    }

    const result = await window.api.addBookmark({
      name: `Quick Bookmark ${new Date().toLocaleString()}`,
      query: currentQuery,
      connectionId
    });

    if (result.success) {
      showSuccessNotification('Query bookmarked');
      fetchBookmarks();
    } else {
      showErrorNotification('Failed to bookmark query');
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="flex gap-2">
        {currentQuery && (
          <Button size="sm" onClick={handleQuickBookmark}>
            <Plus className="h-4 w-4 mr-2" />
            Quick Bookmark
          </Button>
        )}
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              New Bookmark
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingBookmark ? 'Edit Bookmark' : 'Create New Bookmark'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="bookmark-name">Name *</Label>
                <Input
                  id="bookmark-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My useful query"
                />
              </div>

              {/* Query */}
              <div className="space-y-2">
                <Label htmlFor="bookmark-query">Query *</Label>
                <Textarea
                  id="bookmark-query"
                  value={formData.query}
                  onChange={(e) => setFormData(prev => ({ ...prev, query: e.target.value }))}
                  placeholder="SELECT * FROM..."
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="bookmark-description">Description</Label>
                <Textarea
                  id="bookmark-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What does this query do?"
                  rows={2}
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    placeholder="Add tag..."
                    className="flex-1"
                  />
                  <Button type="button" size="sm" onClick={addTag}>
                    <Tag className="h-4 w-4" />
                  </Button>
                </div>
                
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formData.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer">
                        {tag}
                        <X 
                          className="h-3 w-3 ml-1 hover:text-destructive" 
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveBookmark} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingBookmark ? 'Update' : 'Save'} Bookmark
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bookmarks List */}
      <ScrollArea className="h-64">
        <div className="space-y-2">
          {bookmarks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No bookmarks yet. Create your first bookmark!
            </div>
          ) : (
            bookmarks.map((bookmark) => (
              <Card key={bookmark.id} className="p-3 hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">{bookmark.name}</h4>
                      {bookmark.tags?.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    {bookmark.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {bookmark.description}
                      </p>
                    )}
                    
                    <pre className="text-xs bg-muted p-2 rounded font-mono overflow-hidden whitespace-pre-wrap">
                      {bookmark.query.length > 150 
                        ? `${bookmark.query.substring(0, 150)}...` 
                        : bookmark.query}
                    </pre>
                  </div>
                  
                  <div className="flex gap-1">
                    {onBookmarkSelect && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onBookmarkSelect(bookmark.query)}
                        className="h-7 w-7 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditBookmark(bookmark)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteBookmark(bookmark.id)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default BookmarkManager;