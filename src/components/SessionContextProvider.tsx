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
  const [isLoading, setIsLoading] = useState<boolean>(true); // Inicia como true
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('SessionContextProvider: Auth state change event:', event, 'Session:', currentSession);
      setSession(currentSession);
      setUser(currentSession?.user || null);
      
      let currentIsAdmin = false; // Variable temporal para el estado de admin
      let currentFirstName: string | null = null;
      let currentLastName: string | null = null;

      if (currentSession?.user) {
        console.log('SessionContextProvider: User is logged in, fetching profile role and first name...');
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, first_name, last_name')
          .eq('id', currentSession.user.id)
          .single();

        if (error) {
          console.error('SessionContextProvider: Error fetching user profile:', error);
        } else if (profile) {
          console.log('SessionContextProvider: Profile fetched:', profile);
          currentIsAdmin = (profile.role === 'admin');
          currentFirstName = profile.first_name || null;
          currentLastName = profile.last_name || null;
        } else {
          console.log('SessionContextProvider: No profile found for user.');
        }

        // Actualiza los estados después de la obtención del perfil
        setIsAdmin(currentIsAdmin);
        setFirstName(currentFirstName);
        setLastName(currentLastName);

        // Redirige a usuarios autenticados desde la página de login
        if (location.pathname === '/login') {
          console.log('SessionContextProvider: User is authenticated and on /login, redirecting to /admin/dashboard.');
          navigate('/admin/dashboard');
        }
      } else {
        console.log('SessionContextProvider: User is NOT logged in.');
        setIsAdmin(false);
        setFirstName(null);
        setLastName(null);
        // Redirige a usuarios no autenticados desde rutas protegidas
        if (location.pathname.startsWith('/admin')) {
          console.log('SessionContextProvider: User is unauthenticated and on /admin route, redirecting to /login.');
          navigate('/login');
        }
      }
      // Establece isLoading en false solo después de que todas las comprobaciones y actualizaciones de estado estén hechas
      setIsLoading(false); 
    });

    // Limpia la suscripción al desmontar el componente
    return () => subscription.unsubscribe();
  }, [location.pathname, navigate]); // Dependencias para useEffect

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