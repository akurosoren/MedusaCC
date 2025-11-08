import React, { createContext, useState, useContext, ReactNode } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';

interface AuthContextType {
  isAuthenticated: boolean;
  isPasswordSet: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  createPassword: (password: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [password, setPassword] = useLocalStorage<string | null>('jcc-password', null);
  
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (password === null) {
      // If no password is set, the user is not authenticated and must create one.
      return false;
    }
    // Check session storage to see if the user is already logged in this session.
    return sessionStorage.getItem('jcc-auth') === 'true';
  });

  const isPasswordSet = password !== null;

  const login = (pass: string): boolean => {
    if (pass === password) {
      sessionStorage.setItem('jcc-auth', 'true');
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const createPassword = (newPassword: string) => {
    setPassword(newPassword);
    sessionStorage.setItem('jcc-auth', 'true');
    setIsAuthenticated(true);
  };

  const logout = () => {
    sessionStorage.removeItem('jcc-auth');
    setIsAuthenticated(false);
  };

  const value = { isAuthenticated, isPasswordSet, login, logout, createPassword };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};