import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table';
import { Input } from '@renderer/components/ui/input';
import { Button } from '@renderer/components/ui/button';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { ChevronDown, ChevronRight, Search, Download } from 'lucide-react';

interface DataTableProps {
  data: Record<string, any>[];
  queryTime: string | null;
  queryError: string | null;
  onExport?: () => void;
}

const DataTable = ({ data, queryTime, queryError, onExport }: DataTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRows, setFilteredRows] = useState<Record<string, any>[]>(data);
  const [expandedCells, setExpandedCells] = useState<Record<string, boolean>>({});

  // Generate headers dynamically from the keys of the first object in the data array
  const headers = data.length > 0 ? Object.keys(data[0]) : [];

  useEffect(() => {
    if (!searchTerm) {
      setFilteredRows(data);
      return;
    }

    const lowercaseSearch = searchTerm.toLowerCase();
    const filtered = data.filter((row) =>
      headers.some((header) => {
        const cellValue = row[header];
        // Convert the value to a string for searching, handling nested objects
        const stringValue = getStringRepresentation(cellValue);
        return stringValue.toLowerCase().includes(lowercaseSearch);
      })
    );
    setFilteredRows(filtered);
  }, [searchTerm, data]);

  useEffect(() => {
    setFilteredRows(data);
  }, [data]);

  // Function to convert any value to a searchable string representation
  const getStringRepresentation = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  // Function to toggle cell expansion
  const toggleCellExpansion = (cellId: string) => {
    setExpandedCells((prev) => ({
      ...prev,
      [cellId]: !prev[cellId]
    }));
  };

  // Function to render cell content based on its type
  const renderCellContent = (value: any, cellId: string) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">NULL</span>;
    }

    // Check if the value is a Date instance directly
    if (value instanceof Date) {
      return <span className="">{value.toISOString()}</span>;
    }

    // Handle MongoDB ObjectId specifically
    if (
      (typeof value === 'object' && !Array.isArray(value) && value?._bsontype === 'ObjectID') || // MongoDB driver format
      (typeof value === 'object' &&
        value &&
        value.buffer &&
        typeof value.toString === 'function') || // BSON ObjectId
      (typeof value === 'object' && value && value.$oid)
    ) {
      // MongoDB extended JSON format

      // Different ways ObjectIds might be represented
      let idString = '';
      if (value.$oid) {
        idString = value.$oid;
      } else if (value._id || value.id) {
        // Extract _id or id if present
        idString = (value._id || value.id).toString();
      } else if (
        typeof value.toString === 'function' &&
        value.toString !== Object.prototype.toString
      ) {
        // Only use toString if it's not the default Object.prototype.toString
        idString = value.toString();
      } else if (value.buffer) {
        // Convert buffer to hex string if it's a raw buffer
        try {
          const bufferArray = new Uint8Array(value.buffer);
          idString = Array.from(bufferArray)
            .map((byte: number) => byte.toString(16).padStart(2, '0'))
            .join('');
        } catch (e) {
          idString = 'Error processing buffer';
        }
      } else {
        // Fallback for unknown format
        idString = JSON.stringify(value);
      }

      return <span className="font-mono">ObjectId("{idString}")</span>;
    }

    // Check for MongoDB ISODate format
    if (typeof value === 'object' && value.$date) {
      const dateValue = new Date(
        typeof value.$date === 'number' ? value.$date : value.$date.$numberLong || value.$date
      );
      return <span className="">{dateValue.toISOString()}</span>;
    }

    if (Array.isArray(value)) {
      const isExpanded = expandedCells[cellId];

      return (
        <div>
          <button
            onClick={() => toggleCellExpansion(cellId)}
            className="flex items-center text-xs font-mono bg-secondary/50 rounded px-2 py-1 hover:bg-secondary"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 mr-1" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-1" />
            )}
            Array[{value.length}]
          </button>

          {isExpanded && (
            <div className="mt-2 border-l-2 pl-3 text-xs font-mono">
              {value.map((item, idx) => (
                <div key={idx} className="py-1">
                  <span className="text-muted-foreground">{idx}: </span>
                  {typeof item === 'object' && item !== null
                    ? renderCellContent(item, `${cellId}-${idx}`)
                    : String(item)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (typeof value === 'object') {
      const isExpanded = expandedCells[cellId];

      return (
        <div>
          <button
            onClick={() => toggleCellExpansion(cellId)}
            className="flex items-center text-xs font-mono bg-secondary/50 rounded px-2 py-1 hover:bg-secondary"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 mr-1" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-1" />
            )}
            Object{'{...}'}
          </button>

          {isExpanded && (
            <div className="mt-2 border-l-2 pl-3 text-xs font-mono">
              {Object.entries(value).map(([key, val]) => (
                <div key={key} className="py-1">
                  <span className="text-muted-foreground">{key}: </span>
                  {typeof val === 'object' && val !== null
                    ? renderCellContent(val, `${cellId}-${key}`)
                    : String(val)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return String(value);
  };
  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
          <Input
            placeholder="Search results..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        {data.length > 0 && onExport && (
          <Button
            size="sm"
            variant="outline"
            onClick={onExport}
            className="shrink-0"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </div>
      <div className="flex-1 min-h-0 rounded-md border">
        <ScrollArea className="h-full" allowHorizontalScroll allowVerticalScroll>
          {queryError ? (
            <div className="px-4">
              <div className="bg-destructive/10 border-destructive text-destructive mt-4 rounded-md border p-4">
                {queryError}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 border-b">
                <TableRow>
                  {headers.map((header) => (
                    <TableHead key={header}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length > 0 ? (
                  filteredRows.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {headers.map((header) => (
                        <TableCell key={`${rowIndex}-${header}`}>
                          {renderCellContent(row[header], `r${rowIndex}-${header}`)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={headers.length} className="h-24 text-center">
                      No results found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </div>
      <div className="flex-end flex gap-2 text-muted-foreground text-sm">
        {filteredRows.length} row{filteredRows.length !== 1 ? 's' : ''}{' '}
        {searchTerm && `(filtered from ${data.length})`}
        {queryTime && <div>(Query executed in {queryTime} ms)</div>}
      </div>
    </div>
  );
};

export default DataTable;
