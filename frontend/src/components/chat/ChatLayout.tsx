import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChatRoomList } from '@/components/chat/ChatRoomList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Badge } from '@/components/ui/badge';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { StartChatDialog } from '@/components/chat/StartChatDialog';
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
import { UserRole } from '@/types';
import socketService from '@/services/socket';

export function ChatLayout() {
  const [selectedChatRoom, setSelectedChatRoom] = useState<ChatRoom | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const { state: chatState, refreshChatRooms, joinChatRoom } = useChat();
  const { state: authState, logout } = useAuth();
  const { totalUnreadCount } = useUnreadCount();

  // If admin panel is open, show it
  if (showAdminPanel && authState.user?.role === UserRole.ADMIN) {
    return <AdminPanel />;
  }

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

  const refreshOnlineData = () => {
    console.log('ChatLayout: Manually refreshing online data');
    socketService.getOnlineUsers();
    socketService.getOnlineAgents();
  };

  const testConnection = async () => {
    console.log('ChatLayout: Testing connection...');
    const testResult = await socketService.testConnection();
    console.log('ChatLayout: Connection test result:', testResult);
    
    const details = socketService.getConnectionDetails();
    console.log('ChatLayout: Connection details:', details);
  };

  const reconnectSocket = () => {
    console.log('ChatLayout: Manual socket reconnection');
    socketService.reconnect();
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
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {authState.user?.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div>
                  <p className="font-medium text-gray-800 text-sm">
                    {authState.user?.username}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {authState.user?.role}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                {/* Admin Panel Access */}
                {authState.user?.role === UserRole.ADMIN && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdminPanel(true)}
                    className="p-2"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
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

            {/* Start Chat Button for Users */}
            {authState.user?.role === UserRole.USER && (
              <StartChatDialog 
                onChatStarted={handleChatStarted}
                trigger={
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Start New Chat
                  </Button>
                }
              />
            )}
          </div>
        )}

        {/* Chat Rooms List */}
        <div className="flex-1 overflow-hidden">
          {!isSidebarCollapsed ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">Conversations</h2>
                {totalUnreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {totalUnreadCount}
                  </Badge>
                )}
              </div>
              
              <ChatRoomList
                chatRooms={chatState.chatRooms}
                currentChatRoomId={selectedChatRoom?._id}
                onSelectChatRoom={handleChatRoomSelect}
              />
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {/* Collapsed sidebar - show minimal info */}
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-gray-400" />
              </div>
              {totalUnreadCount > 0 && (
                <div className="w-12 h-8 bg-red-500 rounded-lg flex items-center justify-center">
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

        {/* Debug Panel (only in development) */}
        {import.meta.env.DEV && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">Debug Info</h4>
            <div className="text-xs text-yellow-700 space-y-1">
              <div>Connection Status: {chatState.isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
              <div>Online Users: {chatState.onlineUsers.length}</div>
              <div>Online Agents: {chatState.onlineAgents.length}</div>
              <div>Auth Status: {authState.isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}</div>
              <div>Session ID: {authState.user?.sessionId ? `${authState.user.sessionId.substring(0, 20)}...` : 'None'}</div>
              <div>User Role: {authState.user?.role || 'None'}</div>
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={refreshOnlineData}
                  className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs hover:bg-yellow-300"
                >
                  Refresh Data
                </button>
                <button 
                  onClick={testConnection}
                  className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs hover:bg-blue-300"
                >
                  Test Connection
                </button>
                <button 
                  onClick={reconnectSocket}
                  className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs hover:bg-green-300"
                >
                  Reconnect
                </button>
              </div>
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
                {authState.user?.role === UserRole.USER && (
                  <span className="block mt-2">
                    or start a new chat with our support team
                  </span>
                )}
              </p>
              
              {/* Quick Start Chat for Users */}
              {authState.user?.role === UserRole.USER && (
                <div className="mt-6">
                  <StartChatDialog 
                    onChatStarted={handleChatStarted}
                    trigger={
                      <Button size="lg">
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