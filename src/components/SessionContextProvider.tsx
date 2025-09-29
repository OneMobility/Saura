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

export const SessionContextProvider = ({ children }: { children: ReactNode }) => {
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

    if (error) {
      console.error('SessionContextProvider: Error fetching user profile:', error);
      setIsAdmin(false);
      setFirstName(null);
      setLastName(null);
    } else if (profile) {
      setIsAdmin(profile.role === 'admin');
      setFirstName(profile.first_name || null);
      setLastName(profile.last_name || null);
      console.log('SessionContextProvider: Profile fetched. IsAdmin:', profile.role === 'admin', 'Name:', profile.first_name, profile.last_name);
    } else {
      setIsAdmin(false);
      setFirstName(null);
      setLastName(null);
      console.log('SessionContextProvider: No profile found for user.');
    }
  };

  useEffect(() => {
    const handleAuthChange = async (event: string, currentSession: Session | null) => {
      console.log('SessionContextProvider: Auth state change event:', event, 'Session:', currentSession);
      setSession(currentSession);
      setUser(currentSession?.user || null);

      if (currentSession?.user) {
        await fetchUserProfile(currentSession.user);
        setIsLoading(false); // Set isLoading to false *after* profile is fetched and isAdmin is set

        // Redirect authenticated users from login page
        if (location.pathname === '/login') {
          console.log('SessionContextProvider: User is authenticated and on /login, redirecting to /admin/dashboard.');
          navigate('/admin/dashboard', { replace: true });
        }
      } else {
        console.log('SessionContextProvider: User is NOT logged in.');
        setIsAdmin(false);
        setFirstName(null);
        setLastName(null);
        setIsLoading(false); // Set isLoading to false here too

        // Redirect unauthenticated users from protected routes
        if (location.pathname.startsWith('/admin')) {
          console.log('SessionContextProvider: User is unauthenticated and on /admin route, redirecting to /login.');
          navigate('/login', { replace: true });
        }
      }
    };

    // Set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Initial session check on component mount
    const initialCheck = async () => {
      setIsLoading(true); // Ensure loading is true during initial check
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      console.log('SessionContextProvider: Initial session check. Session:', initialSession);
      setSession(initialSession);
      setUser(initialSession?.user || null);

      if (initialSession?.user) {
        await fetchUserProfile(initialSession.user);
        setIsLoading(false); // Set isLoading to false *after* profile is fetched and isAdmin is set

        // Redirect authenticated users from login page
        if (location.pathname === '/login') {
          console.log('SessionContextProvider: Initial check: User is authenticated and on /login, redirecting to /admin/dashboard.');
          navigate('/admin/dashboard', { replace: true });
        }
      } else {
        console.log('SessionContextProvider: Initial check: User is NOT logged in.');
        setIsAdmin(false);
        setFirstName(null);
        setLastName(null);
        setIsLoading(false); // Set isLoading to false here too

        // Redirect unauthenticated users from protected routes
        if (location.pathname.startsWith('/admin')) {
          console.log('SessionContextProvider: Initial check: User is unauthenticated and on /admin route, redirecting to /login.');
          navigate('/login', { replace: true });
        }
      }
    };

    initialCheck();

    return () => subscription.unsubscribe();
  }, [location.pathname, navigate]); // Dependencias del useEffect

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