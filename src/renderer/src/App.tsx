import { useState, useEffect } from 'react';
import { Button } from '@renderer/components/ui/button';
import { TableInfo, EncryptedConnection, ConnectionType } from '@renderer/types/index';
import Sidebar from '@renderer/components/Sidebar';
import DataTable from '@renderer/components/DataTable';
import AiChat from '@renderer/components/AiChat';
import { HomeIcon, Plus, XIcon, History } from 'lucide-react';
import { showSuccessNotification, showErrorNotification } from '@renderer/utils/notifications';
import SchemaVisualization from './components/ERD';
import QueryEditor from './components/QueryEditor/QueryEditor';
import QueryHistory from './components/QueryHistory';
// import BookmarkManager from './components/BookmarkManager';
import ExportDialog from './components/ExportDialog';
import { ModeToggle } from './components/theme/mode-toggle';
import { ScrollArea } from './components/ui/scroll-area';
import { cn } from './lib/utils';
import ConnectionCard from './components/ConnectionCard';
import { Card } from './components/ui/card';
import ConnectionForm from './components/Form/ConnectionForm';
import { ErrorBoundary } from './components/ui/error-boundary';
import { ErrorDisplay } from './components/ui/error-display';
import { LoadingOverlay, InlineLoading } from './components/ui/loading';

// Connection-specific state interface
interface ConnectionState {
  queryResult: any;
  queryTime: string | null;
  lastQuery: string;
  activeTable: TableInfo | null;
  error: string | null;
  errorDetails: {
    type?: string;
    retryable?: boolean;
    code?: string;
    timestamp?: string;
  } | null;
}

