// App.js - INTEGRADO CON SISTEMA DE PERMISOS GLOBALES
import React, { useState, useEffect } from 'react';
import { LogBox, Platform, StatusBar } from 'react-native';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ CONFIGURACIÓN DE WARNINGS
LogBox.ignoreLogs([
  'Warning: componentWillReceiveProps',
  'Warning: componentWillUpdate',
  'VirtualizedLists should never be nested',
  'Setting a timer for a long period',
  'Remote debugger is in a background tab',
  'fontFamily "ionicons" is not a system font', // ✅ Ignorar mientras se cargan
]);

// ✅ IMPORTACIONES PRINCIPALES
import { UniversalSafeAreaProvider } from './navigation/SafeAreaProvider';
import { AuthProvider } from './contexts/AuthContext';
import MainApp from './MainApp';
import LoadingScreen from './components/LoadingScreen';
import { PermissionsOnboarding, PermissionsService } from './services/PermissionsService';

// ✅ CONFIGURACIÓN GLOBAL DE STATUS BAR
const configureStatusBar = () => {
  if (Platform.OS === 'android') {
    StatusBar.setBackgroundColor('#ffffff', true);
    StatusBar.setBarStyle('dark-content', true);
    StatusBar.setTranslucent(false);
  }
};

// ✅ FUNCIÓN PARA CARGAR FUENTES
const loadAppFonts = async () => {
  try {
    console.log('🔤 Cargando fuentes de iconos...');
    
    await Font.loadAsync({
      ...Ionicons.font,
    });
    
    console.log('✅ Fuentes Ionicons cargadas exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error cargando fuentes Ionicons:', error);
    // No lanzar error, continuar con fuentes del sistema
    return false;
  }
};

// ✅ FUNCIÓN PARA VERIFICAR SI NECESITA ONBOARDING DE PERMISOS
const checkPermissionsOnboardingNeeded = async () => {
  try {
    // Verificar si ya se hizo el onboarding antes
    const onboardingCompleted = await AsyncStorage.getItem('permissions_onboarding_completed');
    if (onboardingCompleted === 'true') {
      console.log('✅ Onboarding de permisos ya completado anteriormente');
      return false;
    }

    // Verificar permisos actuales
    const currentPermissions = await PermissionsService.checkExistingPermissions();
    
    // Si ya tiene algunos permisos importantes, no mostrar onboarding
    if (currentPermissions.camera || currentPermissions.mediaLibrary) {
      console.log('✅ Usuario ya tiene permisos importantes, saltando onboarding');
      await AsyncStorage.setItem('permissions_onboarding_completed', 'true');
      return false;
    }

    console.log('⚠️ Necesario mostrar onboarding de permisos');
    return true;
  } catch (error) {
    console.error('❌ Error verificando necesidad de onboarding:', error);
    return true; // Por seguridad, mostrar onboarding si hay error
  }
};

