// screens/GestionMesas.js - Gestión completa de mesas y posiciones de PickUp
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  StatusBar,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ IMPORTACIÓN SEGURA DE SAFE AREA
let useSafeAreaInsets;
try {
  const SafeAreaContext = require('react-native-safe-area-context');
  useSafeAreaInsets = SafeAreaContext.useSafeAreaInsets;
} catch (error) {
  console.log('⚠️ SafeAreaContext no disponible, usando fallback');
  useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 });
}

import ApiService from '../services/ApiService';
import { useAuth } from '../contexts/AuthContext';

export default function GestionMesas() {
  const { user, userRole } = useAuth();
  
  // ✅ USO SEGURO DE SAFE AREA
  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    if (useSafeAreaInsets) {
      insets = useSafeAreaInsets();
    }
  } catch (error) {
    console.log('⚠️ Error usando useSafeAreaInsets, usando valores por defecto');
  }

  // ==========================================
  // ESTADOS PRINCIPALES
  // ==========================================
  const [mesas, setMesas] = useState([]);
  const [estadisticas, setEstadisticas] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  
  // Estados para modal de agregar/editar
  const [modalVisible, setModalVisible] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    numero: '',
    capacidad: '',
    ubicacion: '',
    tipo: 'mesa',
    descripcion: ''
  });

  // Estados de filtros y vistas
  const [filtroTipo, setFiltroTipo] = useState('todos'); // todos, mesa, pickup, barra
  const [vistaActual, setVistaActual] = useState('grid'); // grid, lista

  // ==========================================
  // EFECTOS Y CARGAS INICIALES
  // ==========================================
  useEffect(() => {
    cargarDatos();
  }, []);

  // ==========================================
  // FUNCIONES DE CARGA DE DATOS
  // ==========================================
  const cargarDatos = async () => {
    try {
      setLoading(true);
      setSyncStatus('Cargando configuración de mesas...');
      
      const [mesasData, estadisticasData] = await Promise.all([
        ApiService.getMesas(),
        ApiService.getEstadisticasMesas()
      ]);
      
      setMesas(mesasData);
      setEstadisticas(estadisticasData);
      setSyncStatus('✅ Configuración cargada');
      
      console.log('✅ Datos de mesas cargados:', mesasData.length, 'posiciones');
      
    } catch (error) {
      console.error('❌ Error cargando datos de mesas:', error);
      setSyncStatus('❌ Error cargando datos');
      Alert.alert('Error', 'No se pudieron cargar las mesas');
    } finally {
      setLoading(false);
      setTimeout(() => setSyncStatus(''), 3000);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  }, []);

  // ==========================================
  // FUNCIONES DE GESTIÓN DE MESAS
  // ==========================================
  const abrirModalAgregar = (tipo = 'mesa') => {
    setModoEdicion(false);
    setMesaSeleccionada(null);
    setFormData({
      nombre: '',
      numero: '',
      capacidad: tipo === 'pickup' ? '1' : '4',
      ubicacion: tipo === 'pickup' ? 'Mostrador' : 'Interior',
      tipo: tipo,
      descripcion: ''
    });
    setModalVisible(true);
  };

  const abrirModalEditar = (mesa) => {
    setModoEdicion(true);
    setMesaSeleccionada(mesa);
    setFormData({
      nombre: mesa.nombre || '',
      numero: mesa.numero?.toString() || '',
      capacidad: mesa.capacidad?.toString() || '',
      ubicacion: mesa.ubicacion || '',
      tipo: mesa.tipo || 'mesa',
      descripcion: mesa.descripcion || ''
    });
    setModalVisible(true);
  };

  const guardarMesa = async () => {
    try {
      // Validaciones del frontend
      const { nombre, numero, capacidad, tipo } = formData;
      if (!nombre.trim()) {
        Alert.alert('Error', 'El nombre de la mesa es obligatorio.');
        return;
      }
      if (!numero.toString().trim()) {
        Alert.alert('Error', 'El número de mesa es obligatorio.');
        return;
      }
      const capacidadNum = parseInt(capacidad);
      if (isNaN(capacidadNum) || capacidadNum <= 0) {
        Alert.alert('Error', 'La capacidad debe ser un número mayor a 0.');
        return;
      }

      setLoading(true);
      setSyncStatus(modoEdicion ? 'Actualizando mesa...' : 'Creando mesa...');

      const mesaData = {
        ...formData,
        capacidad: parseInt(formData.capacidad),
        numero: formData.tipo === 'pickup' ? formData.numero : parseInt(formData.numero)
      };

      let resultado;
      if (modoEdicion) {
        resultado = await ApiService.updateMesa(mesaSeleccionada.id, mesaData);
      } else {
        resultado = await ApiService.createMesa(mesaData);
      }

      // Recargar datos
      await cargarDatos();
      
      setModalVisible(false);
      setSyncStatus(modoEdicion ? '✅ Mesa actualizada' : '✅ Mesa creada');
      
      Alert.alert(
        'Éxito', 
        modoEdicion ? 'Mesa actualizada correctamente' : 'Mesa creada correctamente'
      );

    } catch (error) {
      console.error('❌ Error guardando mesa:', error);
      setSyncStatus('❌ Error guardando mesa');
      let errorMessage = 'No se pudo guardar la mesa. Intente de nuevo.';
      if (error.message && error.message.includes('409')) {
        try {
          const errorBody = JSON.parse(error.message.substring(error.message.indexOf('{')));
          errorMessage = errorBody.error || 'Ya existe una mesa con ese número y tipo.';
        } catch (e) {
          errorMessage = 'Ya existe una mesa con ese número y tipo.';
        }
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setTimeout(() => setSyncStatus(''), 3000);
    }
  };

  const eliminarMesa = (mesa) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de eliminar "${mesa.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              setSyncStatus('Eliminando mesa...');
              
              await ApiService.deleteMesa(mesa.id);
              await cargarDatos();
              
              setSyncStatus('✅ Mesa eliminada');
              Alert.alert('Éxito', 'Mesa eliminada correctamente');
              
            } catch (error) {
              console.error('❌ Error eliminando mesa:', error);
              setSyncStatus('❌ Error eliminando mesa');
              Alert.alert('Error', 'No se pudo eliminar la mesa');
            } finally {
              setLoading(false);
              setTimeout(() => setSyncStatus(''), 3000);
            }
          }
        }
      ]
    );
  };

  const cambiarEstadoMesa = async (mesa, nuevoEstado) => {
    try {
      setLoading(true);
      setSyncStatus('Cambiando estado...');
      
      await ApiService.cambiarEstadoMesa(mesa.id, nuevoEstado);
      await cargarDatos();
      
      setSyncStatus('✅ Estado actualizado');
      
    } catch (error) {
      console.error('❌ Error cambiando estado:', error);
      setSyncStatus('❌ Error cambiando estado');
      Alert.alert('Error', 'No se pudo cambiar el estado');
    } finally {
      setLoading(false);
      setTimeout(() => setSyncStatus(''), 3000);
    }
  };

  // ==========================================
  // FUNCIONES DE UTILIDAD
  // ==========================================
  const obtenerMesasFiltradas = () => {
    if (filtroTipo === 'todos') return mesas;
    return mesas.filter(mesa => mesa.tipo === filtroTipo);
  };

  const obtenerColorEstado = (estado) => {
    switch (estado) {
      case 'disponible': return '#4CAF50';
      case 'ocupada': return '#FF9800';
      case 'limpieza': return '#2196F3';
      case 'fuera_servicio': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const obtenerIconoTipo = (tipo) => {
    switch (tipo) {
      case 'pickup': return 'bag-outline';
      case 'barra': return 'wine-outline';
      case 'mesa': 
      default: return 'restaurant-outline';
    }
  };

  const resetearConfiguracion = () => {
    Alert.alert(
      'Resetear configuración',
      '¿Estás seguro de resetear toda la configuración de mesas a los valores predeterminados? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Resetear', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              setSyncStatus('Reseteando configuración...');
              
              await ApiService.resetearConfiguracionMesas();
              await cargarDatos();
              
              setSyncStatus('✅ Configuración reseteada');
              Alert.alert('Éxito', 'Configuración reseteada correctamente');
              
            } catch (error) {
              console.error('❌ Error reseteando:', error);
              setSyncStatus('❌ Error reseteando');
              Alert.alert('Error', 'No se pudo resetear la configuración');
            } finally {
              setLoading(false);
              setTimeout(() => setSyncStatus(''), 3000);
            }
          }
        }
      ]
    );
  };

  // ==========================================
  // RENDERIZADO
  // ==========================================
  const renderEstadisticas = () => (
    <View style={styles.estadisticasContainer}>
      <Text style={styles.estadisticasTitle}>📊 Resumen</Text>
      <View style={styles.estadisticasGrid}>
        <View style={styles.estadisticasCard}>
          <Text style={styles.estadisticasNumero}>{estadisticas.total || 0}</Text>
          <Text style={styles.estadisticasLabel}>Total</Text>
        </View>
        <View style={styles.estadisticasCard}>
          <Text style={styles.estadisticasNumero}>{estadisticas.mesas || 0}</Text>
          <Text style={styles.estadisticasLabel}>Mesas</Text>
        </View>
        <View style={styles.estadisticasCard}>
          <Text style={styles.estadisticasNumero}>{estadisticas.pickup || 0}</Text>
          <Text style={styles.estadisticasLabel}>PickUp</Text>
        </View>
        <View style={styles.estadisticasCard}>
          <Text style={styles.estadisticasNumero}>{estadisticas.disponibles || 0}</Text>
          <Text style={styles.estadisticasLabel}>Disponibles</Text>
        </View>
      </View>
    </View>
  );

  const renderFiltros = () => (
    <View style={styles.filtrosContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {[
          { key: 'todos', label: 'Todos', icon: 'apps-outline' },
          { key: 'mesa', label: 'Mesas', icon: 'restaurant-outline' },
          { key: 'pickup', label: 'PickUp', icon: 'bag-outline' },
          { key: 'barra', label: 'Barra', icon: 'wine-outline' }
        ].map(filtro => (
          <TouchableOpacity
            key={filtro.key}
            style={[
              styles.filtroBoton,
              filtroTipo === filtro.key && styles.filtroBotonActivo
            ]}
            onPress={() => setFiltroTipo(filtro.key)}
          >
            <Ionicons 
              name={filtro.icon} 
              size={16} 
              color={filtroTipo === filtro.key ? '#fff' : '#666'} 
            />
            <Text style={[
              styles.filtroTexto,
              filtroTipo === filtro.key && styles.filtroTextoActivo
            ]}>
              {filtro.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderMesaCard = (mesa) => (
    <View key={mesa.id} style={styles.mesaCard}>
      <View style={styles.mesaHeader}>
        <View style={styles.mesaInfo}>
          <Ionicons 
            name={obtenerIconoTipo(mesa.tipo)} 
            size={20} 
            color="#333" 
          />
          <Text style={styles.mesaNombre}>{mesa.nombre}</Text>
          <View style={[
            styles.estadoBadge,
            { backgroundColor: obtenerColorEstado(mesa.estado) }
          ]}>
            <Text style={styles.estadoTexto}>{mesa.estado}</Text>
          </View>
        </View>
        
        <View style={styles.mesaAcciones}>
          <TouchableOpacity
            style={styles.accionBoton}
            onPress={() => abrirModalEditar(mesa)}
          >
            <Ionicons name="create-outline" size={16} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.accionBoton, styles.eliminarBoton]}
            onPress={() => eliminarMesa(mesa)}
          >
            <Ionicons name="trash-outline" size={16} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mesaDetalles}>
        <Text style={styles.mesaDetalle}>#{mesa.numero}</Text>
        <Text style={styles.mesaDetalle}>Cap: {mesa.capacidad}</Text>
        <Text style={styles.mesaDetalle}>{mesa.ubicacion}</Text>
      </View>

      {mesa.descripcion && (
        <Text style={styles.mesaDescripcion}>{mesa.descripcion}</Text>
      )}

      <View style={styles.estadosContainer}>
        {['disponible', 'ocupada', 'limpieza', 'fuera_servicio'].map(estado => (
          <TouchableOpacity
            key={estado}
            style={[
              styles.estadoBoton,
              mesa.estado === estado && styles.estadoBotonActivo,
              { borderColor: obtenerColorEstado(estado) }
            ]}
            onPress={() => cambiarEstadoMesa(mesa, estado)}
          >
            <Text style={[
              styles.estadoBotonTexto,
              mesa.estado === estado && { color: obtenerColorEstado(estado) }
            ]}>
              {estado.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderBotonesAccion = () => (
    <View style={styles.botonesAccionContainer}>
      <TouchableOpacity
        style={styles.botonAccion}
        onPress={() => abrirModalAgregar('mesa')}
      >
        <Ionicons name="restaurant-outline" size={20} color="#fff" />
        <Text style={styles.botonTexto}>Nueva Mesa</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.botonAccion, styles.botonPickup]}
        onPress={() => abrirModalAgregar('pickup')}
      >
        <Ionicons name="bag-outline" size={20} color="#fff" />
        <Text style={styles.botonTexto}>Nuevo PickUp</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.botonAccion, styles.botonBarra]}
        onPress={() => abrirModalAgregar('barra')}
      >
        <Ionicons name="wine-outline" size={20} color="#fff" />
        <Text style={styles.botonTexto}>Nueva Barra</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f8f8" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestión de Mesas</Text>
        <TouchableOpacity
          style={styles.resetBoton}
          onPress={resetearConfiguracion}
        >
          <Ionicons name="refresh-outline" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Status */}
      {syncStatus && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{syncStatus}</Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Estadísticas */}
        {renderEstadisticas()}

        {/* Filtros */}
        {renderFiltros()}

        {/* Botones de acción */}
        {renderBotonesAccion()}

        {/* Lista de mesas */}
        <View style={styles.mesasContainer}>
          {obtenerMesasFiltradas().map(renderMesaCard)}
        </View>

        {/* Espacio final */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal para agregar/editar */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {modoEdicion ? 'Editar' : 'Agregar'} {formData.tipo === 'pickup' ? 'PickUp' : formData.tipo === 'barra' ? 'Barra' : 'Mesa'}
            </Text>
            <TouchableOpacity
              style={styles.cerrarBoton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close-outline" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nombre *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.nombre}
                onChangeText={(text) => setFormData({...formData, nombre: text})}
                placeholder="Ej: Mesa 1, PickUp Principal"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Número *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.numero}
                onChangeText={(text) => setFormData({...formData, numero: text})}
                placeholder={formData.tipo === 'pickup' ? 'Ej: P1, PU-01' : 'Ej: 1, 2, 3'}
                keyboardType={formData.tipo === 'pickup' ? 'default' : 'numeric'}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Capacidad *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.capacidad}
                onChangeText={(text) => setFormData({...formData, capacidad: text})}
                placeholder="Número de personas"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Ubicación</Text>
              <TextInput
                style={styles.formInput}
                value={formData.ubicacion}
                onChangeText={(text) => setFormData({...formData, ubicacion: text})}
                placeholder="Ej: Ventana, Terraza, Mostrador"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tipo</Text>
              <View style={styles.tipoContainer}>
                {[
                  { key: 'mesa', label: 'Mesa', icon: 'restaurant-outline' },
                  { key: 'pickup', label: 'PickUp', icon: 'bag-outline' },
                  { key: 'barra', label: 'Barra', icon: 'wine-outline' }
                ].map(tipo => (
                  <TouchableOpacity
                    key={tipo.key}
                    style={[
                      styles.tipoBoton,
                      formData.tipo === tipo.key && styles.tipoBotonActivo
                    ]}
                    onPress={() => setFormData({...formData, tipo: tipo.key})}
                  >
                    <Ionicons 
                      name={tipo.icon} 
                      size={16} 
                      color={formData.tipo === tipo.key ? '#fff' : '#666'} 
                    />
                    <Text style={[
                      styles.tipoTexto,
                      formData.tipo === tipo.key && styles.tipoTextoActivo
                    ]}>
                      {tipo.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Descripción</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={formData.descripcion}
                onChangeText={(text) => setFormData({...formData, descripcion: text})}
                placeholder="Descripción opcional"
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelarBoton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.guardarBoton}
              onPress={guardarMesa}
              disabled={loading}
            >
              <Text style={styles.guardarTexto}>
                {modoEdicion ? 'Actualizar' : 'Crear'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==========================================
// ESTILOS
// ==========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  resetBoton: {
    padding: 8,
  },
  statusContainer: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  statusText: {
    color: '#1976d2',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  estadisticasContainer: {
    margin: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  estadisticasTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  estadisticasGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  estadisticasCard: {
    alignItems: 'center',
  },
  estadisticasNumero: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  estadisticasLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  filtrosContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  filtroBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filtroBotonActivo: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filtroTexto: {
    marginLeft: 5,
    color: '#666',
    fontSize: 14,
  },
  filtroTextoActivo: {
    color: '#fff',
  },
  botonesAccionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  botonAccion: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    marginRight: 10,
    borderRadius: 8,
  },
  botonPickup: {
    backgroundColor: '#FF9800',
  },
  botonBarra: {
    backgroundColor: '#9C27B0',
  },
  botonTexto: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '500',
    fontSize: 12,
  },
  mesasContainer: {
    paddingHorizontal: 20,
  },
  mesaCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  mesaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mesaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mesaNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 10,
  },
  estadoTexto: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  mesaAcciones: {
    flexDirection: 'row',
  },
  accionBoton: {
    padding: 8,
    marginLeft: 5,
  },
  eliminarBoton: {
    backgroundColor: '#ffebee',
    borderRadius: 5,
  },
  mesaDetalles: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  mesaDetalle: {
    fontSize: 12,
    color: '#666',
    marginRight: 15,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
  },
  mesaDescripcion: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  estadosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  estadoBoton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
    marginBottom: 5,
  },
  estadoBotonActivo: {
    backgroundColor: '#f5f5f5',
  },
  estadoBotonTexto: {
    fontSize: 10,
    color: '#666',
    textTransform: 'capitalize',
  },
  // Estilos del Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cerrarBoton: {
    padding: 5,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  tipoContainer: {
    flexDirection: 'row',
  },
  tipoBoton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginRight: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tipoBotonActivo: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  tipoTexto: {
    marginLeft: 5,
    color: '#666',
  },
  tipoTextoActivo: {
    color: '#fff',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelarBoton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  cancelarTexto: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  guardarBoton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  guardarTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});