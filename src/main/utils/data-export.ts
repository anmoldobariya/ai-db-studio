// src/main/utils/data-export.ts

import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import { writeFile } from 'fs/promises';
import { dialog } from 'electron';
import log from 'electron-log';

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  data: Record<string, any>[];
  headers?: string[];
  filename?: string;
  sheetName?: string;
}

export interface ExportResult {
  success: boolean;
  message?: string;
  error?: string;
  filePath?: string;
}

export class DataExporter {
  static async exportData(options: ExportOptions): Promise<ExportResult> {
    try {
      const { format, data, headers, filename, sheetName } = options;

      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'No data to export'
        };
      }

      // Generate default filename if not provided
      const timestamp = new Date().toISOString().split('T')[0];
      const defaultFilename = filename || `query_results_${timestamp}`;

      // Show save dialog
      const savePath = await dialog.showSaveDialog({
        title: 'Export Query Results',
        defaultPath: defaultFilename,
        filters: this.getFileFilters(format)
      });

      if (savePath.canceled || !savePath.filePath) {
        return {
          success: false,
          message: 'Export canceled by user'
        };
      }

      // Export based on format
      switch (format) {
        case 'csv':
          return await this.exportToCSV(data, headers, savePath.filePath);
        case 'json':
          return await this.exportToJSON(data, savePath.filePath);
        case 'excel':
          return await this.exportToExcel(data, headers, savePath.filePath, sheetName);
        default:
          return {
            success: false,
            error: `Unsupported export format: ${format}`
          };
      }
    } catch (error: any) {
      log.error('Export error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  private static getFileFilters(format: string) {
    switch (format) {
      case 'csv':
        return [{ name: 'CSV Files', extensions: ['csv'] }];
      case 'json':
        return [{ name: 'JSON Files', extensions: ['json'] }];
      case 'excel':
        return [{ name: 'Excel Files', extensions: ['xlsx'] }];
      default:
        return [{ name: 'All Files', extensions: ['*'] }];
    }
  }

  private static async exportToCSV(
    data: Record<string, any>[],
    headers?: string[],
    filePath?: string
  ): Promise<ExportResult> {
    try {
      // Use provided headers or extract from first data row
      const csvHeaders = headers || Object.keys(data[0] || {});
      
      // Ensure data consistency with headers
      const processedData = data.map(row => {
        const processedRow: Record<string, any> = {};
        csvHeaders.forEach(header => {
          let value = row[header];
          
          // Handle different data types
          if (value === null || value === undefined) {
            value = '';
          } else if (typeof value === 'object') {
            value = JSON.stringify(value);
          } else if (typeof value === 'boolean') {
            value = value.toString();
          }
          
          processedRow[header] = value;
        });
        return processedRow;
      });

      const csv = Papa.unparse({
        fields: csvHeaders,
        data: processedData
      }, {
        header: true,
        delimiter: ',',
        newline: '\n',
        quotes: true,
        quoteChar: '"',
        escapeChar: '"'
      });

      if (filePath) {
        await writeFile(filePath, csv, 'utf-8');
      }

      log.info(`Exported ${data.length} rows to CSV: ${filePath}`);
      return {
        success: true,
        message: `Successfully exported ${data.length} rows to CSV`,
        filePath
      };
    } catch (error: any) {
      log.error('CSV export error:', error);
      return {
        success: false,
        error: `CSV export failed: ${error.message}`
      };
    }
  }

  private static async exportToJSON(
    data: Record<string, any>[],
    filePath?: string
  ): Promise<ExportResult> {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        recordCount: data.length,
        data: data
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      if (filePath) {
        await writeFile(filePath, jsonString, 'utf-8');
      }

      log.info(`Exported ${data.length} rows to JSON: ${filePath}`);
      return {
        success: true,
        message: `Successfully exported ${data.length} rows to JSON`,
        filePath
      };
    } catch (error: any) {
      log.error('JSON export error:', error);
      return {
        success: false,
        error: `JSON export failed: ${error.message}`
      };
    }
  }

  private static async exportToExcel(
    data: Record<string, any>[],
    headers?: string[],
    filePath?: string,
    sheetName = 'Query Results'
  ): Promise<ExportResult> {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Use provided headers or extract from first data row
      const excelHeaders = headers || Object.keys(data[0] || {});
      
      // Process data for Excel
      const processedData = data.map(row => {
        const processedRow: Record<string, any> = {};
        excelHeaders.forEach(header => {
          let value = row[header];
          
          // Handle different data types for Excel
          if (value === null || value === undefined) {
            value = '';
          } else if (typeof value === 'object') {
            value = JSON.stringify(value);
          } else if (typeof value === 'boolean') {
            value = value;  // Excel handles booleans natively
          } else if (typeof value === 'number') {
            value = value;  // Excel handles numbers natively
          }
          
          processedRow[header] = value;
        });
        return processedRow;
      });

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(processedData, {
        header: excelHeaders
      });

      // Set column widths
      const columnWidths = excelHeaders.map(header => {
        const maxLength = Math.max(
          header.length,
          ...data.map(row => {
            const value = row[header];
            return value ? value.toString().length : 0;
          })
        );
        return { wch: Math.min(maxLength + 2, 50) }; // Max width of 50 characters
      });

      worksheet['!cols'] = columnWidths;

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Add metadata sheet
      const metadata = [
        { Property: 'Export Date', Value: new Date().toISOString() },
        { Property: 'Record Count', Value: data.length },
        { Property: 'Columns', Value: excelHeaders.length },
        { Property: 'Sheet Name', Value: sheetName }
      ];

      const metadataSheet = XLSX.utils.json_to_sheet(metadata);
      XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Export Info');

      // Write the file
      if (filePath) {
        XLSX.writeFile(workbook, filePath);
      }

      log.info(`Exported ${data.length} rows to Excel: ${filePath}`);
      return {
        success: true,
        message: `Successfully exported ${data.length} rows to Excel`,
        filePath
      };
    } catch (error: any) {
      log.error('Excel export error:', error);
      return {
        success: false,
        error: `Excel export failed: ${error.message}`
      };
    }
  }

  // Helper method to validate data before export
  static validateExportData(data: any[]): { valid: boolean; error?: string } {
    if (!Array.isArray(data)) {
      return { valid: false, error: 'Data must be an array' };
    }

    if (data.length === 0) {
      return { valid: false, error: 'No data to export' };
    }

    // Check if all items are objects
    const invalidItems = data.filter(item => 
      item === null || item === undefined || typeof item !== 'object'
    );

    if (invalidItems.length > 0) {
      return { valid: false, error: 'All data items must be objects' };
    }

    return { valid: true };
  }

  // Helper method to get supported formats
  static getSupportedFormats(): Array<{ value: string; label: string; extension: string }> {
    return [
      { value: 'csv', label: 'CSV (Comma Separated Values)', extension: '.csv' },
      { value: 'json', label: 'JSON (JavaScript Object Notation)', extension: '.json' },
      { value: 'excel', label: 'Excel Spreadsheet', extension: '.xlsx' }
    ];
  }

  // Helper method to estimate file size
  static estimateExportSize(data: Record<string, any>[], format: string): string {
    if (!data || data.length === 0) return '0 KB';

    const sampleSize = Math.min(data.length, 100);
    const sampleData = data.slice(0, sampleSize);
    
    let estimatedBytes = 0;

    switch (format) {
      case 'csv':
        const csvSample = Papa.unparse(sampleData);
        estimatedBytes = (csvSample.length * data.length) / sampleSize;
        break;
      case 'json':
        const jsonSample = JSON.stringify(sampleData);
        estimatedBytes = (jsonSample.length * data.length) / sampleSize;
        break;
      case 'excel':
        // Excel files are more complex, rough estimation
        const jsonSize = JSON.stringify(sampleData).length;
        estimatedBytes = (jsonSize * data.length * 1.5) / sampleSize; // Excel overhead
        break;
      default:
        estimatedBytes = JSON.stringify(sampleData).length;
    }

    // Convert to human readable format
    if (estimatedBytes < 1024) {
      return `${Math.round(estimatedBytes)} bytes`;
    } else if (estimatedBytes < 1024 * 1024) {
      return `${Math.round(estimatedBytes / 1024)} KB`;
    } else {
      return `${Math.round(estimatedBytes / (1024 * 1024))} MB`;
    }
  }
}