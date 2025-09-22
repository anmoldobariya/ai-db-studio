// Schema-based completion provider for Monaco Editor
import { ConnectionType, TableInfo } from '@renderer/types';
import * as monaco from 'monaco-editor';

export interface SchemaContext {
  connectionType: ConnectionType;
  tables: TableInfo[];
  currentDatabase?: string;
  activeTable?: TableInfo | null; // Current active table from sidebar selection
}

interface CompletionContext {
  text: string;
  position: monaco.Position;
  lineText: string;
  wordAtPosition: string | null;
}

interface ParsedSqlContext {
  isAfterFrom: boolean;
  isAfterJoin: boolean;
  isAfterSelect: boolean;
  isAfterWhere: boolean;
  isAfterOrderBy: boolean;
  isAfterGroupBy: boolean;
  isAfterUpdate: boolean;
  isAfterInsertInto: boolean;
  isAfterSet: boolean;
  tableQualifier: string | null; // For "table." scenarios
  inColumnContext: boolean;
  inTableContext: boolean;
  currentTable: string | null;
  inSelectColumns: boolean; // Are we in the SELECT column list?
  tablesInQuery: string[]; // Tables mentioned in FROM/JOIN clauses
}

export class SchemaCompletionProvider {
  private schemaContext: SchemaContext;
  private disposables: monaco.IDisposable[] = [];

  constructor(schemaContext: SchemaContext) {
    this.schemaContext = schemaContext;
  }

  public updateSchema(schemaContext: SchemaContext) {
    this.schemaContext = schemaContext;
  }

  public registerProvider(languageId: string): monaco.IDisposable {
    const provider = monaco.languages.registerCompletionItemProvider(languageId, {
      provideCompletionItems: (model, position, context, token) => {
        return this.provideCompletionItems(model, position, context, token);
      },
      triggerCharacters: ['.', ' ', '\t', '\n']
    });

    this.disposables.push(provider);
    return provider;
  }

  private async provideCompletionItems(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    _context: monaco.languages.CompletionContext,
    _token: monaco.CancellationToken
  ): Promise<monaco.languages.CompletionList> {
    const completionContext = this.getCompletionContext(model, position);
    const sqlContext = this.parseSqlContext(completionContext);

    // Debug logging
    // console.log('🔍 Autocomplete Debug:', {
    //   position: { line: position.lineNumber, column: position.column },
    //   text: completionContext.text,
    //   lineText: completionContext.lineText,
    //   wordAtPosition: completionContext.wordAtPosition,
    //   sqlContext: sqlContext,
    //   tablesCount: this.schemaContext.tables.length,
    //   connectionType: this.schemaContext.connectionType
    // });

    const suggestions = this.generateSuggestions(model, position, completionContext, sqlContext);

    // console.log('📝 Generated suggestions:', suggestions.length, suggestions);

    return {
      suggestions,
      incomplete: false
    };
  }

  private getCompletionContext(
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): CompletionContext {
    const text = model.getValue();
    const lineText = model.getLineContent(position.lineNumber);
    const wordAtPosition = model.getWordAtPosition(position);

    return {
      text,
      position,
      lineText,
      wordAtPosition: wordAtPosition?.word || null
    };
  }

