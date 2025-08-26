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
import { RadioGroup, RadioGroupItem } from '@renderer/components/ui/radio-group';
import { Plus, FolderOpen } from 'lucide-react';
import { ConnectionConfig, ConnectionType } from '@renderer/types/index';
import { showSuccessNotification, showErrorNotification } from '@renderer/utils/notifications';
import EncryptionForm from './EncryptionForm';

interface ConnectionFormProps {
  fetchConnections: () => Promise<void>;
}

const ConnectionForm = ({ fetchConnections }: ConnectionFormProps) => {
  const [open, setOpen] = useState(false);
  const [connectionType, setConnectionType] = useState<ConnectionType>(ConnectionType.POSTGRESQL);
  const [name, setName] = useState('');
  const [postgresConfig, setPostgresConfig] = useState({
    host: 'localhost',
    port: '',
    user: '',
    password: '',
    database: ''
  });

  const [mysqlConfig, setMysqlConfig] = useState({
    host: 'localhost',
    port: '',
    user: '',
    password: '',
    database: '',
    ssl: false
  });

  const [sqliteConfig, setSqliteConfig] = useState({
    filePath: '',
    readonly: false
  });
  const [mongodb, setMongodb] = useState('');

  const [isTesting, setIsTesting] = useState(false);
  const [encryptionForm, setEncryptionForm] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState('');
  const [encryptionLoading, setEncryptionLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);

    const newConnection: ConnectionConfig = {
      id: Date.now().toString(),
      name,
      type: connectionType
    };

    if (connectionType === ConnectionType.POSTGRESQL) {
      const { port } = postgresConfig;
      newConnection.postgresql = { ...postgresConfig, port: port ? parseInt(port) : 5432 };
    } else if (connectionType === ConnectionType.MONGODB) {
      newConnection.mongodb = mongodb;
    } else if (connectionType === ConnectionType.MYSQL) {
      const { port } = mysqlConfig;
      newConnection.mysql = { ...mysqlConfig, port: port ? parseInt(port) : 3306 };
    } else if (connectionType === ConnectionType.SQLITE3) {
      newConnection.sqlite3 = sqliteConfig;
    }

    try {
      const response = await window.api.testConnection(newConnection);
      if (!response.success) {
        showErrorNotification(response.error || 'Failed to save connection');
        return;
      }
      setEncryptionForm(true);
      showSuccessNotification(`Connection ${newConnection.name} was successful`);
    } catch (error) {
      showErrorNotification('Failed to test connection: ' + (error as Error).message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleEncryption = async (e: React.FormEvent) => {
    e.preventDefault();
    setEncryptionLoading(true);

    const newConnection: ConnectionConfig = {
      id: Date.now().toString(),
      name,
      type: connectionType
    };

    if (connectionType === ConnectionType.POSTGRESQL) {
      const { port } = postgresConfig;
      newConnection.postgresql = { ...postgresConfig, port: port ? parseInt(port) : 5432 };
    } else if (connectionType === ConnectionType.MONGODB) {
      newConnection.mongodb = mongodb;
    } else if (connectionType === ConnectionType.MYSQL) {
      const { port } = mysqlConfig;
      newConnection.mysql = { ...mysqlConfig, port: port ? parseInt(port) : 3306 };
    } else if (connectionType === ConnectionType.SQLITE3) {
      newConnection.sqlite3 = sqliteConfig;
    }

    try {
      const result = await window.api.saveConnection(newConnection, encryptionKey);
      if (result.success) {
        showSuccessNotification(`Connection ${newConnection.name} saved successfully`);
        fetchConnections();
        setEncryptionForm(false);
        setOpen(false);
        resetForm();
      } else {
        showErrorNotification('Failed to save connection: ' + result.error);
      }
    } catch (error: any) {
      showErrorNotification('Failed to save connection: ' + error.message);
    }
    setEncryptionLoading(false);
  };

  const resetForm = () => {
    setConnectionType(ConnectionType.POSTGRESQL);
    setName('');
    setPostgresConfig({
      host: 'localhost',
      port: '',
      user: '',
      password: '',
      database: ''
    });
    setMysqlConfig({
      host: 'localhost',
      port: '',
      user: '',
      password: '',
      database: '',
      ssl: false
    });
    setSqliteConfig({
      filePath: '',
      readonly: false
    });
    setMongodb('');
    setEncryptionKey('');
    setEncryptionForm(false);
  };

  const handleBrowseFile = async () => {
    try {
      const result = await window.api.selectFile({
        title: 'Select SQLite Database File',
        filters: [
          { name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.success && !result.canceled && result.filePath) {
        setSqliteConfig(prev => ({ ...prev, filePath: result.filePath! }));
        showSuccessNotification('File selected successfully');
      }
    } catch (error: any) {
      showErrorNotification('Failed to select file: ' + error.message);
    }
  };

  const handleOnOpenChange = (open: boolean) => {
    if (!open) resetForm();
    setOpen(open);
  };

  return (
    <>
      {/* Connection Form */}
      <Dialog open={open} onOpenChange={handleOnOpenChange}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            data-testid="open-connection-form"
            size="icon"
            className="rounded-full"
          >
            <Plus />
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

            <div className="space-y-3">
              <Label>Database Type *</Label>
              <RadioGroup
                value={connectionType}
                onValueChange={(value) => setConnectionType(value as any)}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="postgresql" id="postgresql" />
                  <Label htmlFor="postgresql">PostgreSQL</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mysql" id="mysql" />
                  <Label htmlFor="mysql">MySQL</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sqlite3" id="sqlite3" />
                  <Label htmlFor="sqlite3">SQLite</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mongodb" id="mongodb" />
                  <Label htmlFor="mongodb">MongoDB</Label>
                </div>
              </RadioGroup>
            </div>

            {connectionType === ConnectionType.POSTGRESQL && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="host">Host *</Label>
                    <Input
                      id="host"
                      value={postgresConfig.host}
                      onChange={(e) =>
                        setPostgresConfig((prev) => ({ ...prev, host: e.target.value }))
                      }
                      placeholder="localhost"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      value={postgresConfig.port}
                      onChange={(e) =>
                        setPostgresConfig((prev) => {
                          const port = e.target.value.replace(/\D/g, '');
                          return { ...prev, port };
                        })
                      }
                      placeholder="5432"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="database">Database Name *</Label>
                  <Input
                    id="database"
                    value={postgresConfig.database}
                    onChange={(e) =>
                      setPostgresConfig((prev) => ({ ...prev, database: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      value={postgresConfig.user}
                      onChange={(e) =>
                        setPostgresConfig((prev) => ({ ...prev, user: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={postgresConfig.password}
                      onChange={(e) =>
                        setPostgresConfig((prev) => ({ ...prev, password: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {connectionType === ConnectionType.MYSQL && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mysql-host">Host *</Label>
                    <Input
                      id="mysql-host"
                      value={mysqlConfig.host}
                      onChange={(e) =>
                        setMysqlConfig((prev) => ({ ...prev, host: e.target.value }))
                      }
                      placeholder="localhost"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mysql-port">Port</Label>
                    <Input
                      id="mysql-port"
                      value={mysqlConfig.port}
                      onChange={(e) =>
                        setMysqlConfig((prev) => {
                          const port = e.target.value.replace(/\D/g, '');
                          return { ...prev, port };
                        })
                      }
                      placeholder="3306"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mysql-database">Database Name *</Label>
                  <Input
                    id="mysql-database"
                    value={mysqlConfig.database}
                    onChange={(e) =>
                      setMysqlConfig((prev) => ({ ...prev, database: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mysql-username">Username *</Label>
                    <Input
                      id="mysql-username"
                      value={mysqlConfig.user}
                      onChange={(e) =>
                        setMysqlConfig((prev) => ({ ...prev, user: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mysql-password">Password</Label>
                    <Input
                      id="mysql-password"
                      type="password"
                      value={mysqlConfig.password}
                      onChange={(e) =>
                        setMysqlConfig((prev) => ({ ...prev, password: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="mysql-ssl"
                    checked={mysqlConfig.ssl}
                    onChange={(e) =>
                      setMysqlConfig((prev) => ({ ...prev, ssl: e.target.checked }))
                    }
                  />
                  <Label htmlFor="mysql-ssl">Use SSL</Label>
                </div>
              </>
            )}

            {connectionType === ConnectionType.SQLITE3 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="sqlite-filepath">File Path *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="sqlite-filepath"
                      value={sqliteConfig.filePath}
                      onChange={(e) => setSqliteConfig((prev) => ({ ...prev, filePath: e.target.value }))}
                      placeholder="/path/to/database.db or click Browse"
                      required
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBrowseFile}
                      className="px-3"
                      title="Browse for database file"
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tip: You can use absolute paths, relative paths (e.g., ./data/db.sqlite), or ":memory:" for in-memory database
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sqlite-readonly"
                    checked={sqliteConfig.readonly}
                    onChange={(e) =>
                      setSqliteConfig((prev) => ({ ...prev, readonly: e.target.checked }))
                    }
                  />
                  <Label htmlFor="sqlite-readonly">Read-only mode</Label>
                </div>
              </>
            )}

            {connectionType === ConnectionType.MONGODB && (
              <div className="space-y-2">
                <Label htmlFor="mongodb">Connection String *</Label>
                <Input
                  id="mongodb"
                  value={mongodb}
                  onChange={(e) => setMongodb(e.target.value)}
                  placeholder="mongodb://username:password@host:port/database"
                  required
                />
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                className="mr-2"
                onClick={() => {
                  resetForm();
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">{isTesting ? 'Testing...' : 'Test Connection'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <EncryptionForm
        encryptionKey={encryptionKey}
        setEncryptionKey={setEncryptionKey}
        encryptionForm={encryptionForm}
        setEncryptionForm={setEncryptionForm}
        handleEncryption={handleEncryption}
        isLoading={encryptionLoading}
      />
    </>
  );
};

export default ConnectionForm;
