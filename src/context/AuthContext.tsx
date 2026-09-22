import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, OWNER_EMAIL } from '../lib/supabase';
import { UserSession } from '../types';

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (value: boolean) => void;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const email = session.user.email?.toLowerCase() || null;
        setUser({
          id: session.user.id,
          email: session.user.email || null,
          isOwner: email === OWNER_EMAIL.toLowerCase(),
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }

      if (session?.user) {
        const email = session.user.email?.toLowerCase() || null;
        setUser({
          id: session.user.id,
          email: session.user.email || null,
          isOwner: email === OWNER_EMAIL.toLowerCase(),
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase credentials are not configured in environment variables.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail !== OWNER_EMAIL.toLowerCase()) {
      return { error: 'Access denied. Only the store owner can log in.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || null,
          isOwner: true,
        });
      }
      return {};
    } catch (err: any) {
      return { error: err.message || 'An error occurred during sign in' };
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setIsPasswordRecovery(false);
  };

  const resetPassword = async (email: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase credentials are not configured in environment variables.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail !== OWNER_EMAIL.toLowerCase()) {
      return { error: 'Reset email is only allowed for the store owner email.' };
    }

    try {
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/admin` 
        : 'https://globalluxuryemporium.com/admin';

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        return { error: error.message };
      }
      return {};
    } catch (err: any) {
      return { error: err.message || 'An error occurred while sending password reset email' };
    }
  };

  const updatePassword = async (newPassword: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase credentials are not configured.' };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error: error.message };
      }
      setIsPasswordRecovery(false);
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to update password' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isPasswordRecovery,
        setIsPasswordRecovery,
        login,
        logout,
        resetPassword,
        updatePassword,
      }}
    >
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
