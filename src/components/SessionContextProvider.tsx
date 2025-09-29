"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  firstName: string | null;
  lastName: string | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider = ({ children }: { ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Function to fetch user profile and set admin status/names
  const fetchUserProfile = async (currentUser: User) => {
    console.log('SessionContextProvider: Fetching profile for user:', currentUser.id);
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, first_name, last_name')
      .eq('id', currentUser.id)
      .single();

    console.log('SessionContextProvider: Supabase query raw result:', { data: profile, error: error }); // Nuevo log aquí

    if (error && error.code !== 'PGRST116') { // PGRST116 means "no rows found"
      console.error('SessionContextProvider: Error fetching user profile:', error);
      setIsAdmin(false);
      setFirstName(null);
      setLastName(null);
    } else if (profile) {
      console.log('SessionContextProvider: Raw profile data:', profile);
      setIsAdmin(profile.role === 'admin');
      setFirstName(profile.first_name || null);
      setLastName(profile.last_name || null);
      console.log('SessionContextProvider: Profile fetched. IsAdmin:', profile.role === 'admin', 'Name:', profile.first_name, profile.last_name);
    } else {
      // This block is hit if no profile is found (error.code === 'PGRST116' or data is null)
      console.log('SessionContextProvider: No profile found for user ID:', currentUser.id, 'Error:', error);
      setIsAdmin(false);
      setFirstName(null);
      setLastName(null);
      console.log('SessionContextProvider: No profile found for user. Setting IsAdmin to false.');
    }
  };

  useEffect(() => {
    const handleAuthChange = async (event: string, currentSession: Session | null) => {
      console.log('SessionContextProvider: Auth state change event:', event, 'Session:', currentSession);
      setSession(currentSession);
      setUser(currentSession?.user || null);

      if (currentSession?.user) {
        await fetchUserProfile(currentSession.user);
        setIsLoading(false);

        if (location.pathname === '/login') {
          console.log('SessionContextProvider: User is authenticated and on /login, redirecting to /admin/dashboard.');
          navigate('/admin/dashboard', { replace: true });
        }
      } else {
        console.log('SessionContextProvider: User is NOT logged in.');
        setIsAdmin(false);
        setFirstName(null);
        setLastName(null);
        setIsLoading(false);

        if (location.pathname.startsWith('/admin')) {
          console.log('SessionContextProvider: User is unauthenticated and on /admin route, redirecting to /login.');
          navigate('/login', { replace: true });
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    const initialCheck = async () => {
      setIsLoading(true);
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      console.log('SessionContextProvider: Initial session check. Session:', initialSession);
      setSession(initialSession);
      setUser(initialSession?.user || null);

      if (initialSession?.user) {
        await fetchUserProfile(initialSession.user);
        setIsLoading(false);

        if (location.pathname === '/login') {
          console.log('SessionContextProvider: Initial check: User is authenticated and on /login, redirecting to /admin/dashboard.');
          navigate('/admin/dashboard', { replace: true });
        }
      } else {
        console.log('SessionContextProvider: Initial check: User is NOT logged in.');
        setIsAdmin(false);
        setFirstName(null);
        setLastName(null);
        setIsLoading(false);

        if (location.pathname.startsWith('/admin')) {
          console.log('SessionContextProvider: Initial check: User is unauthenticated and on /admin route, redirecting to /login.');
          navigate('/login', { replace: true });
        }
      }
    };

    initialCheck();

    return () => subscription.unsubscribe();
  }, [location.pathname, navigate]);

  return (
    <SessionContext.Provider value={{ session, user, isAdmin, firstName, lastName, isLoading }}>
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