  private parseSqlContext(context: CompletionContext): ParsedSqlContext {
    const { text, position } = context;
    const beforeCursor = text.substring(0, this.getOffsetFromPosition(text, position));

    // Check for MongoDB context
    if (this.schemaContext.connectionType === ConnectionType.MONGODB) {
      return this.parseMongoContext(context);
    }

    // Check for table qualifier (table. or schema.table.)
    // Matches patterns like "c." or "public.categories" or "categories."
    const tableQualifierMatch = beforeCursor.match(/(?:^|\s)(\w+(?:\.\w+)?)\.\s*$/);
    let tableQualifier: string | null = null;
    let currentTable: string | null = null;

    if (tableQualifierMatch) {
      const fullQualifier = tableQualifierMatch[1];
      // If it contains a dot, it's schema.table, otherwise just table/alias
      if (fullQualifier.includes('.')) {
        const parts = fullQualifier.split('.');
        currentTable = parts[1]; // table name
      } else {
        currentTable = fullQualifier; // table alias or direct table name
      }
      tableQualifier = fullQualifier;
    }

    // Extract tables mentioned in FROM/JOIN clauses
    const tablesInQuery = this.extractTablesFromQuery(text);

    // Improved keyword detection using regex patterns
    const isAfterFrom = /\bfrom\s+(?:\w+\s+)*$/i.test(beforeCursor);
    const isAfterJoin =
      /\b(?:inner\s+|left\s+|right\s+|full\s+|cross\s+)?join\s+(?:\w+\s+)*$/i.test(beforeCursor);
    const isAfterUpdate = /\bupdate\s+(?:\w+\s+)*$/i.test(beforeCursor);
    const isAfterInsertInto = /\binsert\s+into\s+(?:\w+\s+)*$/i.test(beforeCursor);
    const isAfterSelect = /\bselect\s+(?:\w+\s*,?\s*)*$/i.test(beforeCursor);
    const isAfterWhere = /\bwhere\s+(?:\w+\s+)*$/i.test(beforeCursor);
    const isAfterOrderBy = /\border\s+by\s+(?:\w+\s+)*$/i.test(beforeCursor);
    const isAfterGroupBy = /\bgroup\s+by\s+(?:\w+\s+)*$/i.test(beforeCursor);
    const isAfterSet = /\bset\s+(?:\w+\s*=?\s*)*$/i.test(beforeCursor);

    // Check if we're in a SELECT column list (between SELECT and FROM)
    const inSelectColumns = this.isInSelectColumnContext(text, position);

    const result: ParsedSqlContext = {
      isAfterFrom,
      isAfterJoin,
      isAfterSelect,
      isAfterWhere,
      isAfterOrderBy,
      isAfterGroupBy,
      isAfterUpdate,
      isAfterInsertInto,
      isAfterSet,
      tableQualifier,
      inColumnContext: !!tableQualifier,
      inTableContext: isAfterFrom || isAfterJoin || isAfterUpdate || isAfterInsertInto,
      currentTable,
      inSelectColumns,
      tablesInQuery
    };

    return result;
  }

  private resolveTableFromAlias(queryText: string, alias: string): TableInfo | undefined {
    // Look for patterns like "FROM table_name alias" or "FROM schema.table_name alias"
    const aliasPattern = new RegExp(
      `\\b(?:FROM|JOIN)\\s+(\\w+(?:\\.\\w+)?)\\s+(?:AS\\s+)?${alias}\\b`,
      'i'
    );
    const match = queryText.match(aliasPattern);

    if (match) {
      const fullTableName = match[1];
      // Handle schema.table or just table
      const tableName = fullTableName.includes('.') ? fullTableName.split('.')[1] : fullTableName;

      return this.schemaContext.tables.find(
        (t) => t.name.toLowerCase() === tableName.toLowerCase()
      );
    }

    return undefined;
  }

  private parseMongoContext(context: CompletionContext): ParsedSqlContext {
    const { text, position } = context;
    const beforeCursor = text.substring(0, this.getOffsetFromPosition(text, position));

    // Check for db.collection. pattern
    const collectionMatch = beforeCursor.match(/db\.(\w+)\.\s*$/);
    const tableQualifier = collectionMatch ? collectionMatch[1] : null;

    return {
      isAfterFrom: false,
      isAfterJoin: false,
      isAfterSelect: false,
      isAfterWhere: false,
      isAfterOrderBy: false,
      isAfterGroupBy: false,
      isAfterUpdate: false,
      isAfterInsertInto: false,
      isAfterSet: false,
      tableQualifier,
      inColumnContext: !!tableQualifier,
      inTableContext: beforeCursor.match(/db\.\s*$/) !== null,
      currentTable: tableQualifier,
      inSelectColumns: false,
      tablesInQuery: []
    };
  }

