// hooks/useSafeAreaStyle.js - Hook personalizado para estilos con SafeArea
import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const useSafeAreaStyle = () => {
  const insets = useSafeAreaInsets();
  
  return useMemo(() => ({
    // ✅ CONTENEDOR PRINCIPAL
    safeContainer: {
      paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 25 : 0),
      paddingBottom: Math.max(insets.bottom, 0),
      paddingLeft: Math.max(insets.left, 0),
      paddingRight: Math.max(insets.right, 0),
    },

    // ✅ HEADER CON SAFE AREA
    safeHeader: {
      paddingTop: Math.max(insets.top, 20),
      paddingLeft: Math.max(insets.left, 16),
      paddingRight: Math.max(insets.right, 16),
    },

    // ✅ CONTENIDO SIN HEADER
    safeContent: {
      paddingLeft: Math.max(insets.left, 0),
      paddingRight: Math.max(insets.right, 0),
      paddingBottom: Math.max(insets.bottom, 0),
    },

    // ✅ MODAL CON SAFE AREA
    safeModal: {
      paddingTop: Math.max(insets.top, 40),
      paddingBottom: Math.max(insets.bottom, 20),
      paddingLeft: Math.max(insets.left, 20),
      paddingRight: Math.max(insets.right, 20),
    },

    // ✅ TAB BAR
    safeTabBar: {
      paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 5),
      height: Math.max(insets.bottom, 0) + (Platform.OS === 'ios' ? 80 : 60),
    },

    // ✅ SOLO BOTTOM PARA LISTAS
    safeBottom: {
      paddingBottom: Math.max(insets.bottom, 20),
    },

    // ✅ VALORES RAW PARA USO DIRECTO
    insets: {
      top: insets.top,
      bottom: insets.bottom,
      left: insets.left,
      right: insets.right,
    },

    // ✅ HELPERS CONDICIONALES
    hasNotch: insets.top > 20,
    hasHomeIndicator: insets.bottom > 0,
    isLandscape: insets.left > 0 || insets.right > 0,

  }), [insets]);
};

// =============================================
// Ejemplo de uso del hook
// =============================================

// components/ExampleComponent.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaStyle } from '../hooks/useSafeAreaStyle';

export default function ExampleComponent() {
  const safeAreaStyle = useSafeAreaStyle();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* ✅ HEADER CON SAFE AREA */}
      <View style={[styles.header, safeAreaStyle.safeHeader]}>
        <Text style={styles.headerTitle}>Mi App</Text>
      </View>

      {/* ✅ CONTENIDO PRINCIPAL */}
      <View style={[styles.content, safeAreaStyle.safeContent]}>
        <Text>Contenido principal aquí</Text>
      </View>

      {/* ✅ INFORMACIÓN DE DEBUG (solo desarrollo) */}
      {__DEV__ && (
        <View style={styles.debug}>
          <Text>Top: {safeAreaStyle.insets.top}</Text>
          <Text>Bottom: {safeAreaStyle.insets.bottom}</Text>
          <Text>Has Notch: {safeAreaStyle.hasNotch ? 'Sí' : 'No'}</Text>
          <Text>Has Home Indicator: {safeAreaStyle.hasHomeIndicator ? 'Sí' : 'No'}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  debug: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
  },
});

// =============================================
// Hook para componentes específicos
// =============================================

// hooks/useHeaderSafeArea.js
import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const useHeaderSafeArea = (baseHeight = 60) => {
  const insets = useSafeAreaInsets();
  
  return useMemo(() => ({
    headerHeight: baseHeight + Math.max(insets.top, Platform.OS === 'android' ? 25 : 0),
    headerPaddingTop: Math.max(insets.top, Platform.OS === 'android' ? 25 : 20),
    statusBarHeight: insets.top,
    
    headerStyle: {
      height: baseHeight + Math.max(insets.top, Platform.OS === 'android' ? 25 : 0),
      paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 25 : 20),
      paddingLeft: Math.max(insets.left, 16),
      paddingRight: Math.max(insets.right, 16),
    }
  }), [insets, baseHeight]);
};

// hooks/useModalSafeArea.js
import { useMemo } from 'react';
import { Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const useModalSafeArea = () => {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = Dimensions.get('window');
  
  return useMemo(() => ({
    modalContainerStyle: {
      paddingTop: Math.max(insets.top, 40),
      paddingBottom: Math.max(insets.bottom, 20),
      paddingHorizontal: Math.max(insets.left, insets.right, 20),
    },
    
    fullScreenModalStyle: {
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    },
    
    centerModalStyle: {
      maxHeight: screenHeight - insets.top - insets.bottom - 100,
      marginTop: Math.max(insets.top, 50),
      marginBottom: Math.max(insets.bottom, 50),
      marginHorizontal: Math.max(insets.left, insets.right, 20),
    }
  }), [insets, screenHeight]);
};