import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, FileSpreadsheet, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { ChatRoom, Message, ExportOptions } from '@/types';
import exportService from '@/services/export';

interface ExportDialogProps {
  chatRoom: ChatRoom;
  messages: Message[];
  currentUser: { username: string; email: string };
  trigger?: React.ReactNode;
  className?: string;
}

export function ExportDialog({ 
  chatRoom, 
  messages, 
  currentUser,
  trigger,
  className = '' 
}: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [dateRange, setDateRange] = useState<{
    start: string;
    end: string;
  }>({
    start: '',
    end: ''
  });
  const [isExporting, setIsExporting] = useState(false);

  const stats = exportService.getExportStats(messages);
  const preview = exportService.generatePreview(messages);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Prepare export options
      const options: ExportOptions = {
        format: exportFormat,
        chatRoomId: chatRoom._id,
        ...(dateRange.start && dateRange.end && {
          dateRange: {
            start: new Date(dateRange.start),
            end: new Date(dateRange.end)
          }
        })
      };

      // Validate options
      const errors = exportService.validateExportOptions(options);
      if (errors.length > 0) {
        alert(`Export validation failed:\n${errors.join('\n')}`);
        return;
      }

      // Filter messages by date range if specified
      let messagesToExport = messages;
      if (options.dateRange) {
        messagesToExport = exportService.filterMessagesByDateRange(messages, options.dateRange);
      }

      // Prepare export data
      const exportData = {
        messages: messagesToExport,
        chatRoom,
        exportedAt: new Date().toISOString(),
        exportedBy: `${currentUser.username} (${currentUser.email})`
      };

      // Perform export
      if (exportFormat === 'json') {
        exportService.exportToJSON(exportData);
      } else {
        exportService.exportToCSV(exportData);
      }

      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getFilteredMessageCount = () => {
    if (!dateRange.start || !dateRange.end) {
      return messages.length;
    }
    
    const filtered = exportService.filterMessagesByDateRange(messages, {
      start: new Date(dateRange.start),
      end: new Date(dateRange.end)
    });
    
    return filtered.length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className={className}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Chat History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Chat Room Info */}
          <Card className="p-4">
            <h3 className="font-medium mb-2">Chat Room Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span>{chatRoom.name || 'Direct Chat'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <Badge variant="secondary">{chatRoom.type}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Participants:</span>
                <span>{chatRoom.participants.length}</span>
              </div>
            </div>
          </Card>

          {/* Export Format */}
          <div>
            <h3 className="font-medium mb-3">Export Format</h3>
            <div className="grid grid-cols-2 gap-3">
              <Card 
                className={cn(
                  "p-4 cursor-pointer transition-all",
                  exportFormat === 'json' ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                )}
                onClick={() => setExportFormat('json')}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-blue-600" />
                  <div>
                    <div className="font-medium">JSON</div>
                    <div className="text-xs text-gray-600">Structured data format</div>
                  </div>
                </div>
              </Card>

              <Card 
                className={cn(
                  "p-4 cursor-pointer transition-all",
                  exportFormat === 'csv' ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                )}
                onClick={() => setExportFormat('csv')}
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-6 w-6 text-green-600" />
                  <div>
                    <div className="font-medium">CSV</div>
                    <div className="text-xs text-gray-600">Spreadsheet format</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Range (Optional)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">From</label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  max={dateRange.end || undefined}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">To</label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  min={dateRange.start || undefined}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
            </div>
          </div>

          {/* Export Statistics */}
          <Card className="p-4 bg-gray-50">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Export Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Messages:</span>
                <span className="font-medium">{getFilteredMessageCount()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Format:</span>
                <span className="font-medium uppercase">{exportFormat}</span>
              </div>
              {stats.dateRange && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date Range:</span>
                    <span className="font-medium">
                      {format(stats.dateRange.earliest, 'MMM dd')} - {format(stats.dateRange.latest, 'MMM dd')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unique Senders:</span>
                    <span className="font-medium">{stats.uniqueSenders}</span>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Preview */}
          {preview.preview.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Preview ({preview.preview.length} of {preview.totalCount})</h3>
              <Card className="p-4 max-h-40 overflow-y-auto">
                <div className="space-y-2 text-sm">
                  {preview.preview.map((message) => (
                    <div key={message._id} className="flex gap-2 text-xs">
                      <span className="text-gray-500 flex-shrink-0">
                        {format(new Date(message.createdAt), 'HH:mm')}
                      </span>
                      <span className="font-medium flex-shrink-0">User:</span>
                      <span className="truncate">{message.content}</span>
                    </div>
                  ))}
                  {preview.hasMore && (
                    <div className="text-center text-gray-500 text-xs py-2">
                      ... and {preview.totalCount - preview.preview.length} more messages
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={isExporting || messages.length === 0}
            >
              {isExporting ? 'Exporting...' : `Export ${exportFormat.toUpperCase()}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 