  /**
   * Extract table names mentioned in FROM and JOIN clauses
   */
  private extractTablesFromQuery(queryText: string): string[] {
    const tables: string[] = [];

    // Match FROM clauses: FROM table_name [AS] alias, FROM schema.table_name [AS] alias
    const fromMatches = queryText.match(/\bFROM\s+(\w+(?:\.\w+)?)\s*(?:AS\s+\w+)?/gi);
    if (fromMatches) {
      fromMatches.forEach((match) => {
        const tableMatch = match.match(/\bFROM\s+(\w+(?:\.\w+)?)/i);
        if (tableMatch) {
          const fullTableName = tableMatch[1];
          const tableName = fullTableName.includes('.')
            ? fullTableName.split('.')[1]
            : fullTableName;
          if (!tables.includes(tableName)) {
            tables.push(tableName);
          }
        }
      });
    }

    // Match JOIN clauses: JOIN table_name [AS] alias, JOIN schema.table_name [AS] alias
    const joinMatches = queryText.match(
      /\b(?:INNER\s+|LEFT\s+|RIGHT\s+|FULL\s+|CROSS\s+)?JOIN\s+(\w+(?:\.\w+)?)\s*(?:AS\s+\w+)?/gi
    );
    if (joinMatches) {
      joinMatches.forEach((match) => {
        const tableMatch = match.match(/JOIN\s+(\w+(?:\.\w+)?)/i);
        if (tableMatch) {
          const fullTableName = tableMatch[1];
          const tableName = fullTableName.includes('.')
            ? fullTableName.split('.')[1]
            : fullTableName;
          if (!tables.includes(tableName)) {
            tables.push(tableName);
          }
        }
      });
    }

    return tables;
  }

  /**
   * Check if cursor is positioned in SELECT column list (between SELECT and FROM)
   */
  private isInSelectColumnContext(queryText: string, position: monaco.Position): boolean {
    const offset = this.getOffsetFromPosition(queryText, position);
    const beforeCursor = queryText.substring(0, offset);
    const afterCursor = queryText.substring(offset);

    // Find the last SELECT keyword before cursor
    const selectMatch = beforeCursor.match(/.*\bSELECT\s/i);
    if (!selectMatch) return false;

    // Check if there's a FROM after the cursor or if we haven't reached FROM yet
    const fromAfterCursor = afterCursor.match(/\s*FROM\b/i);

    // We're in SELECT columns if:
    // 1. We found SELECT before cursor AND
    // 2. Either there's FROM after cursor OR we haven't seen FROM yet in the query
    if (selectMatch) {
      // If there's FROM after cursor, we're definitely in SELECT columns
      if (fromAfterCursor) return true;

      // If there's no FROM before cursor after the SELECT, we're in SELECT columns
      const lastSelectPos = beforeCursor.lastIndexOf(selectMatch[0]);
      const selectPortion = beforeCursor.substring(lastSelectPos);

      return !selectPortion.match(/\bFROM\s/i);
    }

    return false;
  }

  private getOffsetFromPosition(text: string, position: monaco.Position): number {
    const lines = text.split('\n');
    let offset = 0;

    for (let i = 0; i < position.lineNumber - 1; i++) {
      offset += lines[i].length + 1; // +1 for newline
    }

    offset += position.column - 1;
    return offset;
  }

