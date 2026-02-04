import React, { createContext, useState, useContext, ReactNode } from 'react';

export type UserRole = 'admin' | 'user';

export interface User {
  role: UserRole;
  username: string; // The actual login username
  name: string; // The display name
  jellyfinUserId: string;
  jellyfinToken: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
     const storedAuth = sessionStorage.getItem('jcc-auth');
     if (storedAuth) {
         return JSON.parse(storedAuth);
     }
     return null;
  });

  const isAuthenticated = currentUser !== null;

  const login = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('jcc-auth', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('jcc-auth');
  };

  const updateUser = (updates: Partial<User>) => {
      setCurrentUser(prev => {
          if (!prev) return null;
          const updated = { ...prev, ...updates };
          sessionStorage.setItem('jcc-auth', JSON.stringify(updated));
          return updated;
      });
  }

  const value = { 
      isAuthenticated, 
      currentUser,
      login,
      logout,
      updateUser
    };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};