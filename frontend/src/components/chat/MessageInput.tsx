import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip } from 'lucide-react';
import { useTyping } from '@/hooks/useTyping';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function MessageInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Type a message...",
  className = '' 
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { startTyping, stopTyping } = useTyping({ delay: 1500 });

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    console.log('⌨️ MessageInput: Input changed, value:', value.length > 0 ? `${value.length} chars` : 'empty');
    
    if (value.trim()) {
      console.log('⌨️ MessageInput: Starting typing indicator');
      startTyping();
    } else {
      console.log('⌨️ MessageInput: Stopping typing indicator (empty input)');
      stopTyping();
    }
  }, [startTyping, stopTyping]);

  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage);
      setMessage('');
      stopTyping();
      
      // Focus back to textarea
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [message, disabled, onSendMessage, stopTyping]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  }, [isComposing, handleSend]);

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Cleanup typing indicator on unmount
  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  return (
    <div className={cn("flex gap-2 p-4 border-t bg-white", className)}>
      <Button
        variant="outline"
        size="icon"
        className="flex-shrink-0"
        disabled={disabled}
        aria-label="Attach file"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
      
      <div className="flex-1 relative">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[44px] max-h-32 resize-none pr-12"
          rows={1}
        />
      </div>
      
      <Button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        size="icon"
        className="flex-shrink-0"
        aria-label="Send message"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
} 