export default function App() {
  // ✅ ESTADOS PARA MANEJO DE FUENTES
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontsError, setFontsError] = useState(false);
  
  // ✅ ESTADOS PARA MANEJO DE PERMISOS
  const [showPermissionsOnboarding, setShowPermissionsOnboarding] = useState(false);
  const [permissionsChecked, setPermissionsChecked] = useState(false);
  
  // ✅ ESTADO GENERAL DE LA APP
  const [appReady, setAppReady] = useState(false);

  // ✅ CONFIGURACIÓN INICIAL, CARGA DE FUENTES Y VERIFICACIÓN DE PERMISOS
  useEffect(() => {
    async function initializeApp() {
      console.log('🚀 Aplicación iniciando...');
      console.log('📱 Plataforma:', Platform.OS, Platform.Version);
      
      // Configurar StatusBar
      configureStatusBar();
      
      // Log de debug para desarrollo
      if (__DEV__) {
        console.log('🔧 Modo desarrollo activo');
        
        // Verificar dependencias críticas
        try {
          require('react-native-safe-area-context');
          console.log('✅ SafeAreaContext disponible');
        } catch (error) {
          console.log('⚠️ SafeAreaContext no disponible - usando fallback');
        }
        
        try {
          require('@react-navigation/native');
          console.log('✅ React Navigation disponible');
        } catch (error) {
          console.error('❌ React Navigation no disponible');
        }

        try {
          require('expo-font');
          console.log('✅ Expo Font disponible');
        } catch (error) {
          console.log('⚠️ Expo Font no disponible - usando fuentes del sistema');
        }

        try {
          require('expo-image-picker');
          console.log('✅ Expo Image Picker disponible');
        } catch (error) {
          console.log('⚠️ Expo Image Picker no disponible');
        }
      }

      // ✅ PASO 1: CARGAR FUENTES
      try {
        console.log('📝 Paso 1/3: Cargando fuentes...');
        const fontsSuccess = await loadAppFonts();
        setFontsLoaded(true);
        
        if (!fontsSuccess) {
          setFontsError(true);
          console.log('⚠️ Continuando con fuentes del sistema');
        }
      } catch (error) {
        console.error('❌ Error crítico cargando fuentes:', error);
        setFontsError(true);
        setFontsLoaded(true); // Continuar de todos modos
      }

      // ✅ PASO 2: VERIFICAR NECESIDAD DE ONBOARDING DE PERMISOS
      try {
        console.log('🔐 Paso 2/3: Verificando permisos...');
        const needsOnboarding = await checkPermissionsOnboardingNeeded();
        setShowPermissionsOnboarding(needsOnboarding);
        setPermissionsChecked(true);
        
        if (needsOnboarding) {
          console.log('📋 Se mostrará onboarding de permisos al usuario');
        } else {
          console.log('✅ Permisos ya configurados, continuando a la app');
        }
      } catch (error) {
        console.error('❌ Error verificando permisos:', error);
        setShowPermissionsOnboarding(false); // En caso de error, continuar sin onboarding
        setPermissionsChecked(true);
      }

      // ✅ PASO 3: FINALIZAR INICIALIZACIÓN
      console.log('🎯 Paso 3/3: Finalizando inicialización...');
      
      // Pequeña pausa para evitar flicker
      setTimeout(() => {
        setAppReady(true);
        console.log('✅ Aplicación lista para usar');
        
        // Log final de estado
        console.log('📊 Estado final de inicialización:', {
          fontsLoaded: true,
          fontsError,
          permissionsChecked: true,
          showPermissionsOnboarding,
          appReady: true
        });
      }, 150);
    }

    initializeApp();

    return () => {
      console.log('👋 Aplicación desmontando...');
    };
  }, []);

  // ✅ FUNCIÓN PARA COMPLETAR ONBOARDING DE PERMISOS
  const handlePermissionsOnboardingComplete = async () => {
    try {
      console.log('✅ Onboarding de permisos completado');
      
      // Marcar como completado
      await AsyncStorage.setItem('permissions_onboarding_completed', 'true');
      
      // Ocultar onboarding
      setShowPermissionsOnboarding(false);
      
      console.log('🎉 Usuario puede continuar a la aplicación principal');
    } catch (error) {
      console.error('❌ Error completando onboarding:', error);
      // Continuar de todos modos
      setShowPermissionsOnboarding(false);
    }
  };

  // ✅ CALCULAR PROGRESO DE INICIALIZACIÓN
  const getInitializationProgress = () => {
    let progress = 0;
    
    if (fontsLoaded) progress += 40;
    if (permissionsChecked) progress += 40;
    if (appReady) progress += 20;
    
    return progress;
  };

  // ✅ DETERMINAR MENSAJE DE LOADING
  const getLoadingMessage = () => {
    if (!fontsLoaded) return 'Cargando fuentes e iconos...';
    if (!permissionsChecked) return 'Verificando permisos...';
    if (!appReady) return 'Preparando aplicación...';
    return 'Iniciando...';
  };

  // ✅ MOSTRAR LOADING MIENTRAS SE INICIALIZA
  if (!fontsLoaded || !permissionsChecked || !appReady) {
    return (
      <UniversalSafeAreaProvider>
        <LoadingScreen 
          type="initialization" 
          message="Preparando aplicación..." 
          subtitle={getLoadingMessage()}
          useIcons={fontsLoaded && !fontsError} // ✅ Solo mostrar iconos si las fuentes están listas
          progress={getInitializationProgress()}
        />
      </UniversalSafeAreaProvider>
    );
  }

  // ✅ MOSTRAR ONBOARDING DE PERMISOS SI ES NECESARIO
  if (showPermissionsOnboarding) {
    return (
      <UniversalSafeAreaProvider>
        <PermissionsOnboarding 
          onComplete={handlePermissionsOnboardingComplete}
        />
      </UniversalSafeAreaProvider>
    );
  }

  // ✅ MOSTRAR WARNING SI HAY PROBLEMAS CON LAS FUENTES (SOLO EN DESARROLLO)
  if (fontsError && __DEV__) {
    console.warn('⚠️ Algunas fuentes no se cargaron correctamente. Los iconos pueden no mostrarse.');
  }

  // ✅ APLICACIÓN PRINCIPAL
  return (
    <UniversalSafeAreaProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </UniversalSafeAreaProvider>
  );
}