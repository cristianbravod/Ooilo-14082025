// services/PermissionsService.js - SERVICIO COMPLETO DE PERMISOS
import React, { useEffect, useState, useCallback } from 'react';
import { 
  Alert, 
  Platform, 
  Linking, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  StyleSheet 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';


// ✅ SERVICIO GLOBAL DE PERMISOS
export class PermissionsService {
  static PERMISSIONS_KEY = 'app_permissions_status';
  static ONBOARDING_KEY = 'permissions_onboarding_completed';
  
  /**
   * Solicita todos los permisos necesarios para la app
   */
  static async requestAllPermissions() {
    try {
      console.log('🔐 Solicitando todos los permisos necesarios...');
      
      const results = {
        camera: false,
        mediaLibrary: false,
        timestamp: new Date().toISOString(),
      };

      // ✅ SOLICITAR PERMISOS DE GALERÍA
      try {
        const mediaLibraryResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        results.mediaLibrary = mediaLibraryResult.status === 'granted';
        console.log('📱 Permisos de galería:', results.mediaLibrary ? '✅ Otorgados' : '❌ Denegados');
        
        if (mediaLibraryResult.status === 'denied') {
          console.log('⚠️ Permisos de galería denegados por el usuario');
        }
      } catch (error) {
        console.warn('⚠️ Error solicitando permisos de galería:', error);
      }

      // ✅ SOLICITAR PERMISOS DE CÁMARA
      try {
        const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
        results.camera = cameraResult.status === 'granted';
        console.log('📸 Permisos de cámara:', results.camera ? '✅ Otorgados' : '❌ Denegados');
        
        if (cameraResult.status === 'denied') {
          console.log('⚠️ Permisos de cámara denegados por el usuario');
        }
      } catch (error) {
        console.warn('⚠️ Error solicitando permisos de cámara:', error);
      }

      // ✅ GUARDAR ESTADO DE PERMISOS
      await AsyncStorage.setItem(this.PERMISSIONS_KEY, JSON.stringify(results));
      console.log('💾 Estado de permisos guardado:', results);

      return results;
    } catch (error) {
      console.error('❌ Error solicitando permisos:', error);
      return {
        camera: false,
        mediaLibrary: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Verifica permisos actuales sin solicitarlos
   */
  static async checkExistingPermissions() {
    try {
      // ✅ VERIFICAR PERMISOS ACTUALES SIN SOLICITAR
      const mediaLibraryStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
      const cameraStatus = await ImagePicker.getCameraPermissionsAsync();

      const results = {
        camera: cameraStatus.status === 'granted',
        mediaLibrary: mediaLibraryStatus.status === 'granted',
        cameraStatus: cameraStatus.status,
        mediaLibraryStatus: mediaLibraryStatus.status,
        timestamp: new Date().toISOString(),
      };

      console.log('🔍 Estado actual de permisos:', results);
      return results;
    } catch (error) {
      console.error('❌ Error verificando permisos:', error);
      return {
        camera: false,
        mediaLibrary: false,
        cameraStatus: 'undetermined',
        mediaLibraryStatus: 'undetermined',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Obtiene permisos guardados en AsyncStorage
   */
  static async getStoredPermissions() {
    try {
      const stored = await AsyncStorage.getItem(this.PERMISSIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('📂 Permisos guardados encontrados:', parsed);
        return parsed;
      }
      console.log('📂 No hay permisos guardados previamente');
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo permisos guardados:', error);
      return null;
    }
  }

  /**
   * Marca el onboarding como completado
   */
  static async markOnboardingCompleted() {
    try {
      await AsyncStorage.setItem(this.ONBOARDING_KEY, 'true');
      console.log('✅ Onboarding marcado como completado');
    } catch (error) {
      console.error('❌ Error marcando onboarding como completado:', error);
    }
  }

  /**
   * Verifica si el onboarding ya fue completado
   */
  static async isOnboardingCompleted() {
    try {
      const completed = await AsyncStorage.getItem(this.ONBOARDING_KEY);
      return completed === 'true';
    } catch (error) {
      console.error('❌ Error verificando estado del onboarding:', error);
      return false;
    }
  }
}

// ✅ HOOK PARA MANEJAR PERMISOS EN COMPONENTES
export function useAppPermissions() {
  const [permissions, setPermissions] = useState({
    camera: false,
    mediaLibrary: false,
    loading: true,
    requested: false,
    lastChecked: null,
  });

  const requestPermissions = useCallback(async () => {
    setPermissions(prev => ({ ...prev, loading: true }));
    
    try {
      console.log('🔄 Solicitando permisos desde hook...');
      const results = await PermissionsService.requestAllPermissions();
      
      setPermissions({
        camera: results.camera,
        mediaLibrary: results.mediaLibrary,
        loading: false,
        requested: true,
        lastChecked: results.timestamp,
      });
      
      console.log('✅ Permisos actualizados en hook:', results);
      return results;
    } catch (error) {
      console.error('❌ Error en hook de permisos:', error);
      setPermissions(prev => ({ 
        ...prev, 
        loading: false,
        lastChecked: new Date().toISOString()
      }));
      return null;
    }
  }, []);

  const checkPermissions = useCallback(async () => {
    try {
      console.log('🔍 Verificando permisos desde hook...');
      const results = await PermissionsService.checkExistingPermissions();
      
      setPermissions(prev => ({
        ...prev,
        camera: results.camera,
        mediaLibrary: results.mediaLibrary,
        loading: false,
        lastChecked: results.timestamp,
      }));
      
      return results;
    } catch (error) {
      console.error('❌ Error verificando permisos en hook:', error);
      setPermissions(prev => ({ 
        ...prev, 
        loading: false,
        lastChecked: new Date().toISOString()
      }));
      return null;
    }
  }, []);

  // ✅ VERIFICAR PERMISOS AL CARGAR EL HOOK
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    permissions,
    requestPermissions,
    checkPermissions,
    hasAllPermissions: permissions.camera && permissions.mediaLibrary,
    hasMediaPermissions: permissions.mediaLibrary,
    hasCameraPermissions: permissions.camera,
    hasAnyPermissions: permissions.camera || permissions.mediaLibrary,
    isLoading: permissions.loading,
  };
}

// ✅ COMPONENTE DE ONBOARDING DE PERMISOS
export function PermissionsOnboarding({ onComplete }) {
  const [requesting, setRequesting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { 
    permissions, 
    requestPermissions, 
    hasAllPermissions, 
    hasAnyPermissions,
    isLoading 
  } = useAppPermissions();

  const steps = [
    {
      icon: 'camera',
      title: '📸 Acceso a Cámara',
      description: 'Para tomar fotos de tus platos y productos directamente desde la app',
      permission: 'camera',
      required: false,
    },
    {
      icon: 'images',
      title: '🖼️ Acceso a Galería',
      description: 'Para seleccionar imágenes existentes de tu galería',
      permission: 'mediaLibrary',
      required: false,
    },
  ];

  const handleRequestPermissions = async () => {
    setRequesting(true);
    try {
      console.log('🔄 Iniciando solicitud de permisos desde onboarding...');
      const results = await requestPermissions();
      
      if (results && (results.camera || results.mediaLibrary)) {
        Alert.alert(
          '✅ Permisos Configurados',
          `${results.camera && results.mediaLibrary ? 'Tienes acceso completo a cámara y galería' :
            results.camera ? 'Tienes acceso a la cámara' :
            'Tienes acceso a la galería'}. ¡Ya puedes usar todas las funciones de imagen!`,
          [{ text: 'Continuar', onPress: handleComplete }]
        );
      } else {
        Alert.alert(
          '⚠️ Permisos Limitados',
          'No se otorgaron permisos de imagen. Puedes usar la app, pero algunas funciones estarán limitadas. Puedes cambiar los permisos en cualquier momento desde Configuración.',
          [
            { text: 'Continuar Así', onPress: handleComplete },
            { 
              text: 'Ir a Configuración', 
              onPress: () => {
                Linking.openSettings();
                // Dar tiempo para que el usuario vuelva
                setTimeout(handleComplete, 1000);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error solicitando permisos en onboarding:', error);
      Alert.alert(
        'Error',
        'Hubo un problema solicitando permisos. Puedes configurarlos manualmente en Configuración del dispositivo.',
        [{ text: 'Continuar', onPress: handleComplete }]
      );
    } finally {
      setRequesting(false);
    }
  };

  const handleComplete = async () => {
    try {
      await PermissionsService.markOnboardingCompleted();
      console.log('✅ Onboarding completado, llamando onComplete');
      onComplete();
    } catch (error) {
      console.error('❌ Error completando onboarding:', error);
      onComplete(); // Continuar de todos modos
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Omitir Permisos',
      'Puedes configurar los permisos más tarde desde Configuración. Algunas funciones de imagen estarán limitadas.',
      [
        { text: 'Volver', style: 'cancel' },
        { text: 'Omitir', onPress: handleComplete }
      ]
    );
  };

  // Si ya tiene todos los permisos, completar automáticamente
  useEffect(() => {
    if (hasAllPermissions && !isLoading && !requesting) {
      console.log('✅ Usuario ya tiene todos los permisos, completando onboarding automáticamente');
      handleComplete();
    }
  }, [hasAllPermissions, isLoading, requesting]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={40} color="#007AFF" />
        <Text style={styles.loadingText}>Verificando permisos...</Text>
      </View>
    );
  }
  
  const resetearPermisos = async () => {
  try {
    Alert.alert(
      'Resetear Permisos',
      '¿Quieres volver a mostrar el onboarding de permisos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Resetear',
          onPress: async () => {
            try {
              // Eliminar el flag de onboarding completado
              await AsyncStorage.removeItem('permissions_onboarding_completed');
              
              // Eliminar permisos guardados
              await AsyncStorage.removeItem('app_permissions_status');
              
              Alert.alert(
                'Permisos Reseteados',
                'Reinicia la app para ver el onboarding de permisos nuevamente.',
                [
                  { 
                    text: 'OK', 
                    onPress: () => {
                      // Opcionalmente, puedes forzar un reload
                      console.log('🔄 Permisos reseteados. Reinicia la app.');
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('❌ Error reseteando permisos:', error);
              Alert.alert('Error', 'No se pudo resetear los permisos');
            }
          }
        }
      ]
    );
  } catch (error) {
    console.error('❌ Error en resetearPermisos:', error);
  }
};


  return (
    <View style={styles.onboardingContainer}>
      <View style={styles.onboardingContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.onboardingTitle}>🍽️ Configuración Inicial</Text>
          <Text style={styles.onboardingSubtitle}>
            Para una mejor experiencia con imágenes, la app necesita algunos permisos
          </Text>
        </View>

        <View style={styles.permissionsList}>
          {steps.map((step, index) => (
            <View key={index} style={styles.permissionItem}>
              <View style={styles.permissionIcon}>
                <Ionicons name={step.icon} size={24} color="#007AFF" />
              </View>
              <View style={styles.permissionContent}>
                <Text style={styles.permissionTitle}>{step.title}</Text>
                <Text style={styles.permissionDescription}>{step.description}</Text>
                <View style={styles.permissionStatus}>
                  {permissions[step.permission] ? (
                    <View style={styles.statusGranted}>
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                      <Text style={styles.statusGrantedText}>Otorgado</Text>
                    </View>
                  ) : (
                    <View style={styles.statusPending}>
                      <Ionicons name="time" size={16} color="#FF9800" />
                      <Text style={styles.statusPendingText}>Pendiente</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#007AFF" />
          <Text style={styles.infoText}>
            Los permisos son opcionales. Puedes usar la app sin ellos, pero no podrás agregar imágenes a tus productos.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              requesting && styles.buttonDisabled
            ]}
            onPress={handleRequestPermissions}
            disabled={requesting}
          >
            {requesting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={20} color="white" />
                <Text style={styles.primaryButtonText}>
                  {hasAnyPermissions ? 'Revisar Permisos' : 'Configurar Permisos'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSkip}
            disabled={requesting}
          >
            <Text style={styles.secondaryButtonText}>Omitir por ahora</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            Puedes cambiar estos permisos en cualquier momento desde Configuración
          </Text>
        </View>
		<View style={styles.debugContainer}>
  <TouchableOpacity
    style={styles.debugButton}
    onPress={resetearPermisos}
  >
    <Text style={styles.debugButtonText}>🔄 RESETEAR PERMISOS</Text>
  </TouchableOpacity>
  
  <Text style={styles.debugText}>
    Estado actual: Cámara {hasCameraPermissions ? '✅' : '❌'} | Galería {hasMediaPermissions ? '✅' : '❌'}
  </Text>
</View>
      </View>
    </View>
  );
}

// ✅ ESTILOS PARA EL ONBOARDING
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  onboardingContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  onboardingContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  onboardingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#333',
  },
  onboardingSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
  },
  permissionsList: {
    marginBottom: 24,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  permissionIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  permissionContent: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  permissionStatus: {
    alignSelf: 'flex-start',
  },
  statusGranted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusGrantedText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  statusPending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPendingText: {
    color: '#FF9800',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1565c0',
    lineHeight: 18,
    marginLeft: 8,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  footerContainer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
  debugContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    margin: 16,
    borderRadius: 8,
  },
  debugButton: {
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});