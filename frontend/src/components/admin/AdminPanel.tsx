import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Users, 
  UserPlus, 
  Settings, 
  BarChart, 
  MessageSquare,
  ArrowLeft,
  Headphones,
  UserCheck,
  Activity,
  Database
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AgentRegistrationForm } from '@/components/auth/AgentRegistrationForm';
import { UserRole } from '@/types';

type AdminView = 'dashboard' | 'createAgent' | 'manageUsers' | 'analytics' | 'settings';

interface AdminPanelProps {
  onBackToChat?: () => void;
}

export function AdminPanel({ onBackToChat }: AdminPanelProps) {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const { state: authState } = useAuth();

  // Check if user has admin privileges
  if (!authState.user || authState.user.role !== UserRole.ADMIN) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Access Denied
            </h3>
            <p className="text-gray-600 mb-4">
              You need administrator privileges to access this panel.
            </p>
            <Button onClick={onBackToChat} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Chat
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render different views based on currentView
  if (currentView === 'createAgent') {
    return (
      <AgentRegistrationForm 
        onBack={() => setCurrentView('dashboard')}
        adminSessionId={authState.user.sessionId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <Card className="rounded-none border-x-0 border-t-0">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-purple-600" />
            <h1 className="text-xl font-bold text-gray-900">
              Administration Panel
            </h1>
            <Badge variant="destructive" className="text-xs">
              ADMIN ONLY
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-900">
                {authState.user.username}
              </div>
              <div className="text-xs text-gray-600">
                Administrator
              </div>
            </div>
            
            <Button onClick={onBackToChat} variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Chat
            </Button>
          </div>
        </div>
      </Card>

      <div className="p-6 max-w-7xl mx-auto">
        {currentView === 'dashboard' && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">1,234</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Headphones className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Active Agents</p>
                      <p className="text-2xl font-bold text-gray-900">42</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Active Chats</p>
                      <p className="text-2xl font-bold text-gray-900">89</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Activity className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">System Status</p>
                      <p className="text-2xl font-bold text-green-600">Healthy</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    User Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600 text-sm">
                    Create and manage user accounts, including agents and administrators.
                  </p>
                  
                  <div className="space-y-3">
                    <Button 
                      onClick={() => setCurrentView('createAgent')}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Headphones className="mr-2 h-4 w-4" />
                      Create Support Agent Account
                    </Button>
                    
                    <Button 
                      onClick={() => setCurrentView('manageUsers')}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Manage All Users
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* System Operations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    System Operations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600 text-sm">
                    Monitor system performance and configure application settings.
                  </p>
                  
                  <div className="space-y-3">
                    <Button 
                      onClick={() => setCurrentView('analytics')}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <BarChart className="mr-2 h-4 w-4" />
                      View Analytics & Reports
                    </Button>
                    
                    <Button 
                      onClick={() => setCurrentView('settings')}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Database className="mr-2 h-4 w-4" />
                      System Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Administrative Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <UserCheck className="h-4 w-4 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          New agent account created
                        </p>
                        <p className="text-xs text-gray-600">
                          Agent "john.smith" added to Customer Support department • 2 hours ago
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Settings className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          System configuration updated
                        </p>
                        <p className="text-xs text-gray-600">
                          Chat timeout settings modified • 1 day ago
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Users className="h-4 w-4 text-purple-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          User permissions updated
                        </p>
                        <p className="text-xs text-gray-600">
                          Modified access levels for 3 users • 2 days ago
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Placeholder views for other sections */}
        {currentView === 'manageUsers' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <Button onClick={() => setCurrentView('dashboard')} variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                User management interface would be implemented here. This would include:
              </p>
              <ul className="list-disc list-inside mt-4 space-y-2 text-sm text-gray-600">
                <li>View all users with their roles and status</li>
                <li>Edit user permissions and roles</li>
                <li>Disable/enable user accounts</li>
                <li>Reset user passwords</li>
                <li>View user activity logs</li>
              </ul>
            </CardContent>
          </Card>
        )}

        {currentView === 'analytics' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  Analytics & Reports
                </CardTitle>
                <Button onClick={() => setCurrentView('dashboard')} variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Analytics dashboard would be implemented here. This would include:
              </p>
              <ul className="list-disc list-inside mt-4 space-y-2 text-sm text-gray-600">
                <li>Chat volume and response time metrics</li>
                <li>Agent performance statistics</li>
                <li>User engagement analytics</li>
                <li>System performance monitoring</li>
                <li>Custom report generation</li>
              </ul>
            </CardContent>
          </Card>
        )}

        {currentView === 'settings' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  System Configuration
                </CardTitle>
                <Button onClick={() => setCurrentView('dashboard')} variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                System configuration interface would be implemented here. This would include:
              </p>
              <ul className="list-disc list-inside mt-4 space-y-2 text-sm text-gray-600">
                <li>Application settings and parameters</li>
                <li>Security and authentication configuration</li>
                <li>Email and notification settings</li>
                <li>Database and backup management</li>
                <li>API and integration settings</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 