import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@renderer/components/ui/alert-dialog';
import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { EncryptedConnection, TableInfo } from '@renderer/types';
import { showSuccessNotification, showErrorNotification } from '@renderer/utils/notifications';
import EncryptionForm from './Form/EncryptionForm';
import EditConnectionForm from './Form/EditConnectionForm';

// Define the type for the connection prop
interface ConnectionCardProps {
  connection: EncryptedConnection;
  isDisabled: boolean;
  handleConnectProcess: (connectionId: string, tables: TableInfo[]) => void;
  fetchConnections: () => void;
}

const ConnectionCard = ({
  connection,
  handleConnectProcess,
  isDisabled,
  fetchConnections
}: ConnectionCardProps) => {
  const [connectionToDelete, setConnectionToDelete] = useState<string | null>(null);
  const [openEncryptionKeyModal, setOpenEncryptionKeyModal] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState<string>('');
  const [encryptionLoading, setEncryptionLoading] = useState(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setEncryptionLoading(true);
    try {
      const result = await window.api.connectDb(connection.id, encryptionKey);
      if (result.success) {
        showSuccessNotification(`Connected to "${connection.name}" successfully.`);
        handleConnectProcess(connection.id, result.tables);
        setOpenEncryptionKeyModal(false);
        setEncryptionKey('');
        fetchConnections();
      } else {
        showErrorNotification(`Failed to connect: ${result.error}`);
      }
    } catch (error) {
      showErrorNotification(`Error connecting to database: ${(error as Error).message}`);
    }
    setEncryptionLoading(false);
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDisabled) {
      showErrorNotification('Cannot delete while connected');
      return;
    }
    try {
      const result = await window.api.deleteConnection(connection.id);
      if (result.success) {
        showSuccessNotification(`Connection "${connection.name}" deleted successfully.`);
        setConnectionToDelete(null);
        fetchConnections();
      } else {
        showErrorNotification(`Failed to delete connection: ${result.error}`);
      }
    } catch (error) {
      showErrorNotification(`Error deleting connection: ${(error as Error).message}`);
    }
  };

  return (
    <>
      <Card key={connection.id} className="overflow-hidden py-4">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <CardTitle>{connection.name}</CardTitle>
            </div>
            <div className="flex space-x-1">
              <EditConnectionForm connection={connection} fetchConnections={fetchConnections} />
              <AlertDialog
                open={connectionToDelete === connection.id}
                onOpenChange={(open) => {
                  if (!open) setConnectionToDelete(null);
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    onClick={() => setConnectionToDelete(connection.id)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2Icon />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Connection</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete the connection "{connection.name}"? This
                      action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setConnectionToDelete(null)}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-background"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>

        <CardFooter className="flex justify-between">
          <CardDescription className="select-none">{connection.type.toUpperCase()}</CardDescription>
          <Button disabled={isDisabled} onClick={() => setOpenEncryptionKeyModal(true)}>
            Connect
          </Button>
        </CardFooter>
      </Card>
      <EncryptionForm
        encryptionKey={encryptionKey}
        setEncryptionKey={setEncryptionKey}
        encryptionForm={openEncryptionKeyModal}
        setEncryptionForm={setOpenEncryptionKeyModal}
        handleEncryption={handleConnect}
        isLoading={encryptionLoading}
      />
    </>
  );
};

export default ConnectionCard;
