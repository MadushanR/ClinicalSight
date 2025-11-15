import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { shiftWorkerAPI } from '../services/api';

export const AuthContext = createContext({ user: null });

const storageKey = 'sw_user_v1';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (user) localStorage.setItem(storageKey, JSON.stringify(user));
      else localStorage.removeItem(storageKey);
    } catch {}
  }, [user]);

  const login = useCallback(async (email, password) => {
    try {
      // Try to authenticate with backend
      const worker = await shiftWorkerAPI.login({ email, password });
      
      if (worker) {
        const avatar = `${(worker.firstName||'U').slice(0,1)}${(worker.lastName||'').slice(0,1)}`.toUpperCase();
        setUser({
          id: worker.id,
          email: worker.email,
          firstName: worker.firstName || email?.split('@')[0] || 'User',
          lastName: worker.lastName || '',
          avatar,
          sex: worker.sex || 'unspecified',
          role: worker.role || 'Support Worker',
          avatarUrl: worker.avatarUrl || '',
          phone: worker.phone || '',
          shiftPreference: worker.shiftPreference || 'day',
          notes: worker.notes || '',
        });
        return true;
      }
    } catch (err) {
      console.error('Login error:', err);
      // Fallback to local-only login for demo purposes
      const name = email?.split('@')[0] || 'User';
      const avatar = name.slice(0, 1).toUpperCase();
      setUser({ 
        email, 
        firstName: name, 
        lastName: '', 
        avatar, 
        sex: 'unspecified', 
        role: 'Support Worker', 
        avatarUrl: '' 
      });
      return true;
    }
  }, []);

  const register = useCallback(async (data) => {
    try {
      const { firstName, lastName, email, password, sex = 'unspecified' } = data || {};
      
      // Try to register with backend
      const worker = await shiftWorkerAPI.register({
        firstName,
        lastName,
        email,
        password,
        sex,
        role: data?.role || 'Support Worker',
        phone: data?.phone || '',
        shiftPreference: data?.shiftPreference || 'day',
        avatarUrl: data?.avatarUrl || '',
        notes: data?.notes || '',
      });
      
      if (worker) {
        const avatar = `${(firstName||'U').slice(0,1)}${(lastName||'').slice(0,1)}`.toUpperCase();
        setUser({
          id: worker.id,
          email: worker.email,
          firstName: worker.firstName || 'User',
          lastName: worker.lastName || '',
          avatar,
          sex: worker.sex || 'unspecified',
          role: worker.role || 'Support Worker',
          avatarUrl: worker.avatarUrl || '',
        });
        return true;
      }
    } catch (err) {
      console.error('Registration error:', err);
      // Fallback to local-only registration
      const { firstName, lastName, email, sex = 'unspecified' } = data || {};
      const avatar = (firstName || email || 'U').slice(0, 1).toUpperCase();
      const role = data?.role || 'Support Worker';
      setUser({ 
        email, 
        firstName: firstName || 'User', 
        lastName: lastName || '', 
        avatar, 
        sex, 
        role, 
        avatarUrl: data?.avatarUrl || '' 
      });
      return true;
    }
  }, []);

  const updateProfile = useCallback((data) => {
    setUser((prev) => ({ ...(prev || {}), ...(data || {}) }));
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const value = useMemo(() => ({ user, login, register, logout, updateProfile }), [user, login, register, logout, updateProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
