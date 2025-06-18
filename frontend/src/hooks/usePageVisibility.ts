import { useState, useEffect } from 'react';

interface UsePageVisibilityResult {
  isVisible: boolean;
  isWindowFocused: boolean;
  isChatActive: boolean;
}

export function usePageVisibility(currentChatRoomId?: string): UsePageVisibilityResult {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [isWindowFocused, setIsWindowFocused] = useState(document.hasFocus());
  const [activeChatRoomId, setActiveChatRoomId] = useState<string | undefined>(currentChatRoomId);

  useEffect(() => {
    setActiveChatRoomId(currentChatRoomId);
  }, [currentChatRoomId]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    const handleFocus = () => {
      setIsWindowFocused(true);
    };

    const handleBlur = () => {
      setIsWindowFocused(false);
    };

    // Page visibility API
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Window focus events
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const isChatActive = isVisible && isWindowFocused && !!activeChatRoomId;

  return {
    isVisible,
    isWindowFocused,
    isChatActive
  };
} 