  private generateSuggestions(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    completionContext: CompletionContext,
    sqlContext: ParsedSqlContext
  ): monaco.languages.CompletionItem[] {
    const range = this.getReplacementRange(model, position);
    const suggestions: monaco.languages.CompletionItem[] = [];

    // MongoDB suggestions
    if (this.schemaContext.connectionType === ConnectionType.MONGODB) {
      if (sqlContext.inTableContext) {
        suggestions.push(...this.getMongoCollectionSuggestions(range));
      } else if (sqlContext.inColumnContext && sqlContext.currentTable) {
        suggestions.push(...this.getMongoMethodSuggestions(range));
      }
      return suggestions;
    }

    // SQL table suggestions
    if (sqlContext.inTableContext) {
      suggestions.push(...this.getTableSuggestions(range));
    }

    // SQL column suggestions for qualified columns (table.column)
    if (sqlContext.inColumnContext && sqlContext.currentTable) {
      // Try to find table by name or by resolving alias
      let table = this.schemaContext.tables.find(
        (t) => t.name.toLowerCase() === sqlContext.currentTable!.toLowerCase()
      );

      // If not found by direct name, try to resolve alias from query
      if (!table) {
        table = this.resolveTableFromAlias(completionContext.text, sqlContext.currentTable);
      }

      if (table) {
        suggestions.push(...this.getColumnSuggestions(table, range));
      }
    }

    // Smart SELECT column suggestions
    if (sqlContext.inSelectColumns && !sqlContext.inColumnContext) {
      const selectColumnSuggestions = this.getSmartSelectColumnSuggestions(sqlContext, range);
      suggestions.push(...selectColumnSuggestions);
    }

    // SQL keyword and function suggestions
    if (!sqlContext.inColumnContext && !sqlContext.tableQualifier && !sqlContext.inSelectColumns) {
      suggestions.push(...this.getSqlKeywordSuggestions(range));
      suggestions.push(...this.getSqlFunctionSuggestions(range));
    }

    return suggestions;
  }

  private getReplacementRange(
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): monaco.Range {
    const wordAtPosition = model.getWordAtPosition(position);

    if (wordAtPosition) {
      return new monaco.Range(
        position.lineNumber,
        wordAtPosition.startColumn,
        position.lineNumber,
        wordAtPosition.endColumn
      );
    }

    return new monaco.Range(
      position.lineNumber,
      position.column,
      position.lineNumber,
      position.column
    );
  }

  private getTableSuggestions(range: monaco.Range): monaco.languages.CompletionItem[] {
    return this.schemaContext.tables.map((table) => ({
      label: table.name,
      kind: monaco.languages.CompletionItemKind.Class,
      detail: `${table.type}${table.schema ? ` (${table.schema})` : ''}`,
      documentation: `Table: ${table.name}${table.columns ? `\nColumns: ${table.columns.length}` : ''}`,
      insertText: table.name,
      sortText: `1_${table.name}`, // Prioritize tables
      range
    }));
  }

  private getColumnSuggestions(
    table: TableInfo,
    range: monaco.Range
  ): monaco.languages.CompletionItem[] {
    if (!table.columns) {
      return [];
    }

    return table.columns.map((column) => ({
      label: column.name,
      kind: monaco.languages.CompletionItemKind.Field,
      detail: `${column.type}${column.is_nullable === 'NO' ? ' NOT NULL' : ''}`,
      documentation: `Column: ${column.name}\nType: ${column.type}${column.is_nullable === 'YES' ? ' (nullable)' : ''}`,
      insertText: column.name,
      sortText: `2_${column.name}`,
      range
    }));
  }

