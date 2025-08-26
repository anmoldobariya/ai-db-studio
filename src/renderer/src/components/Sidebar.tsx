import { TableInfo } from '@renderer/types/index';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { Table, Folder, FolderOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@renderer/lib/utils';

interface SidebarProps {
  tables: TableInfo[];
  activeTable: TableInfo | null;
  onTableSelect: (table: TableInfo) => void;
}

const Sidebar = ({ tables, activeTable, onTableSelect }: SidebarProps) => {
  const [expandedSchemas, setExpandedSchemas] = useState<string[]>([]);

  // Group tables by schema for PostgreSQL
  const tablesBySchema: Record<string, TableInfo[]> = {};
  tables.forEach((table) => {
    const schema = table.schema || 'public';
    if (!tablesBySchema[schema]) {
      tablesBySchema[schema] = [];
    }
    tablesBySchema[schema].push(table);
  });

  // Auto-expand schemas on first load, prioritizing 'public'
  useEffect(() => {
    const schemas = Object.keys(tablesBySchema);
    if (schemas.length > 0 && expandedSchemas.length === 0) {
      // Auto-expand 'public' schema if it exists, otherwise expand the first schema
      const defaultExpanded = schemas.includes('public') ? ['public'] : [schemas[0]];
      setExpandedSchemas(defaultExpanded);
    }
  }, [tables]);

  const toggleSchema = (schema: string) => {
    setExpandedSchemas((prev) =>
      prev.includes(schema) ? prev.filter((s) => s !== schema) : [...prev, schema]
    );
  };

  if (tables.length === 0) {
    return <div className="text-muted-foreground p-4 text-sm">No tables found</div>;
  }

  // If there's only one schema (or none specified), show flat list
  if (Object.keys(tablesBySchema).length === 1) {
    return (
      <ScrollArea className="h-full" allowVerticalScroll>
        <div className="space-y-1 p-2">
          {tables.map((table) => (
            <button
              key={`${table.schema || ''}-${table.name}`}
              onClick={() => onTableSelect(table)}
              className={cn(
                'cursor-pointer hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                activeTable?.name === table.name && activeTable?.schema === table.schema
                  ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                  : ''
              )}
            >
              <Table className="h-4 w-4" />
              <span className="truncate">{table.name}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    );
  }

  // Show tables grouped by schema
  return (
    <ScrollArea className="h-full" allowVerticalScroll>
      <div className="space-y-1 p-2">
        {Object.entries(tablesBySchema)
          .sort(([a], [b]) => {
            // Sort schemas with 'public' first
            if (a === 'public') return -1;
            if (b === 'public') return 1;
            return a.localeCompare(b);
          })
          .map(([schema, schemaTables]) => (
          <div key={schema} className="space-y-1">
            <button
              onClick={() => toggleSchema(schema)}
              className={cn(
                'hover:bg-accent hover:text-accent-foreground flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors'
              )}
            >
              <div className="flex items-center gap-2">
                {expandedSchemas.includes(schema) ? (
                  <FolderOpen className="h-4 w-4" />
                ) : (
                  <Folder className="h-4 w-4" />
                )}
                <span className="font-medium">{schema}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {schemaTables.length}
              </span>
            </button>

            {expandedSchemas.includes(schema) && (
              <div className="ml-2 space-y-1 border-l border-border pl-3">
                {schemaTables
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((table) => (
                  <button
                    key={`${table.schema || ''}-${table.name}`}
                    onClick={() => onTableSelect(table)}
                    className={cn(
                      'hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                      activeTable?.name === table.name && activeTable?.schema === table.schema
                        ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                        : ''
                    )}
                    title={`${schema}.${table.name}`}
                  >
                    <Table className="h-3 w-3" />
                    <span className="truncate">{table.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default Sidebar;
