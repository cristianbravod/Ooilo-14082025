// navigation/SafeAreaProvider.js - CONFIGURACIÓN GLOBAL CORREGIDA COMPLETA
import React from 'react';
import { View, Platform, StatusBar } from 'react-native';

// ✅ IMPORTACIÓN SEGURA CON FALLBACK
let SafeAreaProvider, SafeAreaView, useSafeAreaInsets;
let SafeAreaContext;

try {
  SafeAreaContext = require('react-native-safe-area-context');
  SafeAreaProvider = SafeAreaContext.SafeAreaProvider;
  SafeAreaView = SafeAreaContext.SafeAreaView;
  useSafeAreaInsets = SafeAreaContext.useSafeAreaInsets;
  console.log('✅ SafeAreaContext cargado correctamente');
} catch (error) {
  console.log('⚠️ SafeAreaContext no disponible, usando componentes fallback');
  
  // Fallback components
  SafeAreaProvider = ({ children }) => <View style={{ flex: 1 }}>{children}</View>;
  SafeAreaView = View;
  useSafeAreaInsets = () => ({ 
    top: Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 24), 
    bottom: Platform.OS === 'ios' ? 34 : 0, 
    left: 0, 
    right: 0 
  });
}

// ✅ CONFIGURACIÓN UNIVERSAL DE SAFE AREA CORREGIDA
export class SafeAreaConfig {
  // ✅ DETECCIÓN DEL TIPO DE DISPOSITIVO
  static getDeviceType() {
    if (Platform.OS === 'ios') {
      return Platform.isPad ? 'tablet' : 'phone';
    }
    return 'android';
  }

  // ✅ ALTURA DE LA BARRA DE ESTADO CON VALIDACIÓN
  static getStatusBarHeight() {
    if (Platform.OS === 'ios') {
      // iOS maneja esto automáticamente
      return 0;
    }
    // ✅ VALIDACIÓN: Asegurar que es un número
    const height = StatusBar.currentHeight;
    return typeof height === 'number' ? height : 24;
  }

