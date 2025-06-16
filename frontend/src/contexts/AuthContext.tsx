import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { AuthSession, LoginRequest, RegisterRequest, UserStatus } from '../types';
import apiService from '../services/api';
import socketService from '../services/socket';

interface AuthState {
  user: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: AuthSession }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'UPDATE_USER_STATUS'; payload: UserStatus }
  | { type: 'CLEAR_ERROR' };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'UPDATE_USER_STATUS':
      return {
        ...state,
        user: state.user ? { ...state.user, status: action.payload } : null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

interface AuthContextType {
  state: AuthState;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateStatus: (status: UserStatus) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  // Setup socket connection when authenticated
  useEffect(() => {
    if (state.isAuthenticated && state.user?.sessionId) {
      socketService.connect(state.user.sessionId);
    } else {
      socketService.disconnect();
    }

    return () => {
      socketService.disconnect();
    };
  }, [state.isAuthenticated, state.user?.sessionId]);

  const initializeAuth = async () => {
    const sessionId = apiService.getSessionId();
    
    if (!sessionId) {
      dispatch({ type: 'AUTH_ERROR', payload: 'No session found' });
      return;
    }

    try {
      dispatch({ type: 'AUTH_START' });
      const response = await apiService.validateSession();
      
      if (response.success && response.data) {
        dispatch({ type: 'AUTH_SUCCESS', payload: response.data });
      } else {
        dispatch({ type: 'AUTH_ERROR', payload: response.message });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      dispatch({ type: 'AUTH_ERROR', payload: 'Failed to validate session' });
    }
  };

  const login = async (credentials: LoginRequest) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await apiService.login(credentials);
      
      if (response.success && response.data) {
        dispatch({ type: 'AUTH_SUCCESS', payload: response.data });
      } else {
        dispatch({ type: 'AUTH_ERROR', payload: response.message });
      }
    } catch (error) {
      console.error('Login error:', error);
      dispatch({ 
        type: 'AUTH_ERROR', 
        payload: error instanceof Error ? error.message : 'Login failed' 
      });
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await apiService.register(userData);
      
      if (response.success) {
        // After successful registration, automatically log in
        await login({ email: userData.email, password: userData.password });
      } else {
        dispatch({ type: 'AUTH_ERROR', payload: response.message || 'Registration failed' });
      }
    } catch (error: unknown) {
      console.error('Registration error:', error);
      
      // Handle different types of errors
      let errorMessage = 'Registration failed';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; error?: string } } };
        if (axiosError.response?.data?.message) {
          // Server returned a specific error message
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.response?.data?.error) {
          // Alternative error format
          errorMessage = axiosError.response.data.error;
        }
      } else if (error instanceof Error) {
        // General error message
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      dispatch({ 
        type: 'AUTH_ERROR', 
        payload: errorMessage 
      });
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
      socketService.disconnect();
      dispatch({ type: 'AUTH_LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
      // Still logout locally even if server request fails
      socketService.disconnect();
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  const updateStatus = async (status: UserStatus) => {
    try {
      const response = await apiService.updateStatus(status);
      
      if (response.success) {
        dispatch({ type: 'UPDATE_USER_STATUS', payload: status });
        
        // Update socket status if connected
        if (socketService.isConnected()) {
          socketService.updateAgentStatus(status);
        }
      } else {
        dispatch({ type: 'AUTH_ERROR', payload: response.message });
      }
    } catch (error) {
      console.error('Status update error:', error);
      dispatch({ 
        type: 'AUTH_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to update status' 
      });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  return (
    <AuthContext.Provider 
      value={{
        state,
        login,
        register,
        logout,
        updateStatus,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext; 