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

  // Función para manejar los datos de la sesión y el perfil
  const handleSessionData = async (currentSession: Session | null) => {
    setSession(currentSession);
    setUser(currentSession?.user || null);

    let currentIsAdmin = false;
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

      setIsAdmin(currentIsAdmin);
      setFirstName(currentFirstName);
      setLastName(currentLastName);

      // Redirige a usuarios autenticados desde la página de login si son admin
      if (location.pathname === '/login' && currentIsAdmin) {
        console.log('SessionContextProvider: User is authenticated and admin on /login, redirecting to /admin/dashboard.');
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
    setIsLoading(false); // Establece isLoading en false después de que todas las comprobaciones estén hechas
  };

  useEffect(() => {
    // Comprobación inicial de la sesión al montar el componente
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('SessionContextProvider: Initial getSession check. Session:', initialSession);
      handleSessionData(initialSession);
    });

    // Escucha los cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log('SessionContextProvider: Auth state change event:', event, 'Session:', currentSession);
      // Para cambios posteriores, procesamos los datos de la sesión.
      // No volvemos a establecer isLoading en true aquí, ya que se maneja en la carga inicial.
      handleSessionData(currentSession);
    });

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