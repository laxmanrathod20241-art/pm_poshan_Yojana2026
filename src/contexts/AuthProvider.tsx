import React, { useState, useEffect } from 'react';
import { AuthContext, useAuth } from './AuthContext';
import type { Session, User } from './AuthContext';
import { api } from '../lib/apiClient';

export { useAuth, AuthContext };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    // 🛡️ Safe Loading Check
    const checkAuth = async () => {
      console.log("🔒 Local Auth: Initializing localized session check...");
      
      try {
        const response = await fetch(`${API_URL}/profiles/me`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("🔒 Local Auth: Session active for:", data.email);
          setSession({ access_token: 'cookie-managed', user: data });
          setUser(data);
          setRole(data.role || 'teacher');
        } else {
          console.warn("🔒 Local Auth: No active session. Clearing local state.");
          setSession(null);
          setUser(null);
        }
      } catch (err) {
        console.error("🔒 Local Auth: Server unreachable (Check backend status):", err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [API_URL]);

  const signOut = async () => {
    await api.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
    window.location.href = '/login';
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Access Denied: Invalid credentials');
      }

      // 🍪 Token is now automatically handled via HttpOnly cookie
      // We just need to load the profile to sync state
      const profileRes = await fetch(`${API_URL}/profiles/me`, {
        credentials: 'include'
      });
      const profileData = await profileRes.json();
      
      setSession({ access_token: 'cookie-managed', user: profileData });
      setUser(profileData);
      setRole(profileData.role || 'teacher');
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    const res = await fetch(`${API_URL}/profiles/me`, {
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data);
    }
  };

  const value = {
    session,
    user,
    loading,
    role,
    refreshProfile,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
