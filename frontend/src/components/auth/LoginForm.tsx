import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Mail, Lock, Loader2, ArrowRight, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginFormProps {
  onNavigateToSignup?: () => void;
}

interface DemoCredential {
  email: string;
  password: string;
  role: string;
  label: string;
  location?: string;
}

export function LoginForm({ onNavigateToSignup }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { state, login, clearError } = useAuth();

  // Clear form validation errors when user starts typing
  useEffect(() => {
    if (formErrors.email && email) {
      setFormErrors(prev => ({ ...prev, email: '' }));
    }
  }, [email, formErrors.email]);

  useEffect(() => {
    if (formErrors.password && password) {
      setFormErrors(prev => ({ ...prev, password: '' }));
    }
  }, [password, formErrors.password]);

  // Auto-clear auth errors after 10 seconds
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        clearError();
      }, 10000); // 10 seconds

      return () => clearTimeout(timer);
    }
  }, [state.error, clearError]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form first
    if (!validateForm()) {
      return;
    }

    // Only clear error if there's no validation error
    // Don't clear on every submission to prevent error flashing
    await login({ email, password });
  };

  const demoCredentials: DemoCredential[] = [
    // 1 Admin - Nepali
    { email: 'ram.admin@hamrotech.com', password: 'password123', role: 'ADMIN', label: 'Ram Shrestha - मुख्य प्रशासक', location: 'काठमाडौं' },
    
    // 2 Agents - Nepali
    { email: 'suresh.agent@hamrotech.com', password: 'password123', role: 'AGENT', label: 'Suresh Gurung - प्राविधिक सहायता', location: 'पोखरा' },
    { email: 'sunita.agent@hamrotech.com', password: 'password123', role: 'AGENT', label: 'Sunita Thapa - बिलिङ व्यवस्थापन', location: 'भक्तपुर' },
    
    // 4 Regular Users - Nepali
    { email: 'aarti.paudel@technepal.com', password: 'password123', role: 'USER', label: 'Aarti Paudel - Software Engineer', location: 'काठमाडौं' },
    { email: 'binod.sharma@digitalnepal.com', password: 'password123', role: 'USER', label: 'Binod Sharma - Digital Marketing', location: 'ललितपुर' },
    { email: 'chitra.rai@designstudio.com', password: 'password123', role: 'USER', label: 'Chitra Rai - Product Designer', location: 'धरान' },
    { email: 'dipesh.nepal@projecthub.com', password: 'password123', role: 'USER', label: 'Dipesh Nepal - Project Manager', location: 'बुटवल' }
  ];

  const handleDemoLogin = async (credentials: DemoCredential) => {
    setEmail(credentials.email);
    setPassword(credentials.password);
    setFormErrors({}); // Clear form errors for demo login
    await login({ email: credentials.email, password: credentials.password });
  };

  const handleClearError = () => {
    clearError();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            <CardTitle className="text-2xl">हाम्रो Tech Chat</CardTitle>
          </div>
          <p className="text-gray-600">
            Sign in to your account • तपाईंको खातामा लग इन गर्नुहोस्
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
                  aria-invalid={!!formErrors.email}
                />
              </div>
              {formErrors.email && (
                <p className="text-sm text-red-600 mt-1">{formErrors.email}</p>
              )}
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
                  aria-invalid={!!formErrors.password}
                />
              </div>
              {formErrors.password && (
                <p className="text-sm text-red-600 mt-1">{formErrors.password}</p>
              )}
            </div>

            {/* Enhanced Error Display */}
            {state.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-red-800 font-medium mb-1">Login Failed</p>
                    <p className="text-sm text-red-700">{state.error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearError}
                    className="ml-2 text-red-400 hover:text-red-600 transition-colors"
                    disabled={state.isLoading}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
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
              🚀 Quick Login - नेपाली Demo Accounts (7 users):
            </p>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {demoCredentials.map((cred) => (
                <Button
                  key={cred.email}
                  variant="outline"
                  className="w-full justify-between text-sm hover:bg-blue-50 transition-colors"
                  onClick={() => handleDemoLogin(cred)}
                  disabled={state.isLoading}
                >
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="font-medium text-left truncate">{cred.label}</span>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="truncate">{cred.email}</span>
                      {cred.location && (
                        <>
                          <span>•</span>
                          <span className="text-orange-600 font-medium">{cred.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant={cred.role === 'ADMIN' ? 'destructive' : cred.role === 'AGENT' ? 'default' : 'secondary'} 
                    className="text-xs ml-2 flex-shrink-0"
                  >
                    {cred.role}
                  </Badge>
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              All passwords: <code className="bg-gray-100 px-1 rounded">password123</code>
            </p>
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