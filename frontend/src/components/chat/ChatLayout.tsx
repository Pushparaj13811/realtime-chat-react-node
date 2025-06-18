import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChatRoomList } from '@/components/chat/ChatRoomList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StartChatDialog } from '@/components/chat/StartChatDialog';
import { 
  Menu, 
  MessageSquare, 
  Settings, 
  LogOut,
  Plus,
  Wifi,
  WifiOff,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import type { ChatRoom } from '@/types';
import { UserRole } from '@/types';


export function ChatLayout() {
  const [selectedChatRoom, setSelectedChatRoom] = useState<ChatRoom | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const navigate = useNavigate();
  const { state: chatState, refreshChatRooms, joinChatRoom } = useChat();
  const { state: authState, logout } = useAuth();
  const { totalUnreadCount } = useUnreadCount();

  const handleChatRoomSelect = async (chatRoom: ChatRoom) => {
    setSelectedChatRoom(chatRoom);
    await joinChatRoom(chatRoom._id);
    // Auto-collapse sidebar on mobile when selecting a chat
    if (window.innerWidth < 768) {
      setIsSidebarCollapsed(true);
    }
  };

  const handleBackToRooms = () => {
    setSelectedChatRoom(null);
    setIsSidebarCollapsed(false);
  };

  const handleChatStarted = () => {
    // Refresh chat rooms when a new chat is started
    refreshChatRooms();
  };



  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div 
        className={cn(
          "bg-white border-r transition-all duration-300 flex flex-col",
          isSidebarCollapsed ? "w-16" : "w-80"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between">
            {!isSidebarCollapsed && (
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-800">Chat App</h1>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* User Info & Actions */}
        {!isSidebarCollapsed && (
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-sm font-medium">
                    {authState.user?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">
                      {authState.user?.username}
                    </h3>
                    {totalUnreadCount > 0 && authState.user?.role !== UserRole.ADMIN && (
                      <Badge variant="destructive" className="text-xs px-2 py-1 animate-pulse">
                        🔴 {totalUnreadCount} unread
                      </Badge>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {authState.user?.role}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                {/* Admin Panel Access */}
                {authState.user?.role === UserRole.ADMIN && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/admin')}
                      className="p-2"
                      title="Admin Panel"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/admin/agents')}
                      className="p-2"
                      title="Agent Management"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                  </>
                )}
                
                {/* Logout */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Actions for Users */}
            {authState.user?.role === UserRole.USER && (
              <div className="space-y-2">
                <StartChatDialog 
                  onChatStarted={handleChatStarted}
                  trigger={
                    <Button variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Start New Chat
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* Chat Rooms List */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {!isSidebarCollapsed ? (
            <div className="flex flex-col h-full w-full">
              {/* Header */}
              <div className="flex-shrink-0 px-4 py-3 w-full border-b bg-white">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-800 text-lg">Conversations</h2>
                  {totalUnreadCount > 0 && authState.user?.role !== UserRole.ADMIN && (
                    <Badge variant="destructive" className="text-xs px-2 py-1">
                      {totalUnreadCount}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Scrollable Chat Rooms List */}
              <div className="flex-1 overflow-hidden bg-gray-50">
                <ChatRoomList
                  chatRooms={chatState.chatRooms}
                  currentChatRoomId={selectedChatRoom?._id}
                  onSelectChatRoom={handleChatRoomSelect}
                  className="h-full"
                />
              </div>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {/* Collapsed sidebar - show minimal info */}
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                <MessageSquare className="h-6 w-6 text-gray-400" />
              </div>
              {totalUnreadCount > 0 && (
                <div className="w-12 h-8 bg-red-500 rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-white text-xs font-bold">
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Connection Status */}
        {!isSidebarCollapsed && (
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                {chatState.isConnected ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-red-600" />
                    <span className="text-red-600">Disconnected</span>
                  </>
                )}
              </div>
              {chatState.isConnected && (
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <span>{chatState.onlineUsers.length + chatState.onlineAgents.length} online</span>
                  {chatState.onlineAgents.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{chatState.onlineAgents.length} agents</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}


      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChatRoom ? (
          <ChatWindow
            onBackToList={handleBackToRooms}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <MessageSquare className="h-16 w-16 text-gray-400" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                No Chat Selected
              </h2>
              <p className="text-gray-500 max-w-md">
                Choose a conversation from the sidebar to start messaging
              </p>
              
              {/* Quick Actions for Users */}
              {authState.user?.role === UserRole.USER && (
                <div className="mt-6">
                  <StartChatDialog 
                    onChatStarted={handleChatStarted}
                    trigger={
                      <Button size="lg" variant="outline">
                        <Plus className="h-5 w-5 mr-2" />
                        Start New Chat
                      </Button>
                    }
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 