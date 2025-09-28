"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user || null);
      setIsLoading(false);

      if (currentSession?.user) {
        // Fetch user role from profiles table
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentSession.user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          setIsAdmin(false);
        } else if (profile && profile.role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }

        // Redirect authenticated users from login page
        if (location.pathname === '/login') {
          navigate('/admin/dashboard'); // Redirect to admin dashboard or a default page
        }
      } else {
        setIsAdmin(false);
        // Redirect unauthenticated users from protected routes
        if (location.pathname.startsWith('/admin')) {
          navigate('/login');
        }
      }
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user || null);
      setIsLoading(false);

      if (initialSession?.user) {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', initialSession.user.id)
          .single()
          .then(({ data: profile, error }) => {
            if (error) {
              console.error('Error fetching initial user profile:', error);
              setIsAdmin(false);
            } else if (profile && profile.role === 'admin') {
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
          });
      }
    });

    return () => subscription.unsubscribe();
  }, [location.pathname, navigate]);

  return (
    <SessionContext.Provider value={{ session, user, isAdmin, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};