const App = () => {
  const [connections, setConnections] = useState<EncryptedConnection[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [activeConnection, setActiveConnection] = useState<EncryptedConnection | null>(null);
  const [activeConnections, setActiveConnections] = useState<EncryptedConnection[] | []>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);

  // Connection-specific states - stored as a map with connectionId as key
  const [connectionStates, setConnectionStates] = useState<Map<string, ConnectionState>>(new Map());

  // Global loading states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Global error states for connection fetching
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalErrorDetails, setGlobalErrorDetails] = useState<{
    type?: string;
    retryable?: boolean;
    code?: string;
    timestamp?: string;
  } | null>(null);

  // UI states
  const [showERD, setShowERD] = useState<boolean>(false);
  const [showChat, setShowChat] = useState<boolean>(true);
  const [showConnectionsList, setShowConnectionsList] = useState<boolean>(true);
  const [showQueryHistory, setShowQueryHistory] = useState<boolean>(false);
  const [showExportDialog, setShowExportDialog] = useState<boolean>(false);
  const [isLoadingConnections, setIsLoadingConnections] = useState<boolean>(true);
  const [forceQueryUpdate, setForceQueryUpdate] = useState<boolean>(false);

  // Helper function to get current connection state
  const getCurrentConnectionState = (): ConnectionState => {
    if (!activeConnectionId) {
      return {
        queryResult: null,
        queryTime: null,
        lastQuery: '',
        activeTable: null,
        error: null,
        errorDetails: null
      };
    }

    return (
      connectionStates.get(activeConnectionId) || {
        queryResult: null,
        queryTime: null,
        lastQuery: '',
        activeTable: null,
        error: null,
        errorDetails: null
      }
    );
  };

  // Helper function to update current connection state
  const updateConnectionState = (updates: Partial<ConnectionState>) => {
    if (!activeConnectionId) return;

    setConnectionStates((prev) => {
      const newMap = new Map(prev);
      const currentState = getCurrentConnectionState();
      newMap.set(activeConnectionId, { ...currentState, ...updates });
      return newMap;
    });
  };

  // Get current state values for easier access
  const currentState = getCurrentConnectionState();
  const { queryResult, queryTime, lastQuery, activeTable, error, errorDetails } = currentState;

  const fetchConnections = async () => {
    setIsLoadingConnections(true);
    setGlobalError(null);
    setGlobalErrorDetails(null);
    try {
      const result = await window.api.getConnections();
      if (result.success) {
        setConnections(result.connections || []);
      } else {
        const error = 'error' in result ? String(result.error) : 'Failed to fetch connections';
        setGlobalError(error);
        setGlobalErrorDetails({
          type: 'errorType' in result ? String(result.errorType) : undefined,
          retryable: 'retryable' in result ? Boolean(result.retryable) : true,
          code: 'errorCode' in result ? String(result.errorCode) : undefined,
          timestamp: 'timestamp' in result ? String(result.timestamp) : undefined
        });
        showErrorNotification('Failed to fetch connections', {
          description: error
        });
      }
    } catch (err: any) {
      setGlobalError(err.message || 'An unexpected error occurred');
      setGlobalErrorDetails({ retryable: true });
      showErrorNotification('Failed to fetch connections', {
        description: err.message
      });
    } finally {
      setIsLoadingConnections(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  // Update active connection when ID changes
  useEffect(() => {
    setIsConnecting(true);

    if (activeConnectionId) {
      const connection = connections.find((c) => c.id === activeConnectionId);
      setActiveConnection(connection || null);

      // Add to active connections if not already present
      setActiveConnections((prev) => {
        const existing = prev.find((c) => c.id === activeConnectionId);
        if (existing) {
          setTables(existing.tables || []);
          return prev;
        }
        if (connection) {
          connection.tables = tables;
          return [...prev, connection];
        }
        return prev;
      });

      // Initialize connection state if it doesn't exist
      if (!connectionStates.has(activeConnectionId)) {
        setConnectionStates((prev) => {
          const newMap = new Map(prev);
          newMap.set(activeConnectionId, {
            queryResult: null,
            queryTime: null,
            lastQuery: '',
            activeTable: null,
            error: null,
            errorDetails: null
          });
          return newMap;
        });
      }

      setShowConnectionsList(false);
    } else {
      setActiveConnection(null);
      setTables([]);
    }

    setIsConnecting(false);
  }, [activeConnectionId, connections]);

  const handleConnectProcess = (connectionId: string, tables: TableInfo[]) => {
    setTables(tables);
    setActiveConnectionId(connectionId);
  };

  const handleSelectTable = (table: TableInfo) => {
    // Update the active table for this connection
    updateConnectionState({ activeTable: table });

    // Generate a default query based on selected table and connection type
    let defaultQuery = '';
    if (activeConnection) {
      if (
        activeConnection.type === 'postgresql' ||
        activeConnection.type === 'sqlite3' ||
        activeConnection.type === 'mysql'
      ) {
        defaultQuery = `SELECT * FROM ${table.schema ? `${table.schema}.` : ''}${table.name} LIMIT 100;`;
      } else if (activeConnection.type === 'mongodb') {
        defaultQuery = `db.${table.name}.find({})`;
      }
    }

    // Update the last query for this connection
    updateConnectionState({ lastQuery: defaultQuery });

    // Set force update flag for table-generated queries
    setForceQueryUpdate(true);

    // Small delay to ensure state update completes before execution
    setTimeout(() => {
      // Reset force update flag after a brief moment
      setTimeout(() => setForceQueryUpdate(false), 100);
      handleExecuteQuery(defaultQuery);
    }, 10);
  };

  const handleExecuteQuery = async (query: string) => {
    if (!query.trim()) {
      showErrorNotification('Query cannot be empty');
      return;
    }

    if (!activeConnection) {
      showErrorNotification('No active database connection');
      return;
    }

    setIsLoading(true);
    // Clear error state for this connection but don't update lastQuery yet
    updateConnectionState({
      error: null,
      errorDetails: null
    });

    const startTime = performance.now();

    try {
      const result = await window.api.runQuery(activeConnection.id, query);
      const queryTime = (performance.now() - startTime).toFixed(2);

      if (result.success && result.result) {
        const message = 'message' in result ? String(result.message || '') : '';
        showSuccessNotification('Query executed successfully', {
          description: message || `Query executed in ${queryTime} ms`
        });

        // Update connection-specific state with results
        updateConnectionState({
          queryResult: result.result,
          queryTime: queryTime,
          error: null,
          errorDetails: null,
          lastQuery: query // Preserve the executed query
        });
      } else {
        const error = 'error' in result ? String(result.error) : 'Query execution failed';
        const errorDetails = {
          type: 'errorType' in result ? String(result.errorType) : undefined,
          retryable: 'retryable' in result ? Boolean(result.retryable) : false,
          code: 'errorCode' in result ? String(result.errorCode) : undefined,
          timestamp: 'timestamp' in result ? String(result.timestamp) : undefined
        };

        // Update connection-specific state with error
        updateConnectionState({
          queryResult: [],
          error: error,
          errorDetails: errorDetails,
          lastQuery: query // Preserve the attempted query
        });

        showErrorNotification('Query failed', {
          description: error,
          duration: 5000
        });
      }
    } catch (err: any) {
      const queryTime = (performance.now() - startTime).toFixed(2);
      const error = err.message || 'An unexpected error occurred';

      // Update connection-specific state with error
      updateConnectionState({
        queryResult: [],
        queryTime: queryTime,
        error: error,
        errorDetails: { retryable: true },
        lastQuery: query // Preserve the attempted query
      });

      showErrorNotification('Query failed', {
        description: err.message,
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveConnection = async (id: string) => {
    try {
      const result = await window.api.disconnectDb(id);
      if (result.success) {
        const message =
          'message' in result
            ? String(result.message || 'Connection disconnected successfully')
            : 'Connection disconnected successfully';
        showSuccessNotification(message);

        // Clean up connection-specific state
        setConnectionStates((prev) => {
          const newMap = new Map(prev);
          newMap.delete(id);
          return newMap;
        });

        // If we're removing the currently active connection, go back to home
        if (activeConnectionId === id) {
          setShowConnectionsList(true);
          setActiveConnection(null);
          setActiveConnectionId(null);
        }

        setActiveConnections((prev) => prev.filter((c) => c.id !== id));
        fetchConnections();
      } else {
        showErrorNotification('Failed to remove connection', {
          description: result.error,
          duration: 5000
        });
      }
    } catch (error: any) {
      showErrorNotification('Failed to remove connection', {
        description: error.message,
        duration: 5000
      });
    }
  };

  const handleExport = async () => {
    try {
      const result = await window.api.exportConnections();
      if (result.success) {
        showSuccessNotification(result.message || 'Connections exported successfully');
      } else {
        showErrorNotification('Failed to export connections', {
          description: result.error,
          duration: 5000
        });
      }
    } catch (error: any) {
      showErrorNotification('Failed to export connections', {
        description: error.message,
        duration: 5000
      });
    }
  };

  const handleImport = async () => {
    try {
      const result = await window.api.importConnections();
      if (result.success) {
        showSuccessNotification(result.message || 'Connections imported successfully');
        fetchConnections();
      } else {
        showErrorNotification('Failed to import connections', {
          description: result.error,
          duration: 5000
        });
      }
    } catch (error: any) {
      showErrorNotification('Failed to import connections', {
        description: error.message,
        duration: 5000
      });
    }
  };

  const handleRetryConnection = () => {
    if (globalErrorDetails?.retryable) {
      fetchConnections();
    }
  };

  const handleRetryQuery = () => {
    if (errorDetails?.retryable && lastQuery) {
      handleExecuteQuery(lastQuery);
    }
  };

  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <div className="bg-background flex flex-col h-screen overflow-hidden">
        {/* Header area */}
        <div className="flex items-center border-b pr-4 gap-2">
          <div className="shrink-0 bg-background border-r dark:border-gray-600 px-6 py-1.5 text-center text-md font-medium font-sans">
            Database Studio
            <p className="text-[12px]">AI-driven DBMS</p>
          </div>
          <ScrollArea allowHorizontalScroll className="bg-card/50 w-full">
            <div className="flex items-center gap-2 px-1 py-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setShowConnectionsList(true);
                  setActiveConnectionId(null);
                }}
                className={cn(
                  showConnectionsList ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                )}
              >
                <HomeIcon />
                <span>Home</span>
              </Button>

              {/* Connection selection bar */}
              {activeConnections.length > 0 &&
                activeConnections.map((connection) => (
                  <div
                    key={connection.id}
                    className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm whitespace-nowrap ${
                      activeConnectionId === connection.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <button
                      onClick={() => setActiveConnectionId(connection.id)}
                      className="font-medium"
                    >
                      {connection.name}
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveConnection(connection.id)}
                      className="opacity-80 hover:opacity-100 cursor-pointer "
                    >
                      <XIcon />
                    </Button>
                  </div>
                ))}
            </div>
          </ScrollArea>
          {showConnectionsList && (
            <>
              <Button onClick={handleExport}>Export</Button>
              <Button onClick={handleImport}>Import</Button>
            </>
          )}
          <ModeToggle />
        </div>

        {/* Main content */}
        {showConnectionsList ? (
          <ErrorBoundary>
            <div className="flex-1 overflow-auto">
              {isLoadingConnections ? (
                <LoadingOverlay message="Loading connections..." className="h-full" />
              ) : globalError ? (
                <div className="p-6">
                  <ErrorDisplay
                    title="Failed to load connections"
                    message={globalError}
                    severity={globalErrorDetails?.type === 'CONNECTION_ERROR' ? 'error' : 'warning'}
                    retryable={globalErrorDetails?.retryable}
                    onRetry={handleRetryConnection}
                    details={
                      globalErrorDetails?.code
                        ? `Error Code: ${globalErrorDetails.code}`
                        : undefined
                    }
                  />
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5 p-4">
                  {connections.map((connection) => (
                    <ConnectionCard
                      key={connection.id}
                      connection={connection}
                      handleConnectProcess={handleConnectProcess}
                      isDisabled={activeConnections.some((c) => c.id === connection.id)}
                      fetchConnections={fetchConnections}
                    />
                  ))}
                  <Card className="border-dashed flex items-center justify-center">
                    <button
                      onClick={() => {
                        const connectionFormButton = document.querySelector(
                          '[data-testid="open-connection-form"]'
                        );

                        if (connectionFormButton instanceof HTMLElement) {
                          connectionFormButton.click();
                        }
                      }}
                      className="flex flex-col items-center cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <div className="bg-muted rounded-full p-4 mb-3">
                        <Plus />
                      </div>
                      <p className="font-medium">Add New Connection</p>
                    </button>
                  </Card>
                </div>
              )}
            </div>
          </ErrorBoundary>
        ) : (
          <ErrorBoundary>
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar with tables */}
              <div className="bg-sidebar h-full flex flex-col border-r">
                {isConnecting ? (
                  <InlineLoading message="Connecting to database..." className="p-4" />
                ) : (
                  <ErrorBoundary>
                    <Sidebar
                      tables={tables}
                      activeTable={activeTable}
                      onTableSelect={handleSelectTable}
                    />
                  </ErrorBoundary>
                )}
              </div>

              {/* Query editor and results */}
              <div className="flex-1 overflow-hidden p-4">
                <ErrorBoundary>
                  <div className="flex h-full flex-col space-y-4">
                    {activeTable ? (
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold">
                          {activeTable.schema ? `${activeTable.schema}.` : ''}
                          {activeTable.name}
                        </h2>
                        <div className="space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowQueryHistory(true)}
                          >
                            <History className="h-4 w-4 mr-2" />
                            History
                          </Button>
                          {activeConnection?.type === ConnectionType.POSTGRESQL && (
                            <Button size="sm" variant="outline" onClick={() => setShowERD(true)}>
                              Show ERD
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setShowChat((prev) => !prev)}
                          >
                            {showChat ? 'Hide AI Chat' : 'Show AI Chat'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 flex justify-end">
                        <div className="space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowQueryHistory(true)}
                          >
                            <History className="h-4 w-4 mr-2" />
                            History
                          </Button>
                          {activeConnection?.type !== ConnectionType.MONGODB && (
                            <Button size="sm" variant="outline" onClick={() => setShowERD(true)}>
                              Show ERD
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setShowChat((prev) => !prev)}
                          >
                            {showChat ? 'Hide AI Chat' : 'Show AI Chat'}
                          </Button>
                        </div>
                      </div>
                    )}

                    <QueryEditor
                      initialQuery={lastQuery}
                      onExecute={handleExecuteQuery}
                      isLoading={isLoading}
                      connectionType={activeConnection?.type!}
                      forceUpdate={forceQueryUpdate}
                    />

                    <div className="flex-1 overflow-hidden">
                      {isLoading ? (
                        <LoadingOverlay message="Executing query..." />
                      ) : error ? (
                        <ErrorDisplay
                          title="Query Failed"
                          message={error}
                          severity={errorDetails?.type === 'QUERY_ERROR' ? 'error' : 'warning'}
                          retryable={errorDetails?.retryable && !!lastQuery}
                          onRetry={handleRetryQuery}
                          details={
                            errorDetails?.code ? `Error Code: ${errorDetails.code}` : undefined
                          }
                        />
                      ) : !activeTable && !queryResult ? (
                        <div className="text-muted-foreground py-8 text-center">
                          Select a table from the sidebar or run a query to see results
                        </div>
                      ) : (
                        <ErrorBoundary>
                          <DataTable
                            data={queryResult}
                            queryTime={queryTime}
                            queryError={error}
                            onExport={() => setShowExportDialog(true)}
                          />
                        </ErrorBoundary>
                      )}
                    </div>
                  </div>
                </ErrorBoundary>
              </div>

              {/* AI Chat Section - only shown when connection is active */}
              {showChat && (
                <div className="w-80 flex-end overflow-hidden border-l">
                  <ErrorBoundary>
                    <AiChat
                      activeConnection={activeConnection}
                      activeTable={activeTable?.name}
                      setLastQuery={(query) => updateConnectionState({ lastQuery: query })}
                    />
                  </ErrorBoundary>
                </div>
              )}
            </div>
          </ErrorBoundary>
        )}
      </div>

      <ErrorBoundary>
        {activeConnection?.type !== ConnectionType.MONGODB && (
          <SchemaVisualization showERD={showERD} setShowERD={setShowERD} schemaData={tables} />
        )}
      </ErrorBoundary>

      <ErrorBoundary>
        <QueryHistory
          connectionId={activeConnectionId || undefined}
          onQuerySelect={(query) => updateConnectionState({ lastQuery: query })}
          isOpen={showQueryHistory}
          onClose={() => setShowQueryHistory(false)}
        />
      </ErrorBoundary>

      <ErrorBoundary>
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          data={queryResult || []}
          queryTime={queryTime || undefined}
          connectionName={activeConnection?.name}
        />
      </ErrorBoundary>

      <ErrorBoundary>
        <div className="hidden">
          <ConnectionForm fetchConnections={fetchConnections} />
        </div>
      </ErrorBoundary>
    </ErrorBoundary>
  );
};

export default App;