  // ✅ CONFIGURACIÓN DEL HEADER CON VALIDACIÓN
  static getHeaderConfig() {
    const deviceType = this.getDeviceType();
    
    return {
      headerStyle: {
        backgroundColor: '#fff',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      headerTitleStyle: {
        fontSize: deviceType === 'tablet' ? 20 : 18, // ✅ NÚMEROS VALIDADOS
        fontWeight: 'bold',
        color: '#333',
      },
      headerTintColor: '#333',
    };
  }

  // ✅ CONFIGURACIÓN DEL TAB BAR CON VALIDACIÓN DE INSETS
  static getTabBarConfig(insets = {}) {
    const isSmallDevice = Platform.OS === 'android' && Platform.Version < 29;
    
    // ✅ VALIDAR QUE insets.bottom ES NÚMERO
    const bottomInset = typeof insets.bottom === 'number' ? insets.bottom : 0;
    
    return {
      style: {
        paddingBottom: Platform.select({
          ios: Math.max(bottomInset, isSmallDevice ? 20 : 5), // ✅ VALIDADO
          android: isSmallDevice ? 20 : 5,
        }),
        height: Platform.select({
          ios: isSmallDevice ? 70 : 80,
          android: isSmallDevice ? 55 : 60,
        }),
        backgroundColor: '#fff',
        borderTopColor: '#e1e8ed',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      }
    };
  }

  // ✅ CONFIGURACIÓN DEL STATUS BAR
  static getStatusBarConfig() {
    return {
      barStyle: Platform.select({
        ios: "dark-content",
        android: "dark-content",
      }),
      backgroundColor: Platform.OS === 'android' ? "#fff" : undefined,
      translucent: false,
    };
  }

  // ✅ OBTENER PADDING SEGURO PARA BOTTOM
  static getBottomPadding(insets = {}) {
    const bottomInset = typeof insets.bottom === 'number' ? insets.bottom : 0;
    
    return Platform.select({
      ios: Math.max(bottomInset, 5),
      android: 5,
    });
  }

  // ✅ OBTENER PADDING SEGURO PARA TOP
  static getTopPadding(insets = {}) {
    const topInset = typeof insets.top === 'number' ? insets.top : 0;
    const statusBarHeight = this.getStatusBarHeight();
    
    return Platform.select({
      ios: topInset,
      android: statusBarHeight + topInset,
    });
  }
}

// ✅ HOOK PERSONALIZADO PARA USAR SAFE AREA CON VALIDACIÓN
export const useSafeAreaConfig = () => {
  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  
  try {
    if (useSafeAreaInsets) {
      const rawInsets = useSafeAreaInsets();
      
      // ✅ VALIDAR QUE TODOS LOS INSETS SON NÚMEROS
      insets = {
        top: typeof rawInsets.top === 'number' ? rawInsets.top : 0,
        bottom: typeof rawInsets.bottom === 'number' ? rawInsets.bottom : 0,
        left: typeof rawInsets.left === 'number' ? rawInsets.left : 0,
        right: typeof rawInsets.right === 'number' ? rawInsets.right : 0,
      };
    }
  } catch (error) {
    console.log('⚠️ Error usando useSafeAreaInsets, usando valores por defecto');
    
    // ✅ FALLBACK CON VALORES NUMÉRICOS VALIDADOS
    const statusBarHeight = SafeAreaConfig.getStatusBarHeight();
    insets = {
      top: Platform.OS === 'ios' ? 44 : statusBarHeight,
      bottom: Platform.OS === 'ios' ? 34 : 0,
      left: 0,
      right: 0,
    };
  }
  
  return {
    // Insets nativos del dispositivo (validados)
    ...insets,
    
    // Configuración calculada
    headerHeight: 60 + insets.top,
    statusBarHeight: SafeAreaConfig.getStatusBarHeight(),
    
    // Estilos preparados
    containerStyle: {
      flex: 1,
      paddingTop: insets.top,
      backgroundColor: '#f8f9fa',
    },
    
    headerStyle: {
      backgroundColor: '#fff',
      paddingTop: insets.top + 10,
      paddingBottom: 15,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#e1e8ed',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      zIndex: 1000,
    },
    
    // Para componentes internos que necesiten espacio seguro
    contentStyle: {
      flex: 1,
      backgroundColor: '#f8f9fa',
    },
    
    // ✅ FUNCIONES HELPER CON VALIDACIÓN
    getTopPadding: (extra = 10) => {
      const extraPadding = typeof extra === 'number' ? extra : 10;
      
      if (Platform.OS === 'android') {
        const statusBarHeight = SafeAreaConfig.getStatusBarHeight();
        return statusBarHeight + extraPadding;
      }
      return insets.top > 0 ? insets.top + extraPadding : 50;
    },
    
    getBottomPadding: (extra = 20) => {
      const extraPadding = typeof extra === 'number' ? extra : 20;
      return Math.max(insets.bottom, extraPadding);
    },
  };
};

// ✅ COMPONENTE WRAPPER UNIVERSAL
export const UniversalSafeAreaProvider = ({ children }) => {
  if (SafeAreaContext) {
    return (
      <SafeAreaProvider>
        {children}
      </SafeAreaProvider>
    );
  }
  
  // Fallback para cuando SafeAreaContext no está disponible
  return (
    <View style={{ flex: 1 }}>
      <StatusBar {...SafeAreaConfig.getStatusBarConfig()} />
      {children}
    </View>
  );
};

// ✅ COMPONENTE SAFE AREA VIEW UNIVERSAL
export const UniversalSafeAreaView = ({ children, style, ...props }) => {
  const safeAreaConfig = useSafeAreaConfig();
  
  if (SafeAreaContext) {
    return (
      <SafeAreaView style={[safeAreaConfig.containerStyle, style]} {...props}>
        {children}
      </SafeAreaView>
    );
  }
  
  // Fallback
  return (
    <View style={[
      safeAreaConfig.containerStyle, 
      style
    ]} {...props}>
      {children}
    </View>
  );
};

// ✅ EXPORTS
export {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets
};