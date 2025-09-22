import { Button } from '@renderer/components/ui/button';
import { Card, CardContent } from '@renderer/components/ui/card';
import { cn } from '@renderer/lib/utils.js';
import { ConnectionType, TableInfo } from '@renderer/types/index.js';
import { showErrorNotification } from '@renderer/utils/notifications';
import * as monaco from 'monaco-editor';
import 'monaco-sql-languages/esm/languages/pgsql/pgsql.contribution';
import { useEffect, useRef, useState } from 'react';
import { getLanguageIdForConnectionType, registerSchemaCompletion, unregisterSchemaCompletion } from './languageSetup';

interface QueryEditorProps {
  initialQuery: string;
  onExecute: (query: string) => void;
  isLoading: boolean;
  connectionType: ConnectionType;
  forceUpdate?: boolean; // Flag to force editor update even during execution
  connectionId?: string; // For schema completion
  tables?: TableInfo[]; // Schema tables for completion
  activeTable?: TableInfo | null; // Current active table from sidebar
}

const QueryEditor = ({
  initialQuery,
  onExecute,
  isLoading,
  connectionType,
  forceUpdate = false,
  connectionId,
  tables = [],
  activeTable = null
}: QueryEditorProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | undefined>(undefined);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const prevInitialQueryRef = useRef<string>('');
  const isExecutingRef = useRef<boolean>(false);

  useEffect(() => {
    if (hostRef.current && !editorRef.current) {
      const languageId = getLanguageIdForConnectionType(connectionType);

      editorRef.current = monaco.editor.create(hostRef.current, {
        language: languageId,
        value: initialQuery,
        autoClosingQuotes: 'languageDefined',
        autoClosingBrackets: 'languageDefined',
        autoIndent: 'full',
        autoDetectHighContrast: true,
        formatOnType: true,
        formatOnPaste: true,
        scrollBeyondLastLine: false,
        tabCompletion: 'on',
        tabFocusMode: true,
        lineNumbers: 'on',
        fontSize: 14,
        minimap: { enabled: false },
        automaticLayout: true,
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
          arrowSize: 0,
          useShadows: false
        }
      });

      editorRef.current?.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        const query = editorRef.current?.getValue();
        if (query) onExecute(query);
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = undefined;
      }
    };
  }, []); // Remove initialQuery from dependencies to prevent editor recreation

  // Separate useEffect to update editor value when initialQuery changes
  useEffect(() => {
    if (editorRef.current && initialQuery && initialQuery.trim()) {
      const currentValue = editorRef.current.getValue();
      const prevInitialQuery = prevInitialQueryRef.current;

      // Update if:
      // 1. initialQuery is different from previous initialQuery AND
      // 2. initialQuery is different from current editor value AND
      // 3. Either forceUpdate is true OR (we're not executing OR the current editor is empty)
      if (initialQuery !== prevInitialQuery &&
        currentValue !== initialQuery &&
        (forceUpdate || !isExecutingRef.current || !currentValue.trim())) {
        editorRef.current.setValue(initialQuery);
        prevInitialQueryRef.current = initialQuery;
      }
    }
  }, [initialQuery, forceUpdate]);

  // Track when we're executing queries
  useEffect(() => {
    isExecutingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    const model = editorRef.current?.getModel();
    const newLang = getLanguageIdForConnectionType(connectionType);
    if (model && model.getLanguageId() !== newLang) {
      monaco.editor.setModelLanguage(model, newLang);
    }
  }, [connectionType]);

  // Register schema completion when connectionId and tables are available
  useEffect(() => {
    if (connectionId && tables.length > 0) {
      registerSchemaCompletion(connectionId, connectionType, tables, activeTable);
    }

    return () => {
      if (connectionId) {
        unregisterSchemaCompletion(connectionId);
      }
    };
  }, [connectionId, connectionType, tables, activeTable]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = editorRef.current?.getValue();
    if (!query) {
      showErrorNotification('Query is empty');
      return;
    }
    onExecute(query);
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit}>
          <div
            ref={hostRef}
            tabIndex={0}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              'h-[25vh] border-input aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 rounded-md border bg-transparent px-1 pr-4 py-4 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50',
              {
                'border-ring ring-ring/50 ring-[3px]': isFocused
              }
            )}
          />
          <div className="flex justify-end pt-3">
            <Button type="submit" disabled={!editorRef.current?.getValue()?.trim() || isLoading}>
              {isLoading ? 'Executing...' : 'Run Query'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default QueryEditor;
