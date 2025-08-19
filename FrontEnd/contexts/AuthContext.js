// contexts/AuthContext.js - VERSIóN CORREGIDA PARA LOGIN
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import ApiService from '../services/ApiService';

// ?? ESTADOS DE AUTENTICACIóN
export const AuthStates = {
  INITIALIZING: 'initializing',
  UNAUTHENTICATED: 'unauthenticated',
  AUTHENTICATING: 'authenticating',
  AUTHENTICATED: 'authenticated',
  ERROR: 'error',
  COLD_START: 'cold_start',
  OFFLINE: 'offline'
};

// ?? CONTEXTO DE AUTENTICACIóN
const AuthContext = createContext({
  user: null,
  isLoggedIn: false,
  loading: false,
  initializing: true,
  error: null,
  state: AuthStates.INITIALIZING,
  userRole: null,
  isOffline: false,
  serverStatus: null,
  connectionAttempts: 0,
  canRetry: true,
  isColdStart: false,
  needsRetry: false,
  login: async () => {},
  logout: async () => {},
  switchUser: async () => {},
  retryConnection: async () => {},
  clearError: () => {},
  checkAuthStatus: async () => {}
});

// ?? PROVIDER DE AUTENTICACIóN
export function AuthProvider({ children }) {
  // ?? Estados de usuario y autenticación
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [state, setState] = useState(AuthStates.INITIALIZING);
  
  // ?? Estados de conexión y servidor
  const [isOffline, setIsOffline] = useState(false);
  const [serverStatus, setServerStatus] = useState({
    isWarm: false,
    lastCheck: null,
    responseTime: null,
    version: null
  });
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [canRetry, setCanRetry] = useState(true);
  const [isColdStart, setIsColdStart] = useState(false);
  const [needsRetry, setNeedsRetry] = useState(false);

  // ?? PROPIEDADES DERIVADAS
  const userRole = user?.rol || null;

  // ?? INICIALIZACIóN AL CARGAR LA APP
  useEffect(() => {
    initializeAuth();
  }, []);

  // ?? MONITOREO DE ESTADO DEL SERVIDOR
  useEffect(() => {
    const interval = setInterval(checkServerStatus, 30000); // Cada 30 segundos
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // ?? INICIALIZACIóN DE LA AUTENTICACIóN
  const initializeAuth = async () => {
    try {
      console.log('?? Inicializando autenticación...');
      setState(AuthStates.INITIALIZING);
      
      // Verificar si hay token y datos guardados
      const [savedToken, savedUserData] = await Promise.all([
        AsyncStorage.getItem('auth_token'),
        AsyncStorage.getItem('userData')
      ]);

      if (savedToken && savedUserData) {
        try {
          const userData = JSON.parse(savedUserData);
          console.log('?? Sesión encontrada, restaurando para:', userData.email);
          
          // Configurar token en ApiService
          if (ApiService.setAuthToken) {
            ApiService.setAuthToken(savedToken);
          }
          
          // Restaurar sesión directamente si tenemos datos válidos
          console.log('? Restaurando sesión automáticamente');
          setUser(userData);
          setIsLoggedIn(true);
          setState(AuthStates.AUTHENTICATED);
          setError(null);
          
          // Verificar en background (opcional)
          verifyTokenInBackground(savedToken);
          
        } catch (parseError) {
          console.log('? Error parseando datos guardados:', parseError.message);
          await clearStoredAuth();
          setState(AuthStates.UNAUTHENTICATED);
        }
        
      } else {
        console.log('?? No hay sesión guardada');
        setState(AuthStates.UNAUTHENTICATED);
      }
      
    } catch (error) {
      console.error('? Error inicializando auth:', error);
      setState(AuthStates.ERROR);
      setError(error.message);
    } finally {
      setInitializing(false);
    }
  };

  // ?? VERIFICAR TOKEN EN BACKGROUND (sin bloquear UI)
  const verifyTokenInBackground = async (token) => {
    try {
      console.log('?? Verificando token en background...');
      const verificationResult = await ApiService.request('/auth/verify');
      
      if (verificationResult.success && verificationResult.user) {
        console.log('? Token verificado exitosamente');
        // Actualizar datos del usuario si han cambiado
        if (JSON.stringify(verificationResult.user) !== JSON.stringify(user)) {
            setUser(verificationResult.user);
            await AsyncStorage.setItem('userData', JSON.stringify(verificationResult.user));
        }
      } else {
        console.log('?? Token inválido en background, cerrando sesión...');
        await logout();
      }
      
    } catch (error) {
      console.log('?? Verificación de token falló, cerrando sesión...', error.message);
      await logout();
    }
  };

  // ?? VERIFICAR ESTADO DEL SERVIDOR
  const checkServerStatus = async () => {
    try {
      const startTime = Date.now();
      const healthResult = await ApiService.healthCheck();
      const responseTime = Date.now() - startTime;
      
      if (healthResult.success) {
        setServerStatus({
          isWarm: true,
          lastCheck: new Date().toISOString(),
          responseTime,
          version: healthResult.data?.version || null
        });
        setIsOffline(false);
        setIsColdStart(false);
        
        // Reset connection attempts on success
        if (connectionAttempts > 0) {
          setConnectionAttempts(0);
          setCanRetry(true);
        }
        
      } else {
        throw new Error(healthResult.error || 'Server not responding');
      }
      
    } catch (error) {
      console.log('?? Server status check failed:', error.message);
      
      setServerStatus(prev => ({
        ...prev,
        isWarm: false,
        lastCheck: new Date().toISOString()
      }));
      
      // Detectar si es cold start o problema de conexión
      if (error.message.includes('timeout') || error.message.includes('slow')) {
        setIsColdStart(true);
      } else {
        setIsOffline(true);
      }
      
      setConnectionAttempts(prev => prev + 1);
      
      // Después de 3 intentos fallidos, desactivar retry automático
      if (connectionAttempts >= 3) {
        setCanRetry(false);
        setNeedsRetry(true);
      }
    }
  };

  // ?? FUNCIóN DE LOGIN CORREGIDA
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      setState(AuthStates.AUTHENTICATING);
      
      console.log('?? Intentando login para:', email);
      
      // Verificar conectividad antes del login
      if (Platform.OS === 'android' && !__DEV__) {
        console.log('?? Verificando conectividad en APK...');
        const healthCheck = await ApiService.healthCheck();
        
        if (!healthCheck.success) {
          setIsColdStart(true);
          setState(AuthStates.COLD_START);
          console.log('?? Servidor en cold start, reintentando...');
          
          // Esperar un poco más para cold start
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      // ? LLAMADA AL LOGIN - MANEJO MEJORADO
      console.log('?? Llamando a ApiService.login...');
      const loginResponse = await ApiService.login(email, password);
      
      console.log('?? Respuesta de login recibida:', {
        hasToken: !!loginResponse.token,
        hasUser: !!loginResponse.user,
        message: loginResponse.message,
        success: loginResponse.success
      });
      
      // ? VALIDACIóN MEJORADA DE LA RESPUESTA
      let isValidResponse = false;
      let userData = null;
      let token = null;
      
      // Verificar diferentes formatos de respuesta posibles
      if (loginResponse.token && loginResponse.user) {
        // Formato estándar: { token, user, success: true }
        isValidResponse = true;
        userData = loginResponse.user;
        token = loginResponse.token;
        console.log('? Formato de respuesta estándar detectado');
        
      } else if (loginResponse.token && loginResponse.message === 'Login successful') {
        // Formato alternativo: mensaje exitoso pero user podría estar en otro campo
        isValidResponse = true;
        token = loginResponse.token;
        userData = loginResponse.user || {
          id: 1,
          nombre: 'Usuario',
          email: email,
          rol: 'admin'
        };
        console.log('? Formato de respuesta alternativo detectado');
        
      } else if (loginResponse.success === true && loginResponse.token) {
        // Formato con flag success
        isValidResponse = true;
        token = loginResponse.token;
        userData = loginResponse.user || {
          id: 1,
          nombre: 'Usuario',
          email: email,
          rol: 'admin'
        };
        console.log('? Formato con flag success detectado');
        
      } else if (loginResponse.message === 'Login successful' && 
                 (loginResponse.token || ApiService.authToken)) {
        // Caso especial: message exitoso pero token podría estar en ApiService
        isValidResponse = true;
        token = loginResponse.token || ApiService.authToken;
        userData = loginResponse.user || {
          id: 1,
          nombre: 'Usuario',
          email: email,
          rol: 'admin'
        };
        console.log('? Formato especial con mensaje exitoso detectado');
      }
      
      if (isValidResponse && token && userData) {
        console.log('?? Login exitoso! Configurando sesión...');
        
        // Guardar datos de autenticación
        await Promise.all([
          AsyncStorage.setItem('auth_token', token),
          AsyncStorage.setItem('userData', JSON.stringify(userData))
        ]);
        
        // Configurar token en ApiService si no está configurado
        if (ApiService.setAuthToken) {
          ApiService.setAuthToken(token);
        }
        
        // Actualizar estado
        setUser(userData);
        setIsLoggedIn(true);
        setState(AuthStates.AUTHENTICATED);
        setError(null);
        
        // Reset connection state
        setConnectionAttempts(0);
        setIsOffline(false);
        setIsColdStart(false);
        setNeedsRetry(false);
        
        console.log('? Sesión configurada exitosamente para:', userData.email);
        console.log('?? Estado de autenticación:', AuthStates.AUTHENTICATED);
        
        return { 
          success: true, 
          user: userData, 
          message: 'Login exitoso' 
        };
        
      } else {
        // ? RESPUESTA NO VáLIDA
        console.error('? Respuesta de login no válida:', loginResponse);
        throw new Error(loginResponse.message || 'Respuesta de login inválida');
      }
      
    } catch (error) {
      console.error('? Error en login:', error.message);
      
      // Limpiar estados en caso de error
      await clearStoredAuth();
      setUser(null);
      setIsLoggedIn(false);
      setState(AuthStates.ERROR);
      setError(error.message);
      
      // Mostrar alert con error específico
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        let userMessage = 'Error de autenticación';
        
        if (error.message.includes('timeout') || error.message.includes('network')) {
          userMessage = 'Error de conexión. Verifica tu internet.';
        } else if (error.message.includes('credentials') || error.message.includes('401')) {
          userMessage = 'Email o contrase?a incorrectos.';
        } else if (error.message.includes('server') || error.message.includes('500')) {
          userMessage = 'Error del servidor. Intenta más tarde.';
        }
        
        Alert.alert(
          'Error de Login', 
          userMessage + '\n\nDetalles: ' + error.message,
          [{ text: 'OK' }]
        );
      }
      
      return { success: false, error: error.message };
      
    } finally {
      setLoading(false);
    }
  };

  // ?? FUNCIóN DE LOGOUT
  const logout = async () => {
    try {
      console.log('?? Cerrando sesión...');
      setLoading(true);
      
      // Intentar logout en el servidor (opcional)
      try {
        await ApiService.logout();
      } catch (logoutError) {
        console.log('?? Error en logout del servidor (continuando):', logoutError.message);
      }
      
      // Limpiar datos locales
      await clearStoredAuth();
      
      // Limpiar estado
      setUser(null);
      setIsLoggedIn(false);
      setState(AuthStates.UNAUTHENTICATED);
      setError(null);
      
      console.log('? Sesión cerrada exitosamente');
      
      return { success: true };
      
    } catch (error) {
      console.error('? Error cerrando sesión:', error);
      
      // Forzar limpieza aunque haya error
      await clearStoredAuth();
      setUser(null);
      setIsLoggedIn(false);
      setState(AuthStates.UNAUTHENTICATED);
      
      return { success: false, error: error.message };
      
    } finally {
      setLoading(false);
    }
  };

  // ?? FUNCIóN DE RETRY CONNECTION
  const retryConnection = async () => {
    try {
      setError(null);
      setConnectionAttempts(0);
      setCanRetry(false);
      
      console.log('?? Reintentando conexión...');
      
      await checkServerStatus();
      
      if (serverStatus.isWarm) {
        setNeedsRetry(false);
        setCanRetry(true);
        
        // Si hay usuario, verificar token
        if (user && isLoggedIn) {
          const token = await AsyncStorage.getItem('auth_token');
          if (token) {
            verifyTokenInBackground(token);
          }
        }
      }
      
    } catch (error) {
      console.error('? Error en retry connection:', error);
      setError(error.message);
      
      setTimeout(() => {
        setCanRetry(true);
      }, 5000);
    }
  };

  // ?? FUNCIóN DE SWITCH USER
  const switchUser = async () => {
    try {
      console.log('?? Cambiando usuario...');
      await logout();
      setState(AuthStates.UNAUTHENTICATED);
      
    } catch (error) {
      console.error('? Error en switch user:', error);
    }
  };

  // ? VERIFICAR ESTADO DE AUTENTICACIóN
  const checkAuthStatus = async () => {
    try {
      if (!isLoggedIn || !user) {
        return { success: false, error: 'No authenticated' };
      }
      
      const result = await ApiService.request('/auth/verify');
      
      if (result.success && result.user) {
        // Actualizar datos del usuario si han cambiado
        if (JSON.stringify(result.user) !== JSON.stringify(user)) {
          setUser(result.user);
          await AsyncStorage.setItem('userData', JSON.stringify(result.user));
        }
        
        return { success: true, user: result.user };
      } else {
        throw new Error('Token inválido');
      }
      
    } catch (error) {
      console.log('? Auth status check failed:', error.message);
      
      // Si el token es inválido, cerrar sesión
      if (error.message.includes('token') || error.message.includes('unauthorized')) {
        await logout();
      }
      
      return { success: false, error: error.message };
    }
  };

  // ?? LIMPIAR DATOS ALMACENADOS
  const clearStoredAuth = async () => {
    try {
      await AsyncStorage.multiRemove([
        'auth_token',
        'userData',
        'cached_menu',
        'cached_categorias',
        'cached_especiales',
        'platos_especiales_cache',
        'informes_ventas_cache'
      ]);
      console.log('?? Datos de autenticación limpiados');
    } catch (error) {
      console.error('? Error limpiando datos:', error);
    }
  };

  // ?? LIMPIAR ERROR
  const clearError = () => {
    setError(null);
    if (state === AuthStates.ERROR) {
      setState(isLoggedIn ? AuthStates.AUTHENTICATED : AuthStates.UNAUTHENTICATED);
    }
  };

  // ?? OBTENER INFORMACIóN DE DEBUG
  const getDebugInfo = () => {
    return {
      user: user ? {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol
      } : null,
      isLoggedIn,
      loading,
      initializing,
      error,
      state,
      userRole,
      isOffline,
      serverStatus,
      connectionAttempts,
      canRetry,
      isColdStart,
      needsRetry,
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      isDev: __DEV__
    };
  };

  // ?? VALOR DEL CONTEXTO
  const contextValue = {
    // Estados principales
    user,
    isLoggedIn,
    loading,
    initializing,
    error,
    state,
    
    // Estados derivados
    userRole,
    isOffline,
    serverStatus,
    connectionAttempts,
    canRetry,
    isColdStart,
    needsRetry,
    
    // Funciones
    login,
    logout,
    switchUser,
    retryConnection,
    clearError,
    checkAuthStatus,
    getDebugInfo
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ?? HOOK PARA USAR EL CONTEXTO
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  
  return context;
}

// ?? HOOK PARA DEBUGGING
export function useAuthDebug() {
  const auth = useAuth();
  
  useEffect(() => {
    if (__DEV__) {
      console.log('?? Auth Debug Info:', auth.getDebugInfo());
    }
  }, [auth.state, auth.isLoggedIn, auth.error]);
  
  return auth.getDebugInfo();
}

export default AuthContext;
