"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  firstName: string | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start as true
  const navigate = useNavigate();
  const location = useLocation();

  // Function to fetch profile and set admin status
  const fetchUserProfile = useCallback(async (userId: string) => {
    console.log('SessionContextProvider: Fetching profile for user ID:', userId);
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, first_name')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('SessionContextProvider: Error fetching user profile:', error);
      setIsAdmin(false);
      setFirstName(null);
    } else if (profile) {
      console.log('SessionContextProvider: Fetched profile:', profile);
      setIsAdmin(profile.role === 'admin');
      setFirstName(profile.first_name || null);
    } else {
      console.log('SessionContextProvider: No profile found for user ID:', userId);
      setIsAdmin(false);
      setFirstName(null);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('SessionContextProvider: Auth state change event:', event, 'Session:', currentSession);
      setSession(currentSession);
      setUser(currentSession?.user || null);

      if (currentSession?.user) {
        await fetchUserProfile(currentSession.user.id); // Wait for profile to be fetched
        // Redirect authenticated users from login page
        if (location.pathname === '/login') {
          console.log('SessionContextProvider: User is authenticated and on /login, redirecting to /admin/dashboard.');
          navigate('/admin/dashboard');
        }
      } else {
        console.log('SessionContextProvider: User is NOT logged in.');
        setIsAdmin(false);
        setFirstName(null);
        // Redirect unauthenticated users from protected routes
        if (location.pathname.startsWith('/admin')) {
          console.log('SessionContextProvider: User is unauthenticated and on /admin route, redirecting to /login.');
          navigate('/login');
        }
      }
      setIsLoading(false); // Set loading to false only after all checks are done
    });

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      console.log('SessionContextProvider: Initial session check. Session:', initialSession);
      setSession(initialSession);
      setUser(initialSession?.user || null);

      if (initialSession?.user) {
        await fetchUserProfile(initialSession.user.id); // Wait for profile to be fetched
      }
      setIsLoading(false); // Set loading to false only after all checks are done
    });

    return () => subscription.unsubscribe();
  }, [location.pathname, navigate, fetchUserProfile]);

  return (
    <SessionContext.Provider value={{ session, user, isAdmin, firstName, isLoading }}>
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