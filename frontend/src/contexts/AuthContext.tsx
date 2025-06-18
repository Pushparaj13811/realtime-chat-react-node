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
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: AuthSession }
  | { type: 'LOGOUT' };

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
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
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

  // Initialize user on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const sessionId = apiService.getSessionId();
      console.log('🔍 Initializing auth with sessionId:', sessionId);
      
      if (sessionId) {
        try {
          dispatch({ type: 'SET_LOADING', payload: true });
          const response = await apiService.validateSession();
          console.log('✅ Session validation response:', response);
          
          if (response.success && response.data) {
            dispatch({ 
              type: 'LOGIN_SUCCESS', 
              payload: response.data 
            });
          } else {
            console.log('❌ Session validation failed, clearing session');
            apiService.clearSession();
            dispatch({ type: 'LOGOUT' });
          }
        } catch (error) {
          console.error('❌ Session validation error:', error);
          apiService.clearSession();
          dispatch({ type: 'LOGOUT' });
        } finally {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        console.log('ℹ️ No session found, user not authenticated');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, []);

  // Setup socket connection when authenticated
  useEffect(() => {
    console.log('AuthContext: Socket connection effect triggered', {
      isAuthenticated: state.isAuthenticated,
      hasSessionId: !!state.user?.sessionId,
      sessionId: state.user?.sessionId
    });
    
    if (state.isAuthenticated && state.user?.sessionId) {
      console.log('AuthContext: Connecting socket with sessionId:', state.user.sessionId);
      socketService.connect(state.user.sessionId);
    } else {
      console.log('AuthContext: Disconnecting socket - not authenticated or no sessionId');
      socketService.disconnect();
    }

    return () => {
      socketService.disconnect();
    };
  }, [state.isAuthenticated, state.user?.sessionId]);

  const login = async (credentials: LoginRequest) => {
    try {
      dispatch({ type: 'AUTH_START' });
      console.log('🔐 Attempting login for:', credentials.email);
      
      const response = await apiService.login(credentials);
      console.log('📊 Login response:', response);
      
      if (response.success && response.data) {
        console.log('✅ Login successful, sessionId:', response.data.sessionId);
        dispatch({ type: 'AUTH_SUCCESS', payload: response.data });
        
        // Connect to socket with the new session
        if (response.data.sessionId) {
          socketService.connect(response.data.sessionId);
        }
      } else {
        console.error('❌ Login failed:', response.message);
        dispatch({ type: 'AUTH_ERROR', payload: response.message || 'Login failed' });
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      let errorMessage = 'Login failed';
      
      // Extract error message from the enhanced error
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      }
      
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage });
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
      
      let errorMessage = 'Registration failed';
      
      // Extract error message from the enhanced error
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as { message: string }).message;
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