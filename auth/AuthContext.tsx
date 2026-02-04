import React, { createContext, useState, useContext, ReactNode } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';

interface AuthContextType {
  isAuthenticated: boolean;
  isPasswordSet: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  createPassword: (password: string) => void;
  changePassword: (currentPass: string, newPass: string) => boolean;
  resetPassword: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [password, setPassword] = useLocalStorage<string | null>('jcc-password', null);
  
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (password === null) {
      return false;
    }
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

  const changePassword = (currentPass: string, newPass: string): boolean => {
    if (currentPass === password) {
      setPassword(newPass);
      return true;
    }
    return false;
  };

  const resetPassword = () => {
    setPassword(null);
    sessionStorage.removeItem('jcc-auth');
    setIsAuthenticated(false);
  };

  const logout = () => {
    sessionStorage.removeItem('jcc-auth');
    setIsAuthenticated(false);
  };

  const value = { isAuthenticated, isPasswordSet, login, logout, createPassword, changePassword, resetPassword };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};