import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { Database } from '../services/storage';

interface AuthContextType {
  currentUser: User | null;
  login: (code: string, pass: string) => { success: boolean; error?: string };
  logout: () => void;
  quickSwitch: (code: string) => boolean;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('milkdesk_active_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    Database.initialize();
  }, []);

  const login = (code: string, pass: string): { success: boolean; error?: string } => {
    const cleanCode = code.trim().toUpperCase();
    const users = Database.getUsers();
    const user = users.find(u => u.code.toUpperCase() === cleanCode && u.active);

    if (!user) {
      return { success: false, error: 'Invalid Login Code or account is inactive.' };
    }

    if (user.password !== pass.trim()) {
      return { success: false, error: 'Incorrect Password.' };
    }

    setCurrentUser(user);
    localStorage.setItem('milkdesk_active_user', JSON.stringify(user));
    return { success: true };
  };

  const quickSwitch = (code: string): boolean => {
    const cleanCode = code.trim().toUpperCase();
    const users = Database.getUsers();
    const user = users.find(u => u.code.toUpperCase() === cleanCode && u.active);
    if (!user) return false;

    setCurrentUser(user);
    localStorage.setItem('milkdesk_active_user', JSON.stringify(user));
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('milkdesk_active_user');
  };

  const refreshUser = () => {
    if (!currentUser) return;
    const users = Database.getUsers();
    const updated = users.find(u => u.id === currentUser.id);
    if (updated) {
      setCurrentUser(updated);
      localStorage.setItem('milkdesk_active_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, quickSwitch, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
