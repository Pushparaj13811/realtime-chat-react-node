import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, FileSpreadsheet, Calendar, Clock, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { ChatRoom, Message, ExportOptions } from '@/types';
import exportService from '@/services/export';
import { useState } from 'react';

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
      
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Download className="h-6 w-6 text-blue-600" />
            Export Chat History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Chat Room Info */}
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <h3 className="font-semibold mb-3 text-blue-900 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat Room Details
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Name:</span>
                <span className="text-gray-900 font-medium">{chatRoom.name || 'Direct Chat'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Type:</span>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">{chatRoom.type}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Participants:</span>
                <Badge variant="outline" className="border-blue-300 text-blue-700">{chatRoom.participants.length}</Badge>
              </div>
            </div>
          </Card>

          {/* Export Format */}
          <div>
            <h3 className="font-semibold mb-4 text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-700" />
              Export Format
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Card 
                className={cn(
                  "p-5 cursor-pointer transition-all border-2 hover:shadow-md",
                  exportFormat === 'json' 
                    ? "border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200" 
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
                onClick={() => setExportFormat('json')}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    exportFormat === 'json' ? "bg-blue-100" : "bg-gray-100"
                  )}>
                    <FileText className={cn(
                      "h-6 w-6",
                      exportFormat === 'json' ? "text-blue-600" : "text-gray-600"
                    )} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">JSON</div>
                    <div className="text-sm text-gray-600">Structured data format</div>
                  </div>
                </div>
              </Card>

              <Card 
                className={cn(
                  "p-5 cursor-pointer transition-all border-2 hover:shadow-md",
                  exportFormat === 'csv' 
                    ? "border-green-500 bg-green-50 shadow-md ring-2 ring-green-200" 
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
                onClick={() => setExportFormat('csv')}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    exportFormat === 'csv' ? "bg-green-100" : "bg-gray-100"
                  )}>
                    <FileSpreadsheet className={cn(
                      "h-6 w-6",
                      exportFormat === 'csv' ? "text-green-600" : "text-gray-600"
                    )} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">CSV</div>
                    <div className="text-sm text-gray-600">Spreadsheet format</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <h3 className="font-semibold mb-4 text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-700" />
              Date Range <span className="text-sm font-normal text-gray-500">(Optional)</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  From
                </label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  max={dateRange.end || undefined}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  To
                </label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  min={dateRange.start || undefined}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Export Statistics */}
          <Card className="p-5 bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
            <h3 className="font-semibold mb-4 text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-700" />
              Export Summary
            </h3>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-white rounded-lg border">
                  <span className="text-gray-600 font-medium">Total Messages:</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-semibold">
                    {getFilteredMessageCount()}
                  </Badge>
                </div>
                {stats.dateRange && (
                  <div className="flex justify-between items-center p-2 bg-white rounded-lg border">
                    <span className="text-gray-600 font-medium">Date Range:</span>
                    <span className="font-medium text-gray-900 text-xs">
                      {format(stats.dateRange.earliest, 'MMM dd')} - {format(stats.dateRange.latest, 'MMM dd')}
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-white rounded-lg border">
                  <span className="text-gray-600 font-medium">Format:</span>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "font-semibold uppercase",
                      exportFormat === 'json' ? "border-blue-300 text-blue-700" : "border-green-300 text-green-700"
                    )}
                  >
                    {exportFormat}
                  </Badge>
                </div>
                {stats.dateRange && (
                  <div className="flex justify-between items-center p-2 bg-white rounded-lg border">
                    <span className="text-gray-600 font-medium">Unique Senders:</span>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800 font-semibold">
                      {stats.uniqueSenders}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Preview */}
          {preview.preview.length > 0 && (
            <div>
              <h3 className="font-semibold mb-4 text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-gray-700" />
                Preview 
                <Badge variant="outline" className="ml-2 text-xs">
                  {preview.preview.length} of {preview.totalCount}
                </Badge>
              </h3>
              <Card className="p-4 max-h-48 overflow-y-auto bg-white border-2 border-gray-200">
                <div className="space-y-3 text-sm">
                  {preview.preview.map((message) => {
                    // Get sender name from populated data or fallback to ID
                    let senderName = 'Unknown User';
                    
                    // Check if senderId is populated with user data
                    if (typeof message.senderId === 'object' && message.senderId !== null) {
                      const populatedSender = message.senderId as { username?: string; name?: string; _id?: string };
                      senderName = populatedSender.username || populatedSender.name || 'Unknown User';
                    } else {
                      // Check if the senderId matches current user
                      if (String(message.senderId) === currentUser.email || String(message.senderId).includes(currentUser.username)) {
                        senderName = currentUser.username;
                      } else {
                        // Check room participants for sender info
                        const sender = chatRoom.participants.find(p => String(p._id) === String(message.senderId));
                        if (sender) {
                          senderName = sender.username;
                        } else {
                          // Fallback to showing last 4 chars of ID
                          senderName = `User (${String(message.senderId).slice(-4)})`;
                        }
                      }
                    }
                    
                    return (
                      <div key={message._id} className="flex gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <span className="text-gray-500 flex-shrink-0 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {format(new Date(message.createdAt), 'HH:mm')}
                        </span>
                        <span className="font-semibold flex-shrink-0 text-blue-700 min-w-0">{senderName}:</span>
                        <span className="text-gray-800 break-words flex-1">{message.content}</span>
                      </div>
                    );
                  })}
                  {preview.hasMore && (
                    <div className="text-center text-gray-500 text-xs py-2">
                      ... and {preview.totalCount - preview.preview.length} more messages
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          <Separator className="my-6" />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              className="border-gray-300 hover:border-gray-400"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={isExporting || messages.length === 0}
              className={cn(
                "px-6 py-2 font-semibold shadow-md",
                exportFormat === 'json' 
                  ? "bg-blue-600 hover:bg-blue-700 text-white" 
                  : "bg-green-600 hover:bg-green-700 text-white"
              )}
            >
              {isExporting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Exporting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export {exportFormat.toUpperCase()}
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 