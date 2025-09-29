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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('SessionContextProvider: Auth state change event:', event, 'Session:', currentSession);
      setSession(currentSession);
      setUser(currentSession?.user || null);
      setIsLoading(false);

      if (currentSession?.user) {
        console.log('SessionContextProvider: User is logged in, fetching profile role and first name...');
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, first_name, last_name')
          .eq('id', currentSession.user.id)
          .single();

        if (error) {
          console.error('SessionContextProvider: Error fetching user profile:', error);
          setIsAdmin(false);
          setFirstName(null);
          setLastName(null);
        } else if (profile) {
          console.log('SessionContextProvider: Profile fetched:', profile);
          if (profile.role === 'admin') {
            console.log('SessionContextProvider: User is admin.');
            setIsAdmin(true);
          } else {
            console.log('SessionContextProvider: User is NOT admin (role:', profile?.role || 'undefined', ').');
            setIsAdmin(false);
          }
          setFirstName(profile.first_name || null);
          setLastName(profile.last_name || null);
        } else {
          console.log('SessionContextProvider: No profile found for user.');
          setIsAdmin(false);
          setFirstName(null);
          setLastName(null);
        }

        // Redirect authenticated users from login page
        if (location.pathname === '/login') {
          console.log('SessionContextProvider: User is authenticated and on /login, redirecting to /admin/dashboard.');
          navigate('/admin/dashboard');
        }
      } else {
        console.log('SessionContextProvider: User is NOT logged in.');
        setIsAdmin(false);
        setFirstName(null);
        setLastName(null);
        // Redirect unauthenticated users from protected routes
        if (location.pathname.startsWith('/admin')) {
          console.log('SessionContextProvider: User is unauthenticated and on /admin route, redirecting to /login.');
          navigate('/login');
        }
      }
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('SessionContextProvider: Initial session check. Session:', initialSession);
      setSession(initialSession);
      setUser(initialSession?.user || null);
      setIsLoading(false);

      if (initialSession?.user) {
        console.log('SessionContextProvider: Initial check: User is logged in, fetching profile role and first name...');
        supabase
          .from('profiles')
          .select('role, first_name, last_name')
          .eq('id', initialSession.user.id)
          .single()
          .then(({ data: profile, error }) => {
            if (error) {
              console.error('SessionContextProvider: Initial check: Error fetching user profile:', error);
              setIsAdmin(false);
              setFirstName(null);
              setLastName(null);
            } else if (profile) {
              console.log('SessionContextProvider: Initial check: Profile fetched:', profile);
              if (profile.role === 'admin') {
                console.log('SessionContextProvider: Initial check: User is admin.');
                setIsAdmin(true);
              } else {
                console.log('SessionContextProvider: Initial check: User is NOT admin (role:', profile?.role || 'undefined', ').');
                setIsAdmin(false);
              }
              setFirstName(profile.first_name || null);
              setLastName(profile.last_name || null);
            } else {
              console.log('SessionContextProvider: Initial check: No profile found for user.');
              setIsAdmin(false);
              setFirstName(null);
              setLastName(null);
            }
          });
      }
    });

    return () => subscription.unsubscribe();
  }, [location.pathname, navigate]);

  // NEW: Effect to log out admin users when they navigate away from admin paths
  useEffect(() => {
    // This effect runs when location.pathname, user, isAdmin, or isLoading changes.
    // Its purpose is to enforce that admin users are logged out if they are not on an admin path.
    console.log('SessionContextProvider (Logout Effect): Checking conditions for logout...');
    console.log('  isLoading:', isLoading, 'user:', !!user, 'isAdmin:', isAdmin, 'location.pathname:', location.pathname);

    if (!isLoading && user && isAdmin) {
      const currentPathIsAdmin = location.pathname.startsWith('/admin');
      console.log('  User is admin and loaded. Current path is admin:', currentPathIsAdmin);

      if (!currentPathIsAdmin) {
        console.log('  Admin user detected on non-admin path. Signing out...');
        supabase.auth.signOut();
        // No need to navigate here, onAuthStateChange will handle the redirect to /login
        // once the session becomes null.
      }
    } else if (!isLoading && !user && location.pathname.startsWith('/admin')) {
      // If not loading, no user, but on an admin path, redirect to login.
      // This handles cases where the session might have expired or been cleared externally.
      console.log('  No user detected on admin path. Redirecting to /login.');
      navigate('/login');
    }
  }, [location.pathname, isLoading, user, isAdmin, navigate]);

  console.log('SessionContextProvider: Current state - isLoading:', isLoading, 'user:', !!user, 'isAdmin:', isAdmin, 'firstName:', firstName, 'lastName:', lastName);

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