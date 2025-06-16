import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChatRoomList } from '@/components/chat/ChatRoomList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Badge } from '@/components/ui/badge';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { 
  Menu, 
  MessageSquare, 
  Settings, 
  LogOut,
  Plus,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import type { ChatRoom } from '@/types';
import { UserRole, UserStatus } from '@/types';

interface ChatLayoutProps {
  className?: string;
}

export function ChatLayout({ className = '' }: ChatLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [isMobileListView, setIsMobileListView] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const { state: chatState, joinChatRoom } = useChat();
  const { state: authState, logout } = useAuth();
  const { totalUnreadCount } = useUnreadCount();

  const { chatRooms, currentChatRoom, isConnected, isLoading } = chatState;

  const handleSelectChatRoom = async (chatRoom: ChatRoom) => {
    await joinChatRoom(chatRoom._id);
    // On mobile, switch to chat view after selecting
    setIsMobileListView(false);
  };

  const handleBackToList = () => {
    setIsMobileListView(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleOpenAdminPanel = () => {
    setShowAdminPanel(true);
  };

  const handleCloseAdminPanel = () => {
    setShowAdminPanel(false);
  };

  // Show admin panel if requested
  if (showAdminPanel) {
    return <AdminPanel onBackToChat={handleCloseAdminPanel} />;
  }

  return (
    <div className={cn("h-screen flex flex-col bg-gray-100", className)}>
      {/* Top Header */}
      <Card className="rounded-none border-x-0 border-t-0 bg-white shadow-sm">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">
                Chat App
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Badge variant="secondary" className="text-green-700 bg-green-100">
                  <Wifi className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Disconnected
                </Badge>
              )}
              
              {totalUnreadCount > 0 && (
                <Badge className="bg-red-500 text-white">
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* User Status */}
            {authState.user && (
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">
                    {authState.user.username}
                  </div>
                  <div className="text-xs text-gray-600 capitalize">
                    {authState.user.status.toLowerCase()}
                    {authState.user.role === UserRole.ADMIN && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        ADMIN
                      </Badge>
                    )}
                    {authState.user.role === UserRole.AGENT && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        AGENT
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="relative">
                  <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {authState.user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 border-2 border-white rounded-full",
                    authState.user.status === UserStatus.ONLINE ? 'bg-green-500' :
                    authState.user.status === UserStatus.AWAY ? 'bg-yellow-500' :
                    authState.user.status === UserStatus.BUSY ? 'bg-red-500' : 'bg-gray-400'
                  )}></div>
                </div>
              </div>
            )}

            {/* Admin Panel Access */}
            {authState.user?.role === UserRole.ADMIN && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleOpenAdminPanel}
                title="Administration Panel"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Chat Room List */}
        <div className={cn(
          "flex-shrink-0 bg-white border-r transition-all duration-300",
          sidebarOpen ? "w-80" : "w-0",
          "md:block",
          // Mobile responsive
          isMobileListView ? "block w-full md:w-80" : "hidden md:block"
        )}>
          {sidebarOpen && (
            <div className="h-full flex flex-col">
              {/* Chat List Header */}
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900">
                    Conversations
                  </h2>
                  <Button size="icon" variant="ghost">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {isLoading && (
                  <div className="text-xs text-gray-600">
                    Loading conversations...
                  </div>
                )}
              </div>

              {/* Chat Room List */}
              <div className="flex-1 overflow-hidden">
                <ChatRoomList
                  chatRooms={chatRooms}
                  currentChatRoomId={currentChatRoom?._id}
                  onSelectChatRoom={handleSelectChatRoom}
                  className="h-full border-0"
                />
              </div>
            </div>
          )}
        </div>

        {/* Main Chat Window */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0",
          // Mobile responsive
          isMobileListView ? "hidden md:flex" : "flex"
        )}>
          <ChatWindow
            onBackToList={handleBackToList}
            showSidebar={rightSidebarOpen}
            onToggleSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
} 