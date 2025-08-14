// utils/SafeAreaConfig.js - CONFIGURACIÓN UNIVERSAL COMPLETA CORREGIDA
import { Platform, StatusBar, Dimensions } from 'react-native';

export class SafeAreaConfig {
  // ✅ OBTENER ALTURA DE STATUS BAR CON VALIDACIÓN
  static getStatusBarHeight() {
    if (Platform.OS === 'ios') {
      // En iOS, SafeAreaView maneja esto automáticamente
      return 0;
    } else {
      // En Android, necesitamos calcular la altura del StatusBar
      const height = StatusBar.currentHeight;
      // ✅ VALIDACIÓN: Asegurar que es un número
      return typeof height === 'number' && height > 0 ? height : 25;
    }
  }

  // ✅ DETECCIÓN DEL TIPO DE DISPOSITIVO
  static getDeviceType() {
    if (Platform.OS === 'ios') {
      return Platform.isPad ? 'tablet' : 'phone';
    }
    return 'android';
  }

  // ✅ OBTENER PADDING DE HEADER CON VALORES NUMÉRICOS VALIDADOS
  static getHeaderPadding() {
    const statusBarHeight = this.getStatusBarHeight();
    
    return {
      paddingTop: Platform.select({
        ios: 10, // SafeAreaView ya maneja el notch
        android: statusBarHeight + 10, // StatusBar + padding extra
      }),
      paddingBottom: 15,
      paddingHorizontal: 20,
    };
  }

  // ✅ OBTENER ESTILO DE CONTENEDOR CON VALIDACIÓN
  static getContainerStyle() {
    const statusBarHeight = this.getStatusBarHeight();
    
    return {
      flex: 1,
      backgroundColor: '#f8f9fa',
      // En Android, empezar desde abajo del StatusBar
      paddingTop: Platform.OS === 'android' ? statusBarHeight : 0,
    };
  }

  // ✅ OBTENER ESTILO DE HEADER CON PADDING VALIDADO
  static getHeaderStyle() {
    const headerPadding = this.getHeaderPadding();
    
    return {
      backgroundColor: '#fff',
      ...headerPadding,
      borderBottomWidth: 1,
      borderBottomColor: '#e1e8ed',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      zIndex: 1000,
    };
  }

  // ✅ OBTENER ESTILO DE TAB BAR CON CÁLCULOS VALIDADOS
  static getTabBarStyle(insets = {}) {
    const { height } = Dimensions.get('window');
    
    // ✅ VALIDACIÓN: Asegurar que height es un número
    const screenHeight = typeof height === 'number' && height > 0 ? height : 800;
    const isSmallDevice = screenHeight < 700;
    
    // ✅ VALIDACIÓN: Asegurar que insets.bottom es un número
    const bottomInset = typeof insets.bottom === 'number' ? Math.max(insets.bottom, 0) : 0;
    
    return {
      backgroundColor: '#fff',
      borderTopColor: '#e1e8ed',
      borderTopWidth: 1,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      height: Platform.select({
        ios: isSmallDevice ? 70 : 80,
        android: isSmallDevice ? 55 : 60,
      }),
      paddingBottom: Platform.select({
        ios: Math.max(bottomInset, 5), // ✅ VALIDADO: Solo usar valores numéricos
        android: 5,
      }),
      paddingTop: 5,
    };
  }

  // ✅ CONFIGURACIÓN DE STATUS BAR VALIDADA
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

  // ✅ OBTENER CONFIGURACIÓN DE HEADER PARA NAVEGACIÓN
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

  // ✅ CONFIGURACIÓN DEL TAB BAR PARA NAVEGACIÓN
  static getTabBarConfig(insets = {}) {
    const { height } = Dimensions.get('window');
    const screenHeight = typeof height === 'number' ? height : 800;
    const isSmallDevice = screenHeight < 700;
    const bottomInset = typeof insets.bottom === 'number' ? Math.max(insets.bottom, 0) : 0;
    
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

  // ✅ UTILIDADES PARA VALIDACIÓN DE VALORES
  static validateNumericValue(value, fallback = 0, context = 'unknown') {
    if (typeof value === 'number' && !isNaN(value) && value >= 0) {
      return value;
    }
    
    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
      const numValue = parseFloat(value);
      if (numValue >= 0) {
        return numValue;
      }
    }
    
    if (value !== fallback) { // Solo mostrar warning si no es el fallback
      console.warn(`⚠️ SafeAreaConfig: Valor no numérico en ${context}: ${value}, usando fallback: ${fallback}`);
    }
    return fallback;
  }

