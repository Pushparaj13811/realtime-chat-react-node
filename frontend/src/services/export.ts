import Papa from 'papaparse';
import type { Message, ExportOptions, ChatRoom } from '../types';

interface ExportData {
  messages: Message[];
  chatRoom: ChatRoom;
  exportedAt: string;
  exportedBy: string;
}

class ExportService {
  /**
   * Export messages to JSON format
   */
  exportToJSON(data: ExportData): void {
    const exportContent = {
      ...data,
      format: 'JSON',
      version: '1.0'
    };

    const jsonString = JSON.stringify(exportContent, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    this.downloadFile(
      blob, 
      `chat-history-${data.chatRoom._id}-${this.formatDate(new Date())}.json`
    );
  }

  /**
   * Export messages to CSV format
   */
  exportToCSV(data: ExportData): void {
    // Flatten message data for CSV
    const csvData = data.messages.map(message => ({
      messageId: message._id,
      chatRoomId: message.chatRoomId,
      senderId: message.senderId,
      content: message.content,
      messageType: message.messageType,
      status: message.status,
      replyTo: message.replyTo || '',
      createdAt: new Date(message.createdAt).toLocaleString(),
      updatedAt: new Date(message.updatedAt).toLocaleString(),
      // Flatten delivery status
      deliveredTo: message.deliveredTo.map(d => 
        `${d.userId}:${new Date(d.deliveredAt).toLocaleString()}`
      ).join(';'),
      // Flatten read status
      readBy: message.readBy.map(r => 
        `${r.userId}:${new Date(r.readAt).toLocaleString()}`
      ).join(';'),
      // Flatten metadata
      metadata: message.metadata ? JSON.stringify(message.metadata) : ''
    }));

    // Add header row with export information
    const headerInfo = [
      ['Chat Export Information'],
      ['Export Format', 'CSV'],
      ['Export Version', '1.0'],
      ['Chat Room ID', data.chatRoom._id],
      ['Chat Room Name', data.chatRoom.name || 'Direct Chat'],
      ['Chat Room Type', data.chatRoom.type],
      ['Exported At', data.exportedAt],
      ['Exported By', data.exportedBy],
      ['Total Messages', data.messages.length.toString()],
      [''], // Empty row
      ['Message Data']
    ];

    const csvString = Papa.unparse({
      fields: [
        'messageId',
        'chatRoomId', 
        'senderId',
        'content',
        'messageType',
        'status',
        'replyTo',
        'createdAt',
        'updatedAt',
        'deliveredTo',
        'readBy',
        'metadata'
      ],
      data: csvData
    });

    // Combine header info with CSV data
    const headerString = headerInfo.map(row => row.join(',')).join('\n');
    const fullCsvString = headerString + '\n\n' + csvString;

    const blob = new Blob([fullCsvString], { type: 'text/csv' });
    
    this.downloadFile(
      blob, 
      `chat-history-${data.chatRoom._id}-${this.formatDate(new Date())}.csv`
    );
  }

  /**
   * Create and download a file
   */
  private downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Format date for filename
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }

  /**
   * Filter messages by date range
   */
  filterMessagesByDateRange(
    messages: Message[], 
    dateRange?: { start: Date; end: Date }
  ): Message[] {
    if (!dateRange) {
      return messages;
    }

    return messages.filter(message => {
      const messageDate = new Date(message.createdAt);
      return messageDate >= dateRange.start && messageDate <= dateRange.end;
    });
  }

  /**
   * Get export statistics
   */
  getExportStats(messages: Message[]): {
    totalMessages: number;
    messagesByType: Record<string, number>;
    messagesByStatus: Record<string, number>;
    dateRange: { earliest: Date; latest: Date } | null;
    uniqueSenders: number;
  } {
    if (messages.length === 0) {
      return {
        totalMessages: 0,
        messagesByType: {},
        messagesByStatus: {},
        dateRange: null,
        uniqueSenders: 0
      };
    }

    const messagesByType: Record<string, number> = {};
    const messagesByStatus: Record<string, number> = {};
    const senders = new Set<string>();
    let earliest = new Date(messages[0].createdAt);
    let latest = new Date(messages[0].createdAt);

    messages.forEach(message => {
      // Count by type
      messagesByType[message.messageType] = (messagesByType[message.messageType] || 0) + 1;
      
      // Count by status
      messagesByStatus[message.status] = (messagesByStatus[message.status] || 0) + 1;
      
      // Track senders
      senders.add(message.senderId);
      
      // Track date range
      const messageDate = new Date(message.createdAt);
      if (messageDate < earliest) earliest = messageDate;
      if (messageDate > latest) latest = messageDate;
    });

    return {
      totalMessages: messages.length,
      messagesByType,
      messagesByStatus,
      dateRange: { earliest, latest },
      uniqueSenders: senders.size
    };
  }

  /**
   * Validate export options
   */
  validateExportOptions(options: ExportOptions): string[] {
    const errors: string[] = [];

    if (!options.chatRoomId) {
      errors.push('Chat room ID is required');
    }

    if (!['json', 'csv'].includes(options.format)) {
      errors.push('Format must be either "json" or "csv"');
    }

    if (options.dateRange) {
      if (options.dateRange.start >= options.dateRange.end) {
        errors.push('Start date must be before end date');
      }
      
      if (options.dateRange.end > new Date()) {
        errors.push('End date cannot be in the future');
      }
    }

    return errors;
  }

  /**
   * Generate export preview (first 10 messages)
   */
  generatePreview(messages: Message[]): {
    preview: Message[];
    totalCount: number;
    hasMore: boolean;
  } {
    const preview = messages.slice(0, 10);
    return {
      preview,
      totalCount: messages.length,
      hasMore: messages.length > 10
    };
  }
}

// Create singleton instance
const exportService = new ExportService();
export default exportService; 