// hooks/useAuthDebug.js - Hook para debugging de autenticación
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useAuthDebug = () => {
  const authState = useAuth();
  
  useEffect(() => {
    console.log('🔍 AUTH DEBUG - Estado actualizado:', {
      isLoggedIn: authState.isLoggedIn,
      user: authState.user?.nombre || 'null',
      loading: authState.loading,
      initializing: authState.initializing,
      networkError: authState.networkError ? 'Si' : 'No',
      timestamp: new Date().toLocaleTimeString()
    });
  }, [
    authState.isLoggedIn, 
    authState.user, 
    authState.loading, 
    authState.initializing,
    authState.networkError
  ]);

  return authState;
};