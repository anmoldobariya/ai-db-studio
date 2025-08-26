import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { SquarePen } from 'lucide-react';
import { showSuccessNotification, showErrorNotification } from '@renderer/utils/notifications';
import { ConnectionConfig } from '@renderer/types';

interface ConnectionFormProps {
  connection: ConnectionConfig;
  fetchConnections: () => void;
}

const EditConnectionForm = ({ connection, fetchConnections }: ConnectionFormProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(connection.name);

  const [isLoading, setIsTesting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    setIsTesting(true);
    e.preventDefault();

    try {
      const response = await window.api.updateConnection(connection.id, name);
      if (!response.success) {
        showErrorNotification(response.error || 'Failed to save connection');
        return;
      }
      showSuccessNotification(`Connection ${name} was successful`);
      setOpen(false);
      fetchConnections();
    } catch (error) {
      showErrorNotification('Failed to test connection: ' + (error as Error).message);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <SquarePen />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Add New Connection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Connection Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Database"
              required
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              className="mr-2"
              onClick={() => {
                setOpen(false);
                setName(connection.name);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">{isLoading ? 'Saving...' : 'Save Connection'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditConnectionForm;
