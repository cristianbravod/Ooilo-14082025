// FrontEnd/components/GeneradorQR.js
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

  useEffect(() => {
    if (userRole === 'admin') {
      obtenerDatosIniciales();
    }
  }, [userRole, obtenerDatosIniciales]);

  const obtenerEstadisticas = useCallback(async () => {
    try {
      const [menu, categorias] = await Promise.all([
        ApiService.getMenu(),
        ApiService.getCategorias()
      ]);
      const stats = {
        totalItems: menu.length || 0,
        categorias: categorias.length || 0,
        ultimaActualizacion: new Date().toISOString(),
        productosDisponibles: menu.filter(item => item.disponible).length || 0
      };
      setEstadisticas(stats);
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      setEstadisticas({
        totalItems: 0,
        categorias: 0,
        productosDisponibles: 0,
        ultimaActualizacion: new Date().toISOString(),
        error: 'No se pudo conectar al servidor'
      });
    }
  }, []);
  
  const obtenerInfoServidor = useCallback(() => {
    try {
      const menuUrl = `${ApiService.API_BASE_URL.replace('/api', '')}/menu-publico`;
      const info = {
        success: true,
        menu_url: menuUrl,
      };
      setServerInfo(info);
    } catch (error) {
      console.error('❌ Error construyendo info del servidor:', error);
    }
  }, []);

  const generarQRRestaurante = useCallback(() => {
    if (userRole !== 'admin') {
      Alert.alert('Acceso denegado', 'Solo los administradores pueden generar códigos QR');
      return;
    }

    if (!serverInfo || !serverInfo.menu_url) {
      Alert.alert('Error', 'No se pudo obtener la URL del menú. Refresca la pantalla e intenta de nuevo.');
      return;
    }

    setLoading(true);
    const menuUrl = serverInfo.menu_url;
    console.log(`🔲 Generando QR para la URL: ${menuUrl}`);
    
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(menuUrl)}`;
    
    setQrImageUrl(qrApiUrl);
    setQrGenerado({
        success: true,
        menu_url: menuUrl,
    });
      
    Alert.alert(
      '✅ QR Generado', 
      'El código QR del menú ha sido generado y está listo para ser escaneado.',
      [{ text: 'OK' }]
    );
    setLoading(false);
  }, [userRole, serverInfo]);

  const compartirQR = useCallback(async () => {
    if (!qrGenerado || !qrGenerado.menu_url) return;
    try {
      await Share.share({
        message: `🍽️ Menú Digital del Restaurante:
${qrGenerado.menu_url}`,
        url: qrGenerado.menu_url,
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo compartir el código QR');
    }
  }, [qrGenerado]);

  const abrirMenu = useCallback(async () => {
    const url = qrGenerado?.menu_url || serverInfo?.menu_url;
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir el menú en el navegador');
    }
  }, [qrGenerado, serverInfo]);

  if (userRole !== 'admin') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={64} color="#e74c3c" />
          <Text style={styles.accessDeniedText}>Acceso Restringido</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={obtenerDatosIniciales} />}
      >
        <View style={styles.header}>
          <Ionicons name="qr-code" size={32} color="#4a6ee0" />
          <Text style={styles.title}>Generador QR</Text>
          <Text style={styles.subtitle}>Menú Digital del Restaurante</Text>
        </View>

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
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={generarQRRestaurante}
            disabled={loading}
          >
            <Ionicons name="qr-code" size={20} color="#fff" />
            <Text style={styles.buttonText}>  Generar QR del Menú</Text>
            {loading && <ActivityIndicator size="small" color="#fff" style={{marginLeft: 10}} />}
          </TouchableOpacity>
        </View>

        {qrGenerado && (
          <View style={styles.qrContainer}>
            <Text style={styles.qrTitle}>✅ Código QR Generado</Text>
            {qrImageUrl && (
              <View style={styles.qrDisplay}>
                <Image source={{ uri: qrImageUrl }} style={styles.qrImage} />
              </View>
            )}
            <View style={styles.urlContainer}>
              <Text style={styles.urlLabel}>🔗 URL del Menú:</Text>
              <Text style={styles.urlText} selectable>{qrGenerado.menu_url}</Text>
            </View>
            <View style={styles.qrActions}>
              <TouchableOpacity style={styles.actionButton} onPress={compartirQR}>
                <Ionicons name="share" size={18} color="#4a6ee0" />
                <Text style={styles.actionButtonText}>Compartir</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={abrirMenu}>
                <Ionicons name="globe" size={18} color="#4a6ee0" />
                <Text style={styles.actionButtonText}>Ver Menú</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  accessDenied: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  accessDeniedText: { fontSize: 24, fontWeight: 'bold', color: '#e74c3c', marginTop: 20, textAlign: 'center' },
  scrollContainer: { paddingBottom: 40 },
  header: { backgroundColor: '#fff', padding: 24, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ecf0f1' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', marginTop: 12 },
  subtitle: { fontSize: 16, color: '#7f8c8d', marginTop: 4 },
  statsContainer: { backgroundColor: '#fff', margin: 16, padding: 20, borderRadius: 12 },
  statsTitle: { fontSize: 20, fontWeight: '600', color: '#2c3e50', marginBottom: 20 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 32, fontWeight: 'bold', color: '#4a6ee0' },
  statLabel: { fontSize: 14, color: '#7f8c8d', marginTop: 5 },
  actionsContainer: { paddingHorizontal: 16, marginBottom: 16 },
  primaryButton: { backgroundColor: '#4a6ee0', borderRadius: 12, padding: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  qrContainer: { backgroundColor: '#fff', borderRadius: 15, padding: 25, margin: 16, alignItems: 'center' },
  qrTitle: { fontSize: 20, fontWeight: '700', color: '#2c3e50', marginBottom: 10 },
  qrDisplay: { alignItems: 'center', marginBottom: 20, padding: 10, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ecf0f1' },
  qrImage: { width: 200, height: 200 },
  urlContainer: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 8, marginBottom: 20, width: '100%' },
  urlLabel: { fontSize: 14, fontWeight: '600', color: '#2c3e50', marginBottom: 5 },
  urlText: { fontSize: 12, color: '#4a6ee0' },
  qrActions: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  actionButton: { alignItems: 'center', padding: 10 },
  actionButtonText: { color: '#4a6ee0', fontSize: 12, marginTop: 4, fontWeight: '500' },
});