  // ✅ OBTENER PADDING SEGURO PARA BOTTOM
  static getBottomPadding(insets = {}, extra = 5) {
    const bottomInset = this.validateNumericValue(insets.bottom, 0, 'bottom inset');
    const extraPadding = this.validateNumericValue(extra, 5, 'extra bottom padding');
    
    return Platform.select({
      ios: Math.max(bottomInset, extraPadding),
      android: extraPadding,
    });
  }

  // ✅ OBTENER PADDING SEGURO PARA TOP
  static getTopPadding(insets = {}, extra = 0) {
    const topInset = this.validateNumericValue(insets.top, 0, 'top inset');
    const extraPadding = this.validateNumericValue(extra, 0, 'extra top padding');
    const statusBarHeight = this.getStatusBarHeight();
    
    return Platform.select({
      ios: topInset + extraPadding,
      android: statusBarHeight + extraPadding,
    });
  }

  // ✅ OBTENER DIMENSIONES SEGURAS DE PANTALLA
  static getScreenDimensions() {
    const { width, height } = Dimensions.get('window');
    
    return {
      width: this.validateNumericValue(width, 375, 'screen width'),
      height: this.validateNumericValue(height, 667, 'screen height'),
      isSmallScreen: height < 700,
      isTablet: width > 768,
    };
  }

  // ✅ OBTENER CONFIGURACIÓN COMPLETA PARA UN COMPONENTE
  static getComponentConfig(componentType = 'default', insets = {}) {
    const screenDimensions = this.getScreenDimensions();
    const safeInsets = {
      top: this.validateNumericValue(insets.top, 0, 'component top inset'),
      bottom: this.validateNumericValue(insets.bottom, 0, 'component bottom inset'),
      left: this.validateNumericValue(insets.left, 0, 'component left inset'),
      right: this.validateNumericValue(insets.right, 0, 'component right inset'),
    };

    const configs = {
      header: {
        paddingTop: this.getTopPadding(safeInsets, 10),
        paddingBottom: 15,
        paddingHorizontal: 20,
        minHeight: 60,
      },
      content: {
        paddingTop: 0,
        paddingBottom: this.getBottomPadding(safeInsets, 0),
        paddingHorizontal: Math.max(safeInsets.left, safeInsets.right, 16),
      },
      modal: {
        paddingTop: this.getTopPadding(safeInsets, 20),
        paddingBottom: this.getBottomPadding(safeInsets, 20),
        paddingHorizontal: Math.max(safeInsets.left, safeInsets.right, 20),
      },
      tabBar: {
        height: screenDimensions.isSmallScreen ? 60 : 70,
        paddingBottom: this.getBottomPadding(safeInsets, 5),
        paddingTop: 5,
      }
    };

    return configs[componentType] || configs.content;
  }

  // ✅ VALIDAR CONFIGURACIÓN COMPLETA
  static validateConfiguration() {
    const validations = [
      {
        name: 'StatusBar Height',
        value: this.getStatusBarHeight(),
        test: (val) => typeof val === 'number' && val >= 0,
      },
      {
        name: 'Screen Dimensions',
        value: this.getScreenDimensions(),
        test: (val) => val.width > 0 && val.height > 0,
      },
      {
        name: 'Header Config',
        value: this.getHeaderConfig(),
        test: (val) => typeof val.headerTitleStyle.fontSize === 'number',
      }
    ];

    const results = validations.map(validation => ({
      ...validation,
      passed: validation.test(validation.value),
    }));

    const allPassed = results.every(result => result.passed);
    
    if (!allPassed) {
      console.warn('⚠️ SafeAreaConfig validation failed:', results.filter(r => !r.passed));
    }

    return {
      valid: allPassed,
      results,
    };
  }

  // ✅ DEBUG: IMPRIMIR CONFIGURACIÓN ACTUAL
  static debugConfiguration(insets = {}) {
    if (!__DEV__) return;

    console.log('🔧 SafeAreaConfig Debug Info:');
    console.log('📱 Platform:', Platform.OS, Platform.Version);
    console.log('📐 StatusBar Height:', this.getStatusBarHeight());
    console.log('📏 Screen Dimensions:', this.getScreenDimensions());
    console.log('🛡️ Safe Insets:', {
      top: this.validateNumericValue(insets.top, 0),
      bottom: this.validateNumericValue(insets.bottom, 0),
      left: this.validateNumericValue(insets.left, 0),
      right: this.validateNumericValue(insets.right, 0),
    });
    console.log('⚙️ Tab Bar Style:', this.getTabBarStyle(insets));
    console.log('✅ Configuration Valid:', this.validateConfiguration().valid);
  }
}