  /**
   * Provide smart column suggestions for SELECT statements based on query context
   */
  private getSmartSelectColumnSuggestions(
    sqlContext: ParsedSqlContext,
    range: monaco.Range
  ): monaco.languages.CompletionItem[] {
    const suggestions: monaco.languages.CompletionItem[] = [];

    // If tables are mentioned in FROM/JOIN clauses, use only those tables
    if (sqlContext.tablesInQuery.length > 0) {
      // console.log('🎯 Using tables from query:', sqlContext.tablesInQuery);

      // Get columns from all tables mentioned in the query
      const relevantTables = this.schemaContext.tables.filter((table) =>
        sqlContext.tablesInQuery.some(
          (queryTable) => queryTable.toLowerCase() === table.name.toLowerCase()
        )
      );

      relevantTables.forEach((table) => {
        if (table.columns) {
          table.columns.forEach((column) => {
            suggestions.push({
              label: column.name,
              kind: monaco.languages.CompletionItemKind.Field,
              detail: `${table.name}.${column.name} - ${column.type}`,
              documentation: `Column from ${table.name}\nType: ${column.type}${column.is_nullable === 'YES' ? ' (nullable)' : ''}`,
              insertText: column.name,
              sortText: `1_${table.name}_${column.name}`,
              range
            });
          });
        }
      });

      // Also suggest qualified column names for clarity when multiple tables
      if (relevantTables.length > 1) {
        relevantTables.forEach((table) => {
          if (table.columns) {
            table.columns.forEach((column) => {
              suggestions.push({
                label: `${table.name}.${column.name}`,
                kind: monaco.languages.CompletionItemKind.Field,
                detail: `${column.type} - Qualified column`,
                documentation: `Qualified column from ${table.name}\nType: ${column.type}${column.is_nullable === 'YES' ? ' (nullable)' : ''}`,
                insertText: `${table.name}.${column.name}`,
                sortText: `2_${table.name}_${column.name}`,
                range
              });
            });
          }
        });
      }
    }
    // If no tables in FROM/JOIN, use the active table from sidebar
    else if (this.schemaContext.activeTable) {
      // console.log('🎯 Using active table from sidebar:', this.schemaContext.activeTable.name);

      const activeTable = this.schemaContext.activeTable;
      if (activeTable.columns) {
        activeTable.columns.forEach((column) => {
          suggestions.push({
            label: column.name,
            kind: monaco.languages.CompletionItemKind.Field,
            detail: `${activeTable.name}.${column.name} - ${column.type}`,
            documentation: `Column from active table ${activeTable.name}\nType: ${column.type}${column.is_nullable === 'YES' ? ' (nullable)' : ''}`,
            insertText: column.name,
            sortText: `1_${column.name}`,
            range
          });
        });
      }
    }
    // Fallback: suggest common columns and SQL expressions
    else {
      // console.log('🎯 No specific tables found, providing generic suggestions');

      // Add common column suggestions
      const commonColumns = ['id', 'name', 'created_at', 'updated_at', 'status'];
      commonColumns.forEach((col) => {
        suggestions.push({
          label: col,
          kind: monaco.languages.CompletionItemKind.Field,
          detail: 'Common column',
          documentation: `Common column name: ${col}`,
          insertText: col,
          sortText: `3_${col}`,
          range
        });
      });

      // Add SQL expressions
      const sqlExpressions = [
        { name: '*', detail: 'All columns', doc: 'Select all columns from the table' },
        { name: 'COUNT(*)', detail: 'Count rows', doc: 'Count the number of rows' },
        { name: 'COUNT(DISTINCT ', detail: 'Count distinct', doc: 'Count distinct values' },
        { name: 'SUM(', detail: 'Sum values', doc: 'Sum numeric values' },
        { name: 'AVG(', detail: 'Average values', doc: 'Calculate average of numeric values' },
        { name: 'MAX(', detail: 'Maximum value', doc: 'Get maximum value' },
        { name: 'MIN(', detail: 'Minimum value', doc: 'Get minimum value' }
      ];

      sqlExpressions.forEach((expr) => {
        suggestions.push({
          label: expr.name,
          kind: monaco.languages.CompletionItemKind.Function,
          detail: expr.detail,
          documentation: expr.doc,
          insertText: expr.name,
          sortText: `4_${expr.name}`,
          range
        });
      });
    }

    return suggestions;
  }

  private getMongoCollectionSuggestions(range: monaco.Range): monaco.languages.CompletionItem[] {
    return this.schemaContext.tables.map((collection) => ({
      label: collection.name,
      kind: monaco.languages.CompletionItemKind.Class,
      detail: 'Collection',
      documentation: `MongoDB Collection: ${collection.name}`,
      insertText: collection.name,
      sortText: `1_${collection.name}`,
      range
    }));
  }

