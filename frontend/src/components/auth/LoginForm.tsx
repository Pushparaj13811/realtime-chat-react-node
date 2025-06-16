import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginFormProps {
  onNavigateToSignup?: () => void;
}

export function LoginForm({ onNavigateToSignup }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { state, login, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await login({ email, password });
  };

  const demoCredentials = [
    { email: 'user@example.com', password: 'password123', role: 'USER' },
    { email: 'agent@example.com', password: 'password123', role: 'AGENT' },
    { email: 'admin@example.com', password: 'password123', role: 'ADMIN' }
  ];

  const handleDemoLogin = async (credentials: { email: string; password: string }) => {
    setEmail(credentials.email);
    setPassword(credentials.password);
    clearError();
    await login(credentials);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            <CardTitle className="text-2xl">Chat App</CardTitle>
          </div>
          <p className="text-gray-600">
            Sign in to your account
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="pl-10"
                  required
                  disabled={state.isLoading}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10"
                  required
                  disabled={state.isLoading}
                />
              </div>
            </div>

            {state.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{state.error}</p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={state.isLoading}
            >
              {state.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-600 text-center mb-3">
              Try with demo accounts:
            </p>
            {demoCredentials.map((cred) => (
              <Button
                key={cred.email}
                variant="outline"
                className="w-full justify-between text-sm"
                onClick={() => handleDemoLogin(cred)}
                disabled={state.isLoading}
              >
                <span>{cred.email}</span>
                <Badge variant="secondary" className="text-xs">
                  {cred.role}
                </Badge>
              </Button>
            ))}
          </div>

          <div className="text-center">
            <Button
              variant="link"
              onClick={onNavigateToSignup}
              disabled={state.isLoading}
              className="text-sm"
            >
              Don't have an account? Create one
              <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 