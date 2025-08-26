import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Database, Key, Link } from 'lucide-react';
import { RelationSchema } from '@renderer/types';

interface ERDTableNodeProps {
  data: {
    table: RelationSchema;
  };
}

export const ERDTableNode = memo(({ data }: ERDTableNodeProps) => {
  const { table } = data;

  const getTypeColor = (type: string) => {
    if (type.includes('integer') || type.includes('double')) return 'text-blue-600 bg-blue-50';
    if (type.includes('text') || type.includes('character')) return 'text-green-600 bg-green-50';
    if (type.includes('boolean')) return 'text-purple-600 bg-purple-50';
    if (type.includes('timestamp')) return 'text-orange-600 bg-orange-50';
    return 'text-gray-600 bg-gray-50';
  };

  const isPrimaryKey = (columnName: string) => {
    return columnName === 'id';
  };

  const isForeignKey = (columnName: string) => {
    return table.relationships.some((rel) => rel.column === columnName);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 min-w-[280px] max-w-[320px]">
      {/* Handles for connections */}
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-primary border-none" />
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-primary border-none" />
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-primary border-none" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-primary border-none" />

      {/* Table header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-3 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-white" />
          <h3 className="font-bold text-white text-lg truncate">{table.name}</h3>
        </div>
      </div>

      {/* Columns */}
      <div className="p-0">
        {table.columns.map((column, index) => (
          <div
            key={index}
            className={`flex items-center justify-between px-4 py-2 border-b border-gray-100 last:border-b-0 ${
              isPrimaryKey(column.name)
                ? 'bg-yellow-50'
                : isForeignKey(column.name)
                  ? 'bg-blue-50'
                  : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {isPrimaryKey(column.name) && (
                <Key className="w-3 h-3 text-yellow-600 flex-shrink-0" />
              )}
              {isForeignKey(column.name) && !isPrimaryKey(column.name) && (
                <Link className="w-3 h-3 text-blue-600 flex-shrink-0" />
              )}
              <span
                className={`font-medium text-sm truncate ${
                  isPrimaryKey(column.name)
                    ? 'text-yellow-800'
                    : isForeignKey(column.name)
                      ? 'text-blue-800'
                      : 'text-gray-900'
                }`}
              >
                {column.name}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className={`text-xs px-2 py-1 rounded ${getTypeColor(column.type)}`}>
                {column.type.split(' ')[0]}
              </span>
              {column.is_nullable === 'YES' && (
                <span className="text-xs text-gray-400 mt-1">nullable</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer with relationship count */}
      {table.relationships.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 rounded-b-lg border-t border-gray-100">
          <p className="text-xs text-gray-600">
            {table.relationships.length} relationship{table.relationships.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
});

ERDTableNode.displayName = 'ERDTableNode';
