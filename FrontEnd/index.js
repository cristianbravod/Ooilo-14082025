// index.js - VERSIÓN CON VERIFICACIÓN SAFE AREA
import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';

// ✅ VERIFICACIÓN DE ENTORNO
console.log('🎯 Restaurant App iniciando...');
console.log('📱 Platform:', Platform.OS, Platform.Version);
console.log('🔧 Environment:', __DEV__ ? 'Development' : 'Production');

// ✅ VERIFICACIÓN DE SAFE AREA CONTEXT
try {
  const SafeAreaContext = require('react-native-safe-area-context');
  console.log('✅ react-native-safe-area-context disponible');
  console.log('📦 SafeArea exports:', Object.keys(SafeAreaContext));
} catch (error) {
  console.error('❌ react-native-safe-area-context NO disponible:', error.message);
  console.error('🔧 Ejecuta: expo install react-native-safe-area-context');
}

// ✅ VERIFICACIÓN DE NAVIGATION
try {
  const Navigation = require('@react-navigation/native');
  console.log('✅ React Navigation disponible');
} catch (error) {
  console.error('❌ React Navigation error:', error.message);
}

// ✅ VERIFICACIÓN DE VECTOR ICONS
try {
  const VectorIcons = require('@expo/vector-icons');
  console.log('✅ Expo Vector Icons disponible');
} catch (error) {
  console.error('❌ Vector Icons error:', error.message);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);