  private getMongoMethodSuggestions(range: monaco.Range): monaco.languages.CompletionItem[] {
    const methods = [
      { name: 'find', detail: 'Find documents', doc: 'Find documents matching the query' },
      {
        name: 'findOne',
        detail: 'Find one document',
        doc: 'Find the first document matching the query'
      },
      { name: 'insertOne', detail: 'Insert one document', doc: 'Insert a single document' },
      { name: 'insertMany', detail: 'Insert multiple documents', doc: 'Insert multiple documents' },
      {
        name: 'updateOne',
        detail: 'Update one document',
        doc: 'Update the first document matching the query'
      },
      {
        name: 'updateMany',
        detail: 'Update multiple documents',
        doc: 'Update all documents matching the query'
      },
      {
        name: 'deleteOne',
        detail: 'Delete one document',
        doc: 'Delete the first document matching the query'
      },
      {
        name: 'deleteMany',
        detail: 'Delete multiple documents',
        doc: 'Delete all documents matching the query'
      },
      { name: 'aggregate', detail: 'Aggregation pipeline', doc: 'Run aggregation pipeline' },
      {
        name: 'countDocuments',
        detail: 'Count documents',
        doc: 'Count documents matching the query'
      },
      { name: 'distinct', detail: 'Get distinct values', doc: 'Get distinct values for a field' }
    ];

    return methods.map((method) => ({
      label: method.name,
      kind: monaco.languages.CompletionItemKind.Method,
      detail: method.detail,
      documentation: method.doc,
      insertText: `${method.name}()`,
      sortText: `1_${method.name}`,
      range
    }));
  }

  private getSqlKeywordSuggestions(range: monaco.Range): monaco.languages.CompletionItem[] {
    const keywords = this.getSqlKeywords();

    return keywords.map((keyword) => ({
      label: keyword,
      kind: monaco.languages.CompletionItemKind.Keyword,
      detail: 'SQL Keyword',
      insertText: keyword,
      sortText: `3_${keyword}`,
      range
    }));
  }

  private getSqlFunctionSuggestions(range: monaco.Range): monaco.languages.CompletionItem[] {
    const functions = this.getSqlFunctions();

    return functions.map((func) => ({
      label: func.name,
      kind: monaco.languages.CompletionItemKind.Function,
      detail: func.detail,
      documentation: func.documentation,
      insertText: `${func.name}()`,
      sortText: `4_${func.name}`,
      range
    }));
  }

  private getSqlKeywords(): string[] {
    const commonKeywords = [
      'SELECT',
      'FROM',
      'WHERE',
      'INSERT',
      'UPDATE',
      'DELETE',
      'CREATE',
      'DROP',
      'ALTER',
      'TABLE',
      'INDEX',
      'VIEW',
      'TRIGGER',
      'PROCEDURE',
      'FUNCTION',
      'DATABASE',
      'SCHEMA',
      'JOIN',
      'INNER',
      'LEFT',
      'RIGHT',
      'FULL',
      'OUTER',
      'CROSS',
      'ON',
      'USING',
      'ORDER',
      'BY',
      'GROUP',
      'HAVING',
      'DISTINCT',
      'UNION',
      'ALL',
      'EXCEPT',
      'INTERSECT',
      'LIMIT',
      'OFFSET',
      'CASE',
      'WHEN',
      'THEN',
      'ELSE',
      'END',
      'IF',
      'EXISTS',
      'IN',
      'NOT',
      'AND',
      'OR',
      'BETWEEN',
      'LIKE',
      'ILIKE',
      'IS',
      'NULL',
      'PRIMARY',
      'KEY',
      'FOREIGN',
      'REFERENCES',
      'UNIQUE',
      'CHECK',
      'DEFAULT',
      'AUTO_INCREMENT',
      'IDENTITY',
      'SERIAL',
      'GENERATED',
      'AS',
      'STORED',
      'VIRTUAL'
    ];

    // Add dialect-specific keywords
    switch (this.schemaContext.connectionType) {
      case ConnectionType.POSTGRESQL:
        return [
          ...commonKeywords,
          'RETURNING',
          'ILIKE',
          'SIMILAR',
          'REGEXP',
          'ARRAY',
          'JSONB',
          'UUID'
        ];
      case ConnectionType.MYSQL:
        return [...commonKeywords, 'REPLACE', 'IGNORE', 'DUPLICATE', 'CHARSET', 'COLLATE'];
      case ConnectionType.SQLITE3:
        return [...commonKeywords, 'ATTACH', 'DETACH', 'PRAGMA', 'WITHOUT', 'ROWID'];
      default:
        return commonKeywords;
    }
  }

