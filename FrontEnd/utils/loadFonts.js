// /utils/loadFonts.js
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

export async function loadFonts() {
  try {
    await Font.loadAsync({
      ...Ionicons.font,
    });
    console.log('✅ Fuentes cargadas exitosamente');
  } catch (error) {
    console.error('❌ Error cargando fuentes:', error);
    throw error;
  }
}
