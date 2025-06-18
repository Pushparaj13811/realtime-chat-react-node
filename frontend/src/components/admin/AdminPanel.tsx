import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Shield, 
  MessageSquare, 
  Activity,
  UserPlus,
  Loader2,
  AlertCircle,
  Plus,
  ArrowLeft,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AgentRegistrationForm } from '@/components/auth/AgentRegistrationForm';
import type { User } from '@/types';
import { UserRole, UserStatus } from '@/types';
import apiService from '@/services/api';

type AdminTab = 'dashboard' | 'users' | 'create-agent';

export function AdminPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useAuth();

  // Determine active tab from URL
  const getActiveTabFromPath = (): AdminTab => {
    const path = location.pathname;
    if (path.includes('/users')) return 'users';
    if (path.includes('/create-agent')) return 'create-agent';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<AdminTab>(getActiveTabFromPath());
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeAgents: 0,
    activeChats: 0,
    onlineUsers: 0
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update active tab when URL changes
  useEffect(() => {
    setActiveTab(getActiveTabFromPath());
  }, [location.pathname]);

  // Handle tab navigation
  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    switch (tab) {
      case 'dashboard':
        navigate('/admin/dashboard');
        break;
      case 'users':
        navigate('/admin/users');
        break;
      case 'create-agent':
        navigate('/admin/create-agent');
        break;

      default:
        navigate('/admin');
    }
  };

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch stats and users in parallel
        const [statsResponse, usersResponse] = await Promise.all([
          apiService.getAdminStats(),
          apiService.getAllUsers()
        ]);

        if (statsResponse.success && statsResponse.data) {
          setStats(statsResponse.data);
        } else {
          throw new Error(statsResponse.message || 'Failed to fetch stats');
        }

        if (usersResponse.success && usersResponse.data) {
          setUsers(usersResponse.data);
        } else {
          throw new Error(usersResponse.message || 'Failed to fetch users');
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Verify admin access
  if (!state.user || state.user.role !== UserRole.ADMIN) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access the admin panel.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeTab === 'create-agent') {
    return <AgentRegistrationForm adminSessionId={state.user?.sessionId} onBack={() => setActiveTab('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/chat')}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Chat
              </Button>
              <Shield className="h-8 w-8 text-purple-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
                <p className="text-sm text-gray-500">System Administration</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/admin/agents')}
              >
                <Settings className="h-4 w-4 mr-1" />
                Agent Management
              </Button>
              <Badge variant="outline" className="text-purple-700">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Activity className="h-4 w-4 mr-2 inline" />
              Dashboard
            </button>
            <button
              onClick={() => handleTabChange('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="h-4 w-4 mr-2 inline" />
              Users
            </button>
            <button
              onClick={() => handleTabChange('create-agent')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === ('create-agent' as AdminTab)
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserPlus className="h-4 w-4 mr-2 inline" />
              Create Agent
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Shield className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Active Agents</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.activeAgents}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <MessageSquare className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Active Chats</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.activeChats}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Activity className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Online Users</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.onlineUsers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">System Status</span>
                    </div>
                    <Badge variant="outline" className="text-green-700 border-green-200">
                      Operational
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium">Database</span>
                    </div>
                    <Badge variant="outline" className="text-blue-700 border-blue-200">
                      Connected
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'users' && (
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${user.status === UserStatus.ONLINE ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                        <span className="font-medium">{user.username}</span>
                      </div>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">{user.email}</span>
                      <Badge variant="outline">
                        {user.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}



        {/* Users Management */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">User Management</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{stats.onlineUsers} online</span>
              </div>
              <Button
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Agent
              </Button>
            </div>
          </div>

          {/* Real-time Status Monitor */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium text-blue-900">Real-time Status Monitor</h4>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{stats.onlineUsers}</div>
                <div className="text-gray-600">Online Users</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{stats.activeAgents}</div>
                <div className="text-gray-600">Active Agents</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">{stats.activeChats}</div>
                <div className="text-gray-600">Active Chats</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  // Helper functions
  function getRoleBadgeColor(role: UserRole) {
    switch (role) {
      case UserRole.ADMIN: return 'bg-purple-100 text-purple-800';
      case UserRole.AGENT: return 'bg-blue-100 text-blue-800';
      case UserRole.USER: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
} 