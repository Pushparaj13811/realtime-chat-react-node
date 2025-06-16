import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';

type AuthMode = 'login' | 'signup';

export function AuthPage() {
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  const handleNavigateToSignup = () => {
    setAuthMode('signup');
  };

  const handleBackToLogin = () => {
    setAuthMode('login');
  };

  return (
    <>
      {authMode === 'login' ? (
        <LoginForm onNavigateToSignup={handleNavigateToSignup} />
      ) : (
        <SignupForm onBackToLogin={handleBackToLogin} />
      )}
    </>
  );
} 