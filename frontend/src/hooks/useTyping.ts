import { useCallback, useRef, useEffect } from 'react';
import { useChat } from '../contexts/ChatContext';

interface UseTypingOptions {
  delay?: number; // Delay in milliseconds before stopping typing indicator
}

export function useTyping(options: UseTypingOptions = {}) {
  const { delay = 2000 } = options;
  const { sendTyping } = useChat();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const startTyping = useCallback(() => {
    console.log('⌨️ useTyping: startTyping called, current state:', isTypingRef.current);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator if not already typing
    if (!isTypingRef.current) {
      console.log('⌨️ useTyping: Starting typing indicator');
      sendTyping(true);
      isTypingRef.current = true;
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      console.log('⌨️ useTyping: Auto-stopping typing indicator after delay');
      sendTyping(false);
      isTypingRef.current = false;
      typingTimeoutRef.current = null;
    }, delay);
  }, [sendTyping, delay]);

  const stopTyping = useCallback(() => {
    console.log('⌨️ useTyping: stopTyping called, current state:', isTypingRef.current);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (isTypingRef.current) {
      console.log('⌨️ useTyping: Manually stopping typing indicator');
      sendTyping(false);
      isTypingRef.current = false;
    }
  }, [sendTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current) {
        sendTyping(false);
      }
    };
  }, [sendTyping]);

  return {
    startTyping,
    stopTyping,
    isTyping: isTypingRef.current,
  };
}
