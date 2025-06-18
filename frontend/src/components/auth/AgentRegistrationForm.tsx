import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Mail, 
  Lock, 
  User, 
  Headphones,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  Shield,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, Department } from '@/types';
import apiService from '@/services/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AgentRegistrationFormProps {
  onBack?: () => void;
  adminSessionId?: string; // Required for verification
}

const departmentLabels: Record<Department, string> = {
  [Department.TECHNICAL_SUPPORT]: 'Technical Support',
  [Department.BILLING]: 'Billing & Payments',
  [Department.SALES]: 'Sales & Pricing',
  [Department.GENERAL_SUPPORT]: 'General Support',
  [Department.ACCOUNT_MANAGEMENT]: 'Account Management',
  [Department.UNKNOWN]: 'Not Sure',
  [Department.OTHER]: 'Other'
};

export function AgentRegistrationForm({ onBack, adminSessionId }: AgentRegistrationFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: UserRole.AGENT,
    department: '' as Department | '',
    specialization: '',
    notes: ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [registrationError, setRegistrationError] = useState<string>('');

  const { state, clearError } = useAuth();

  // Check if user is admin - use auth context instead of just the prop
  const isAdmin = state.isAuthenticated && state.user?.role === UserRole.ADMIN;
  const currentSessionId = state.user?.sessionId || adminSessionId;

  // Auto-clear registration errors after 10 seconds
  useEffect(() => {
    if (registrationError) {
      const timer = setTimeout(() => {
        setRegistrationError('');
      }, 10000); // 10 seconds

      return () => clearTimeout(timer);
    }
  }, [registrationError]);

  // Auto-clear auth errors after 10 seconds
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        clearError();
      }, 10000); // 10 seconds

      return () => clearTimeout(timer);
    }
  }, [state.error, clearError]);

  // Validation rules
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Username validation
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Department validation
    if (!formData.department.trim()) {
      errors.department = 'Department is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationError(''); // Clear previous registration errors

    if (!isAdmin || !currentSessionId) {
      setRegistrationError('Admin access required to create agent accounts');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, notes, ...registerData } = formData;
      
      // Convert empty string department to undefined
      const finalData = {
        ...registerData,
        department: formData.department || undefined
      };
      
      // Call register API but don't auto-login (this was causing admin logout)
      const response = await apiService.register(finalData);
      
      if (response.success) {
        setIsSuccess(true);
        // Reset form for creating another agent
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: UserRole.AGENT,
          department: '' as Department | '',
          specialization: '',
          notes: ''
        });
        setValidationErrors({});
      } else {
        // Handle registration failure
        setRegistrationError(response.message || 'Agent registration failed');
      }
    } catch (error) {
      console.error('Agent registration failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Agent registration failed';
      setRegistrationError(errorMessage);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleClearRegistrationError = () => {
    setRegistrationError('');
  };

  const handleClearAuthError = () => {
    clearError();
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Access Restricted
            </h3>
            <p className="text-gray-600 mb-4">
              Agent registration requires administrator privileges. Please contact your system administrator.
            </p>
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Agent Account Created Successfully
            </h3>
            <p className="text-gray-600 mb-4">
              The agent account for {formData.username} has been created and can now be used to access the system.
            </p>
            <div className="space-y-2">
              <Button onClick={() => setIsSuccess(false)} className="w-full">
                Create Another Agent
              </Button>
              <Button onClick={onBack} variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Admin Panel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Headphones className="h-8 w-8 text-green-600" />
            <CardTitle className="text-2xl">Register Support Agent</CardTitle>
          </div>
          <p className="text-gray-600">
            Create a new customer support agent account
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Security Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-medium text-amber-800">
                Administrative Action
              </p>
            </div>
            <p className="text-xs text-amber-700">
              You are creating a privileged agent account. This user will have access to customer support features and tools.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Agent Username *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="Enter agent username"
                  className="pl-10"
                  disabled={state.isLoading}
                  aria-invalid={!!validationErrors.username}
                />
              </div>
              {validationErrors.username && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.username}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Agent Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value.toLowerCase())}
                  placeholder="Enter agent email"
                  className="pl-10"
                  disabled={state.isLoading}
                  aria-invalid={!!validationErrors.email}
                />
              </div>
              {validationErrors.email && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.email}</p>
              )}
            </div>

            {/* Department Field */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Department *
              </label>
              <Select
                value={formData.department}
                onValueChange={(value) => handleInputChange('department', value as Department)}
                disabled={state.isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(departmentLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.department && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.department}</p>
              )}
            </div>

            {/* Specialization Field */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Specialization (Optional)
              </label>
              <Input
                type="text"
                value={formData.specialization}
                onChange={(e) => handleInputChange('specialization', e.target.value)}
                placeholder="e.g., Network Issues, Payment Processing, Enterprise Sales"
                disabled={state.isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Specific area of expertise within the department
              </p>
            </div>

            {/* Password Field */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Initial Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Create initial password"
                  className="pl-10 pr-10"
                  disabled={state.isLoading}
                  aria-invalid={!!validationErrors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={state.isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.password}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Agent will be required to change this on first login
              </p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm password"
                  className="pl-10 pr-10"
                  disabled={state.isLoading}
                  aria-invalid={!!validationErrors.confirmPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={state.isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {validationErrors.confirmPassword && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.confirmPassword}</p>
              )}
            </div>

            {/* Notes Field */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Notes (Optional)
              </label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional notes about this agent..."
                disabled={state.isLoading}
                className="min-h-[80px]"
              />
            </div>

            {/* Enhanced Registration Error Display */}
            {registrationError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-red-800 font-medium mb-1">Registration Failed</p>
                    <p className="text-sm text-red-700">{registrationError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearRegistrationError}
                    className="ml-2 text-red-400 hover:text-red-600 transition-colors"
                    disabled={state.isLoading}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Enhanced Auth Error Display */}
            {state.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-red-800 font-medium mb-1">Authentication Error</p>
                    <p className="text-sm text-red-700">{state.error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearAuthError}
                    className="ml-2 text-red-400 hover:text-red-600 transition-colors"
                    disabled={state.isLoading}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="space-y-3">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={state.isLoading}
              >
                {state.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Agent Account...
                  </>
                ) : (
                  <>
                    <Headphones className="mr-2 h-4 w-4" />
                    Create Agent Account
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={state.isLoading}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 