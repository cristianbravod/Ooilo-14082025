import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  ActivityIndicator, 
  Linking,
  Share,
  Image,
  RefreshControl
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/ApiService';

export default function GeneradorQR({ userRole = 'admin' }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [qrGenerado, setQrGenerado] = useState(null);
  const [estadisticas, setEstadisticas] = useState({});
  const [serverInfo, setServerInfo] = useState(null);
  const [qrImageUrl, setQrImageUrl] = useState(null);
  const [endpointDisponible, setEndpointDisponible] = useState(true);

  useEffect(() => {
    if (userRole === 'admin') {
      obtenerDatosIniciales();
    }
  }, [userRole]);

  // ✅ FUNCIÓN PARA CARGAR TODOS LOS DATOS INICIALES
  const obtenerDatosIniciales = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        obtenerEstadisticas(),
        obtenerInfoServidor()
      ]);
    } catch (error) {
      console.error('❌ Error cargando datos iniciales:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // ✅ FUNCIÓN MEJORADA PARA OBTENER ESTADÍSTICAS
  const obtenerEstadisticas = useCallback(async () => {
    try {
      console.log('📊 Obteniendo estadísticas reales del menú...');
      
      const [menu, categorias] = await Promise.all([
        ApiService.request('/menu'),
        ApiService.request('/categorias')
      ]);
      
      const stats = {
        totalItems: menu.length || 0,
        categorias: categorias.length || 0,
        ultimaActualizacion: new Date().toISOString(),
        productosDisponibles: menu.filter(item => item.disponible).length || 0
      };
      
      setEstadisticas(stats);
      setEndpointDisponible(true);
      console.log('✅ Estadísticas obtenidas:', stats);
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      setEndpointDisponible(false);
      
      // Fallback con datos por defecto
      setEstadisticas({
        totalItems: 0,
        categorias: 0,
        productosDisponibles: 0,
        ultimaActualizacion: new Date().toISOString(),
        error: 'No se pudo conectar al servidor'
      });
    }
  }, []);

  // ✅ FUNCIÓN MEJORADA PARA OBTENER INFO DEL SERVIDOR  
  const obtenerInfoServidor = useCallback(async () => {
    try {
      console.log('🌐 Obteniendo información del servidor...');
      const info = await ApiService.request('/qr/info');
      
      if (info.success) {
        setServerInfo(info);
        setEndpointDisponible(true);
        console.log('✅ Info del servidor obtenida:', info.menu_url);
      } else {
        throw new Error('Respuesta del servidor no válida');
      }
      
    } catch (error) {
      console.error('❌ Error obteniendo info del servidor:', error);
      setEndpointDisponible(false);
      
      // Fallback con URL por defecto
      setServerInfo({
        menu_url: `${ApiService.API_BASE_URL.replace('/api', '')}/menu`,
        success: false,
        error: 'Servidor no disponible',
        qr_endpoints: {
          generar_png: `${ApiService.API_BASE_URL}/qr/generar?formato=png`,
          generar_json: `${ApiService.API_BASE_URL}/qr/generar?formato=json`
        }
      });
    }
  }, []);

  // ✅ FUNCIÓN PRINCIPAL PARA GENERAR QR REAL DESDE EL BACKEND
  const generarQRRestaurante = useCallback(async () => {
    if (userRole !== 'admin') {
      Alert.alert('Acceso denegado', 'Solo los administradores pueden generar códigos QR');
      return;
    }

    try {
      setLoading(true);
      console.log('🔲 Generando QR real del menú desde backend...');
      
      if (!endpointDisponible) {
        throw new Error('Backend no disponible');
      }
      
      // ✅ USAR EL ENDPOINT QR REAL DEL BACKEND
      const qrResponse = await ApiService.request('/qr/generar?formato=json');
      
      if (qrResponse.success) {
        setQrGenerado(qrResponse);
        
        // Construir URL de la imagen QR desde el backend
        const baseUrl = ApiService.API_BASE_URL;
        const qrImageUrl = `${baseUrl}/qr/generar?formato=png&download=false&t=${Date.now()}`;
        setQrImageUrl(qrImageUrl);
        
        Alert.alert(
          '✅ QR Real Generado', 
          'El código QR del menú ha sido generado correctamente y es escaneable',
          [{ text: 'Ver QR', style: 'default' }]
        );
        
        console.log('✅ QR real generado:', qrResponse.menu_url);
      } else {
        throw new Error(qrResponse.message || 'No se pudo generar el QR desde el backend');
      }
      
    } catch (error) {
      console.error('❌ Error generando QR real:', error);
      
      // Fallback: crear QR con datos básicos (pero sin imagen real)
      const fallbackQR = await generarQRFallback();
      setQrGenerado(fallbackQR);
      
      Alert.alert(
        '⚠️ QR Generado (Modo Básico)', 
        'Se generó información del QR. Para obtener el código escaneable, verifica la conexión con el servidor.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, [userRole, endpointDisponible]);

  // ✅ FUNCIÓN FALLBACK PARA GENERAR QR BÁSICO
  const generarQRFallback = useCallback(async () => {
    const menuUrl = serverInfo?.menu_url || `${ApiService.API_BASE_URL.replace('/api', '')}/menu`;
    
    return {
      success: true,
      menu_url: menuUrl,
      qr_code: null, // No hay imagen en modo fallback
      mensaje: 'QR generado en modo básico',
      instrucciones: 'Usa la URL en un generador QR online para obtener el código escaneable',
      fallback: true
    };
  }, [serverInfo]);

  // ✅ FUNCIÓN PARA COMPARTIR QR
  const compartirQR = useCallback(async () => {
    if (!qrGenerado) {
      Alert.alert('Error', 'Primero genera un código QR');
      return;
    }

    try {
      const mensaje = `🍽️ Menú Digital del Restaurante\n\n` +
                     `Escanea este QR o visita:\n${qrGenerado.menu_url}\n\n` +
                     `📱 Generado desde la app de administración`;

      await Share.share({
        message: mensaje,
        url: qrGenerado.menu_url,
        title: 'Menú Digital - QR Code'
      });
      
    } catch (error) {
      console.error('❌ Error compartiendo QR:', error);
      Alert.alert('Error', 'No se pudo compartir el código QR');
    }
  }, [qrGenerado]);

  // ✅ FUNCIÓN PARA ABRIR MENÚ EN NAVEGADOR
  const abrirMenu = useCallback(async () => {
    const url = qrGenerado?.menu_url || serverInfo?.menu_url;
    
    if (!url) {
      Alert.alert('Error', 'URL del menú no disponible');
      return;
    }

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('❌ Error abriendo URL:', error);
      Alert.alert('Error', 'No se pudo abrir el menú en el navegador');
    }
  }, [qrGenerado, serverInfo]);

  // ✅ FUNCIÓN PARA DESCARGAR QR
  const descargarQR = useCallback(async () => {
    if (!endpointDisponible) {
      Alert.alert('Error', 'Backend no disponible para descargar QR');
      return;
    }

    try {
      const downloadUrl = `${ApiService.API_BASE_URL}/qr/generar?formato=png&download=true`;
      await Linking.openURL(downloadUrl);
    } catch (error) {
      console.error('❌ Error descargando QR:', error);
      Alert.alert('Error', 'No se pudo descargar el código QR');
    }
  }, [endpointDisponible]);

  // ✅ FUNCIÓN PARA PROBAR CONEXIÓN
  const probarConexion = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 Probando conexión con el backend...');
      
      const testResponse = await ApiService.request('/qr/test');
      
      if (testResponse.success) {
        setEndpointDisponible(true);
        Alert.alert('✅ Conexión OK', 'El backend está funcionando correctamente');
        await obtenerDatosIniciales();
      } else {
        throw new Error('Test del backend falló');
      }
      
    } catch (error) {
      console.error('❌ Error probando conexión:', error);
      setEndpointDisponible(false);
      Alert.alert('❌ Sin Conexión', 'No se pudo conectar con el backend del servidor');
    } finally {
      setLoading(false);
    }
  }, [obtenerDatosIniciales]);

  // ✅ RENDERIZADO PARA ACCESO DENEGADO
  if (userRole !== 'admin') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={[
          styles.accessDenied,
          { 
            paddingTop: Math.max(insets.top, 40),
            paddingBottom: Math.max(insets.bottom, 40)
          }
        ]}>
          <Ionicons name="lock-closed" size={64} color="#e74c3c" />
          <Text style={styles.accessDeniedText}>Acceso Restringido</Text>
          <Text style={styles.accessDeniedSubtext}>
            Solo los administradores pueden generar códigos QR
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContainer,
          { 
            paddingBottom: Math.max(insets.bottom, 40)
          }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={obtenerDatosIniciales}
            colors={['#4a6ee0']}
          />
        }
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="qr-code" size={32} color="#4a6ee0" />
          <Text style={styles.title}>Generador QR</Text>
          <Text style={styles.subtitle}>Menú Digital del Restaurante</Text>
          
          {/* Estado de conexión */}
          <View style={[styles.connectionStatus, !endpointDisponible && styles.connectionError]}>
            <Ionicons 
              name={endpointDisponible ? "checkmark-circle" : "alert-circle"} 
              size={16} 
              color={endpointDisponible ? "#27ae60" : "#e74c3c"} 
            />
            <Text style={[styles.connectionText, !endpointDisponible && styles.connectionErrorText]}>
              {endpointDisponible ? "Backend conectado" : "Backend desconectado"}
            </Text>
          </View>
        </View>

        {/* Estadísticas del menú */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>📊 Estadísticas del Menú</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{estadisticas.totalItems || 0}</Text>
              <Text style={styles.statLabel}>Total Items</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{estadisticas.productosDisponibles || 0}</Text>
              <Text style={styles.statLabel}>Disponibles</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{estadisticas.categorias || 0}</Text>
              <Text style={styles.statLabel}>Categorías</Text>
            </View>
          </View>
          {estadisticas.ultimaActualizacion && (
            <Text style={styles.lastUpdate}>
              Última actualización: {new Date(estadisticas.ultimaActualizacion).toLocaleString()}
            </Text>
          )}
        </View>

        {/* Botones de acción */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={generarQRRestaurante}
            disabled={loading}
          >
            <Ionicons name="qr-code" size={20} color="#fff" />
            <Text style={styles.buttonText}>  Generar QR del Menú</Text>
            {loading && <ActivityIndicator size="small" color="#fff" style={styles.loader} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={probarConexion}
            disabled={loading}
          >
            <Ionicons name="refresh" size={18} color="#4a6ee0" />
            <Text style={styles.secondaryButtonText}>  Probar Conexión</Text>
          </TouchableOpacity>
        </View>

        {/* Mostrar QR generado */}
        {qrGenerado && (
          <View style={styles.qrContainer}>
            <Text style={styles.qrTitle}>✅ Código QR Generado</Text>
            <Text style={styles.qrSubtitle}>
              {qrGenerado.fallback 
                ? "QR generado en modo básico - usa la URL para crear el código" 
                : "Código QR listo para usar"
              }
            </Text>

            {/* Mostrar imagen QR si está disponible */}
            {qrImageUrl && !qrGenerado.fallback && (
              <View style={styles.qrDisplay}>
                <Image 
                  source={{ uri: qrImageUrl }} 
                  style={styles.qrImage}
                  onError={() => {
                    console.log('❌ Error cargando imagen QR');
                    setQrImageUrl(null);
                  }}
                />
              </View>
            )}

            {/* Placeholder si no hay imagen */}
            {(!qrImageUrl || qrGenerado.fallback) && (
              <View style={styles.qrPlaceholder}>
                <Ionicons name="qr-code-outline" size={120} color="#bdc3c7" />
                <Text style={styles.placeholderText}>
                  {qrGenerado.fallback ? "Imagen no disponible" : "Generando imagen..."}
                </Text>
              </View>
            )}

            {/* URL del menú */}
            <View style={styles.urlContainer}>
              <Text style={styles.urlLabel}>🔗 URL del Menú:</Text>
              <Text style={styles.urlText}>{qrGenerado.menu_url}</Text>
            </View>

            {/* Botones de acción para QR */}
            <View style={styles.qrActions}>
              <TouchableOpacity style={styles.actionButton} onPress={compartirQR}>
                <Ionicons name="share" size={18} color="#4a6ee0" />
                <Text style={styles.actionButtonText}>Compartir</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={abrirMenu}>
                <Ionicons name="globe" size={18} color="#4a6ee0" />
                <Text style={styles.actionButtonText}>Ver Menú</Text>
              </TouchableOpacity>

              {!qrGenerado.fallback && (
                <TouchableOpacity style={styles.actionButton} onPress={descargarQR}>
                  <Ionicons name="download" size={18} color="#4a6ee0" />
                  <Text style={styles.actionButtonText}>Descargar</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Instrucciones */}
            <View style={styles.instructions}>
              <Text style={styles.instructionsTitle}>📱 Instrucciones:</Text>
              <Text style={styles.instructionsText}>
                {qrGenerado.fallback 
                  ? "• Copia la URL y pégala en un generador QR online\n• O comparte la URL directamente con los clientes"
                  : "• Los clientes pueden escanear este QR con su cámara\n• O visitar la URL directamente\n• El menú se actualiza automáticamente"
                }
              </Text>
            </View>
          </View>
        )}

        {/* Información del servidor */}
        {serverInfo && (
          <View style={styles.serverInfo}>
            <Text style={styles.serverTitle}>🌐 Información del Servidor</Text>
            <Text style={styles.serverText}>
              Host: {serverInfo.server_info?.host || 'No disponible'}
            </Text>
            <Text style={styles.serverText}>
              Estado: {serverInfo.success ? '✅ Conectado' : '❌ Desconectado'}
            </Text>
            {serverInfo.formatos_disponibles && (
              <Text style={styles.serverText}>
                Formatos: {serverInfo.formatos_disponibles.join(', ')}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  // Access Denied
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  accessDeniedText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginTop: 20,
    textAlign: 'center',
  },
  accessDeniedSubtext: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Scroll Container
  scrollContainer: {
    paddingBottom: 40,
  },

  // Header
  header: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 4,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e8f5e8',
    borderRadius: 20,
  },
  connectionError: {
    backgroundColor: '#ffeaea',
  },
  connectionText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '500',
  },
  connectionErrorText: {
    color: '#e74c3c',
  },

  // Stats
  statsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4a6ee0',
  },
  statLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
  },
  lastUpdate: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
    marginTop: 15,
  },

  // Actions
  actionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#4a6ee0',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#4a6ee0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderColor: '#4a6ee0',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#4a6ee0',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginLeft: 10,
  },

  // QR Container
  qrContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    margin: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: '#4a6ee0',
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  qrSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  qrDisplay: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  qrImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  qrPlaceholder: {
    alignItems: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: '#2c3e50',
    borderRadius: 10,
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  placeholderText: {
    marginTop: 10,
    color: '#7f8c8d',
    fontSize: 14,
  },

  // URL Container
  urlContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  urlLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  urlText: {
    fontSize: 12,
    color: '#4a6ee0',
    fontFamily: 'monospace',
  },

  // QR Actions
  qrActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
    padding: 10,
  },
  actionButtonText: {
    color: '#4a6ee0',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },

  // Instructions
  instructions: {
    backgroundColor: '#e8f4fd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#5a6c7d',
    lineHeight: 20,
  },

  // Server Info
  serverInfo: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  serverTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  serverText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});