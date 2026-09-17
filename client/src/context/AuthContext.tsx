import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  studentQuickAccess: (identifier: string, name?: string) => Promise<{ user: User; isReturning: boolean }>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await authApi.getMe();
      setUser(res.data.data?.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    const u = res.data.data?.user ?? null;
    setUser(u);
    return u;
  };

  const studentQuickAccess = async (identifier: string, name?: string) => {
    const res = await authApi.studentSession({ identifier, name });
    const { user: u, isReturning } = res.data.data;
    setUser(u);
    try {
      localStorage.setItem('campusprint_student_id', identifier);
      if (u.name) localStorage.setItem('campusprint_student_name', u.name);
    } catch {
      // ignore
    }
    return { user: u, isReturning };
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        studentQuickAccess,
        logout,
        refetch: fetchMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