  private getSqlFunctions(): Array<{ name: string; detail: string; documentation: string }> {
    const commonFunctions = [
      { name: 'COUNT', detail: 'Count rows', documentation: 'Returns the number of rows' },
      { name: 'SUM', detail: 'Sum values', documentation: 'Returns the sum of numeric values' },
      {
        name: 'AVG',
        detail: 'Average values',
        documentation: 'Returns the average of numeric values'
      },
      { name: 'MIN', detail: 'Minimum value', documentation: 'Returns the minimum value' },
      { name: 'MAX', detail: 'Maximum value', documentation: 'Returns the maximum value' },
      {
        name: 'UPPER',
        detail: 'Convert to uppercase',
        documentation: 'Converts string to uppercase'
      },
      {
        name: 'LOWER',
        detail: 'Convert to lowercase',
        documentation: 'Converts string to lowercase'
      },
      { name: 'LENGTH', detail: 'String length', documentation: 'Returns the length of a string' },
      {
        name: 'SUBSTRING',
        detail: 'Extract substring',
        documentation: 'Extracts a substring from a string'
      },
      {
        name: 'TRIM',
        detail: 'Trim whitespace',
        documentation: 'Removes leading and trailing whitespace'
      },
      {
        name: 'CONCAT',
        detail: 'Concatenate strings',
        documentation: 'Concatenates two or more strings'
      },
      {
        name: 'COALESCE',
        detail: 'First non-null value',
        documentation: 'Returns the first non-null expression'
      },
      {
        name: 'NULLIF',
        detail: 'Null if equal',
        documentation: 'Returns null if expressions are equal'
      },
      {
        name: 'NOW',
        detail: 'Current timestamp',
        documentation: 'Returns the current date and time'
      },
      { name: 'CURRENT_DATE', detail: 'Current date', documentation: 'Returns the current date' },
      { name: 'CURRENT_TIME', detail: 'Current time', documentation: 'Returns the current time' }
    ];

    // Add dialect-specific functions
    const dialectFunctions: Array<{ name: string; detail: string; documentation: string }> = [];

    switch (this.schemaContext.connectionType) {
      case ConnectionType.POSTGRESQL:
        dialectFunctions.push(
          {
            name: 'ARRAY_AGG',
            detail: 'Aggregate to array',
            documentation: 'Aggregates values into an array'
          },
          {
            name: 'JSON_BUILD_OBJECT',
            detail: 'Build JSON object',
            documentation: 'Builds a JSON object from key-value pairs'
          },
          {
            name: 'GENERATE_SERIES',
            detail: 'Generate series',
            documentation: 'Generates a series of values'
          },
          {
            name: 'REGEXP_REPLACE',
            detail: 'Replace with regex',
            documentation: 'Replaces text using regular expressions'
          }
        );
        break;
      case ConnectionType.MYSQL:
        dialectFunctions.push(
          {
            name: 'GROUP_CONCAT',
            detail: 'Concatenate group values',
            documentation: 'Concatenates values from multiple rows'
          },
          {
            name: 'JSON_EXTRACT',
            detail: 'Extract from JSON',
            documentation: 'Extracts data from JSON document'
          },
          {
            name: 'IFNULL',
            detail: 'If null replacement',
            documentation: 'Returns alternative if value is null'
          },
          {
            name: 'REPLACE',
            detail: 'Replace substring',
            documentation: 'Replaces occurrences of substring'
          }
        );
        break;
      case ConnectionType.SQLITE3:
        dialectFunctions.push(
          { name: 'ROWID', detail: 'Row ID', documentation: 'Returns the unique row identifier' },
          { name: 'RANDOM', detail: 'Random number', documentation: 'Returns a random number' },
          {
            name: 'SQLITE_VERSION',
            detail: 'SQLite version',
            documentation: 'Returns the SQLite version'
          }
        );
        break;
    }

    return [...commonFunctions, ...dialectFunctions];
  }

  public dispose(): void {
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];
  }
}
