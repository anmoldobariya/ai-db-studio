import { useState, useEffect } from 'react';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@renderer/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import {
  Download,
  FileText,
  Database,
  Table,
  AlertCircle,
  CheckCircle,
  Info,
  Settings
} from 'lucide-react';
import { ExportFormat } from '@renderer/types/index';
import { showSuccessNotification, showErrorNotification } from '@renderer/utils/notifications';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: Record<string, any>[];
  queryTime?: string;
  connectionName?: string;
}

const ExportDialog = ({ isOpen, onClose, data, queryTime, connectionName }: ExportDialogProps) => {
  const [exportFormats, setExportFormats] = useState<ExportFormat[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('csv');
  const [filename, setFilename] = useState<string>('');
  const [sheetName, setSheetName] = useState<string>('Query Results');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [estimatedSize, setEstimatedSize] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string>('');

  // Initialize component
  useEffect(() => {
    if (isOpen) {
      fetchExportFormats();
      validateData();
      generateDefaultFilename();
    }
  }, [isOpen, data]);

  // Update estimated size when format changes
  useEffect(() => {
    if (data && data.length > 0 && selectedFormat) {
      estimateSize();
    }
  }, [selectedFormat, data]);

  const fetchExportFormats = async () => {
    try {
      const result = await window.api.getExportFormats();
      if (result.success && result.formats) {
        setExportFormats(result.formats);
      }
    } catch (error) {
      showErrorNotification('Failed to load export formats');
    }
  };

  const validateData = async () => {
    try {
      const result = await window.api.validateExportData(data);
      if (result.success && result.validation) {
        setIsValid(result.validation.valid);
        setValidationError(result.validation.error || '');
      }
    } catch (error) {
      setIsValid(false);
      setValidationError('Failed to validate data');
    }
  };

  const estimateSize = async () => {
    try {
      const result = await window.api.estimateExportSize(data, selectedFormat);
      if (result.success && result.estimatedSize) {
        setEstimatedSize(result.estimatedSize);
      }
    } catch (error) {
      setEstimatedSize('Unknown');
    }
  };

  const generateDefaultFilename = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const connectionPrefix = connectionName ? `${connectionName.replace(/[^a-zA-Z0-9]/g, '_')}_` : '';
    setFilename(`${connectionPrefix}query_results_${timestamp}`);
  };

  const handleExport = async () => {
    if (!isValid) {
      showErrorNotification('Cannot export invalid data');
      return;
    }

    setIsExporting(true);
    try {
      const headers = data.length > 0 ? Object.keys(data[0]) : [];

      const result = await window.api.exportQueryResults(
        selectedFormat,
        data,
        headers,
        filename,
        selectedFormat === 'excel' ? sheetName : undefined
      );

      if (result.success) {
        showSuccessNotification(result.message || 'Export completed successfully', {
          description: result.filePath ? `Saved to: ${result.filePath}` : undefined
        });
        onClose();
      } else {
        showErrorNotification('Export failed', {
          description: result.error
        });
      }
    } catch (error: any) {
      showErrorNotification('Export failed', {
        description: error.message
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv':
        return <FileText className="h-4 w-4" />;
      case 'json':
        return <Database className="h-4 w-4" />;
      case 'excel':
        return <Table className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Query Results
          </DialogTitle>
        </DialogHeader>

        <ScrollArea allowVerticalScroll className="max-h-[60vh]">
          <div className="space-y-6 p-1">
            {/* Data Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Data Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span>Rows: <strong>{data.length}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Table className="h-4 w-4 text-muted-foreground" />
                    <span>Columns: <strong>{data.length > 0 ? Object.keys(data[0]).length : 0}</strong></span>
                  </div>
                  {queryTime && (
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span>Query Time: <strong>{queryTime}ms</strong></span>
                    </div>
                  )}
                  {connectionName && (
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span>Connection: <strong>{connectionName}</strong></span>
                    </div>
                  )}
                </div>

                {/* Validation Status */}
                <div className="flex items-center gap-2 pt-2">
                  {isValid ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Data is valid for export</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600">{validationError}</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Format Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Export Format</Label>
              <RadioGroup value={selectedFormat} onValueChange={setSelectedFormat}>
                <div className="grid gap-3">
                  {exportFormats.map((format) => (
                    <div key={format.value} className="flex items-center space-x-3">
                      <RadioGroupItem value={format.value} id={format.value} />
                      <Label htmlFor={format.value} className="flex-1 cursor-pointer">
                        <Card className="p-3 hover:bg-accent/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getFormatIcon(format.value)}
                              <div>
                                <div className="font-medium">{format.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  File extension: {format.extension}
                                </div>
                              </div>
                            </div>
                            {selectedFormat === format.value && estimatedSize && (
                              <Badge variant="secondary" className="text-xs">
                                ~{estimatedSize}
                              </Badge>
                            )}
                          </div>
                        </Card>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Export Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filename */}
                <div className="space-y-2">
                  <Label htmlFor="filename" className="text-sm">Filename</Label>
                  <Input
                    id="filename"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder="Enter filename (without extension)"
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    File extension will be added automatically based on format
                  </p>
                </div>

                {/* Excel-specific options */}
                {selectedFormat === 'excel' && (
                  <div className="space-y-2">
                    <Label htmlFor="sheetName" className="text-sm">Sheet Name</Label>
                    <Input
                      id="sheetName"
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                      placeholder="Enter sheet name"
                      className="text-sm"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Data Preview */}
            {data.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Data Preview (First 3 rows)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea allowHorizontalScroll className='max-w-[700px] overflow-x-auto'>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          {Object.keys(data[0]).map((header) => (
                            <th key={header} className="text-left p-2 font-medium">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.slice(0, 3).map((row, index) => (
                          <tr key={index} className="border-b">
                            {Object.values(row).map((value, cellIndex) => (
                              <td key={cellIndex} className="p-2 max-w-[100px] truncate">
                                {value === null || value === undefined
                                  ? <span className="text-muted-foreground italic">null</span>
                                  : typeof value === 'object'
                                    ? JSON.stringify(value).substring(0, 50) + '...'
                                    : String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                  {data.length > 3 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      ... and {data.length - 3} more rows
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!isValid || isExporting || data.length === 0}
          >
            {isExporting ? (
              <>Exporting...</>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {data.length} rows
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;