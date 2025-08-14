// components/Informes.js - VERSIÓN CORREGIDA SIN STATUSBAR DUPLICADO
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
  RefreshControl,
  Linking,
  StatusBar
} from "react-native";

// ✅ IMPORTACIÓN SEGURA CON FALLBACK ROBUSTO
let SafeAreaView, useSafeAreaInsets;
try {
  const SafeAreaContext = require('react-native-safe-area-context');
  SafeAreaView = SafeAreaContext.SafeAreaView;
  useSafeAreaInsets = SafeAreaContext.useSafeAreaInsets;
  console.log('✅ SafeAreaContext cargado correctamente en Informes');
} catch (error) {
  console.log('⚠️ SafeAreaContext no disponible en Informes, usando fallback');
  SafeAreaView = View;
  useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 });
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import ApiService from "../services/ApiService";
import { useAuth } from "../contexts/AuthContext";

export default function Informes({ 
  ventas: ventasProp = [], 
  pedidos = [], 
  menu = [], 
  isOffline = false, 
  syncStatus = '',
  onRefresh 
}) {
  const { userRole } = useAuth();
  
  // ✅ USO SEGURO DE SAFE AREA CON VALIDACIÓN
  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    if (useSafeAreaInsets) {
      const rawInsets = useSafeAreaInsets();
      insets = {
        top: typeof rawInsets.top === 'number' ? rawInsets.top : 0,
        bottom: typeof rawInsets.bottom === 'number' ? rawInsets.bottom : 0,
        left: typeof rawInsets.left === 'number' ? rawInsets.left : 0,
        right: typeof rawInsets.right === 'number' ? rawInsets.right : 0,
      };
    }
  } catch (error) {
    console.log('⚠️ Error usando useSafeAreaInsets en Informes, usando valores por defecto');
  }
  
  // ✅ ESTADOS PRINCIPALES
  const [ventas, setVentas] = useState(ventasProp || []);
  const [ventasFiltradas, setVentasFiltradas] = useState([]);
  const [estadisticas, setEstadisticas] = useState({});
  const [productosPopulares, setProductosPopulares] = useState([]);
  
  // Estados de filtros
  const [mesaSeleccionada, setMesaSeleccionada] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [fechaInicio, setFechaInicio] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.setHours(0, 0, 0, 0));
  });
  const [fechaFin, setFechaFin] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.setHours(23, 59, 59, 999));
  });

  // Estados de UI
  const [cargando, setCargando] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mostrarDatePicker, setMostrarDatePicker] = useState(false);
  const [tipoFecha, setTipoFecha] = useState('inicio');
  const [mostrarSelectorMesa, setMostrarSelectorMesa] = useState(false);
  const [mostrarSelectorProducto, setMostrarSelectorProducto] = useState(false);

  // ✅ FUNCIÓN CORREGIDA PARA CALCULAR PADDING - SIN ERROR DE SINTAXIS
  const getTopPadding = () => {
    if (Platform.OS === 'android') {
      // ✅ CORREGIDO: Condición ternaria completa
      return StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 35;
    }
    return insets.top > 0 ? insets.top + 10 : 50;
  };

  const getBottomPadding = () => {
    return Math.max(insets.bottom || 0, 20);
  };

  // ✅ EFECTOS Y CÁLCULOS
  useEffect(() => {
    setVentas(ventasProp || []);
  }, [ventasProp]);

  useEffect(() => {
    aplicarFiltros();
  }, [ventas, mesaSeleccionada, productoSeleccionado, fechaInicio, fechaFin]);

  useEffect(() => {
    calcularEstadisticas();
  }, [ventasFiltradas]);

  // ✅ FUNCIÓN PARA APLICAR FILTROS
  const aplicarFiltros = () => {
    let ventasFiltradas = [...ventas];

    // Filtrar por rango de fechas
    if (fechaInicio && fechaFin) {
      ventasFiltradas = ventasFiltradas.filter(venta => {
        const fechaVenta = new Date(venta.fecha);
        return fechaVenta >= fechaInicio && fechaVenta <= fechaFin;
      });
    }

    // Filtrar por mesa
    if (mesaSeleccionada) {
      ventasFiltradas = ventasFiltradas.filter(venta => 
        venta.mesa === mesaSeleccionada
      );
    }

    // Filtrar por producto
    if (productoSeleccionado) {
      ventasFiltradas = ventasFiltradas.filter(venta =>
        venta.productos?.some(producto => producto.nombre === productoSeleccionado)
      );
    }

    setVentasFiltradas(ventasFiltradas);
  };

  // ✅ FUNCIÓN PARA CALCULAR ESTADÍSTICAS
  const calcularEstadisticas = () => {
    if (!ventasFiltradas.length) {
      setEstadisticas({});
      setProductosPopulares([]);
      return;
    }

    const totalVentas = ventasFiltradas.length;
    const totalIngresos = ventasFiltradas.reduce((sum, venta) => sum + (venta.total || 0), 0);
    const promedioVenta = totalIngresos / totalVentas;

    // Calcular productos más vendidos
    const conteoProductos = {};
    ventasFiltradas.forEach(venta => {
      venta.productos?.forEach(producto => {
        const nombre = producto.nombre;
        conteoProductos[nombre] = (conteoProductos[nombre] || 0) + (producto.cantidad || 1);
      });
    });

    const productosOrdenados = Object.entries(conteoProductos)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    setEstadisticas({
      totalVentas,
      totalIngresos,
      promedioVenta,
      ventasHoy: ventasFiltradas.filter(venta => {
        const hoy = new Date();
        const fechaVenta = new Date(venta.fecha);
        return fechaVenta.toDateString() === hoy.toDateString();
      }).length
    });

    setProductosPopulares(productosOrdenados);
  };

  // ✅ FUNCIÓN PARA MANEJAR REFRESH
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Error al refrescar informes:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // ✅ FUNCIONES PARA MANEJO DE FECHAS
  const handleDateChange = (event, selectedDate) => {
    setMostrarDatePicker(false);
    if (selectedDate) {
      if (tipoFecha === 'inicio') {
        setFechaInicio(selectedDate);
      } else {
        setFechaFin(selectedDate);
      }
    }
  };

  const mostrarSelectorFecha = (tipo) => {
    setTipoFecha(tipo);
    setMostrarDatePicker(true);
  };

  // ✅ FUNCIÓN PARA EXPORTAR DATOS
  const exportarDatos = async () => {
    try {
      const datos = {
        estadisticas,
        ventasFiltradas,
        productosPopulares,
        fechaGeneracion: new Date().toISOString()
      };

      await AsyncStorage.setItem('informes_export', JSON.stringify(datos));
      Alert.alert(
        'Exportación exitosa',
        'Los datos se han guardado localmente. En una futura versión podrás compartirlos.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error exportando datos:', error);
      Alert.alert('Error', 'No se pudieron exportar los datos');
    }
  };

  // ✅ OBTENER LISTAS ÚNICAS PARA FILTROS
  const mesasUnicas = [...new Set(ventas.map(venta => venta.mesa).filter(Boolean))];
  const productosUnicos = [...new Set(
    ventas.flatMap(venta => 
      venta.productos?.map(p => p.nombre) || []
    ).filter(Boolean)
  )];

  // ✅ RENDERIZADO DE SELECTOR DE MESA
  const renderSelectorMesa = () => (
    <TouchableOpacity
      style={styles.selectorButton}
      onPress={() => setMostrarSelectorMesa(true)}
    >
      <Text style={styles.selectorButtonText}>
        {mesaSeleccionada || 'Todas las mesas'}
      </Text>
      <Ionicons name="chevron-down" size={20} color="#95a5a6" />

      <Modal
        visible={mostrarSelectorMesa}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMostrarSelectorMesa(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMostrarSelectorMesa(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Mesa</Text>
            <ScrollView style={styles.opcionesContainer}>
              <TouchableOpacity
                style={[
                  styles.opcionItem,
                  !mesaSeleccionada && styles.opcionItemSeleccionada
                ]}
                onPress={() => {
                  setMesaSeleccionada('');
                  setMostrarSelectorMesa(false);
                }}
              >
                <Text style={[
                  styles.opcionTexto,
                  !mesaSeleccionada && styles.opcionTextoSeleccionado
                ]}>
                  Todas las mesas
                </Text>
                {!mesaSeleccionada && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </TouchableOpacity>

              {mesasUnicas.map((mesa, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.opcionItem,
                    mesaSeleccionada === mesa && styles.opcionItemSeleccionada
                  ]}
                  onPress={() => {
                    setMesaSeleccionada(mesa);
                    setMostrarSelectorMesa(false);
                  }}
                >
                  <Text style={[
                    styles.opcionTexto,
                    mesaSeleccionada === mesa && styles.opcionTextoSeleccionado
                  ]}>
                    Mesa {mesa}
                  </Text>
                  {mesaSeleccionada === mesa && (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  );

  // ✅ RENDERIZADO DE SELECTOR DE PRODUCTO
  const renderSelectorProducto = () => (
    <TouchableOpacity
      style={styles.selectorButton}
      onPress={() => setMostrarSelectorProducto(true)}
    >
      <Text style={styles.selectorButtonText}>
        {productoSeleccionado || 'Todos los productos'}
      </Text>
      <Ionicons name="chevron-down" size={20} color="#95a5a6" />

      <Modal
        visible={mostrarSelectorProducto}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMostrarSelectorProducto(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMostrarSelectorProducto(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Producto</Text>
            <ScrollView style={styles.opcionesContainer}>
              <TouchableOpacity
                style={[
                  styles.opcionItem,
                  !productoSeleccionado && styles.opcionItemSeleccionada
                ]}
                onPress={() => {
                  setProductoSeleccionado('');
                  setMostrarSelectorProducto(false);
                }}
              >
                <Text style={[
                  styles.opcionTexto,
                  !productoSeleccionado && styles.opcionTextoSeleccionado
                ]}>
                  Todos los productos
                </Text>
                {!productoSeleccionado && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </TouchableOpacity>

              {productosUnicos.map((nombre, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.opcionItem,
                    productoSeleccionado === nombre && styles.opcionItemSeleccionada
                  ]}
                  onPress={() => {
                    setProductoSeleccionado(nombre);
                    setMostrarSelectorProducto(false);
                  }}
                >
                  <Text style={[
                    styles.opcionTexto,
                    productoSeleccionado === nombre && styles.opcionTextoSeleccionado
                  ]}>
                    {nombre}
                  </Text>
                  {productoSeleccionado === nombre && (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  );

  // ✅ RENDERIZADO DE LOADING
  if (cargando) {
    return (
      <View style={[styles.centeredContainer, { paddingTop: getTopPadding() }]}>
        {/* ❌ REMOVIDO: StatusBar ya está configurado centralmente */}
        <ActivityIndicator size={40} color="#4a6ee0" />
        <Text style={styles.loadingText}>Cargando informes...</Text>
        {syncStatus && <Text style={styles.syncStatusText}>{syncStatus}</Text>}
      </View>
    );
  }

  // ✅ RENDERIZADO PRINCIPAL
  return (
    <View style={[styles.container, { paddingTop: getTopPadding() }]}>
      {/* ❌ REMOVIDO: StatusBar ya está configurado centralmente en MainApp.js */}
      
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: getBottomPadding() }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4a6ee0']}
          />
        }
        showsVerticalScrollIndicator={true}
      >
        {/* ✅ HEADER */}
        <View style={styles.headerContainer}>
          <Text style={styles.titulo}>Informes de Ventas</Text>
          {isOffline && (
            <View style={styles.offlineIndicator}>
              <Ionicons name="cloud-offline" size={16} color="#e67e22" />
              <Text style={styles.offlineText}>Modo Offline</Text>
            </View>
          )}
        </View>

        {/* ✅ ESTADO DE SINCRONIZACIÓN */}
        {syncStatus && (
          <View style={[
            styles.statusContainer,
            syncStatus.includes('✅') ? styles.statusSuccess :
            syncStatus.includes('❌') ? styles.statusError : {}
          ]}>
            <Text style={styles.statusText}>{syncStatus}</Text>
          </View>
        )}

        {/* ✅ FILTROS */}
        <View style={styles.filtrosContainer}>
          <Text style={styles.filtrosTitle}>Filtros</Text>
          
          {/* Filtros de fecha */}
          <View style={styles.fechasContainer}>
            <TouchableOpacity
              style={styles.fechaButton}
              onPress={() => mostrarSelectorFecha('inicio')}
            >
              <Ionicons name="calendar" size={20} color="#4a6ee0" />
              <Text style={styles.fechaButtonText}>
                Desde: {fechaInicio.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fechaButton}
              onPress={() => mostrarSelectorFecha('fin')}
            >
              <Ionicons name="calendar" size={20} color="#4a6ee0" />
              <Text style={styles.fechaButtonText}>
                Hasta: {fechaFin.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Filtro por mesa */}
          <View style={styles.filtroRow}>
            <Text style={styles.filtroLabel}>Mesa:</Text>
            {renderSelectorMesa()}
          </View>

          {/* Filtro por producto */}
          <View style={styles.filtroRow}>
            <Text style={styles.filtroLabel}>Producto:</Text>
            {renderSelectorProducto()}
          </View>

          {/* Botón limpiar filtros */}
          <TouchableOpacity
            style={styles.limpiarFiltrosButton}
            onPress={() => {
              setMesaSeleccionada('');
              setProductoSeleccionado('');
              const hoy = new Date();
              setFechaInicio(new Date(hoy.setHours(0, 0, 0, 0)));
              setFechaFin(new Date(hoy.setHours(23, 59, 59, 999)));
            }}
          >
            <Ionicons name="refresh" size={16} color="#95a5a6" />
            <Text style={styles.limpiarFiltrosText}>Limpiar Filtros</Text>
          </TouchableOpacity>
        </View>

        {/* ✅ ESTADÍSTICAS */}
        <View style={styles.estadisticasContainer}>
          <Text style={styles.estadisticasTitle}>Resumen</Text>
          
          <View style={styles.estadisticasGrid}>
            <View style={styles.estadisticaCard}>
              <Ionicons name="receipt" size={24} color="#4a6ee0" />
              <Text style={styles.estadisticaValor}>
                {estadisticas.totalVentas || 0}
              </Text>
              <Text style={styles.estadisticaLabel}>Total Ventas</Text>
            </View>

            <View style={styles.estadisticaCard}>
              <Ionicons name="cash" size={24} color="#27ae60" />
              <Text style={styles.estadisticaValor}>
                ${(estadisticas.totalIngresos || 0).toFixed(2)}
              </Text>
              <Text style={styles.estadisticaLabel}>Ingresos</Text>
            </View>

            <View style={styles.estadisticaCard}>
              <Ionicons name="trending-up" size={24} color="#e67e22" />
              <Text style={styles.estadisticaValor}>
                ${(estadisticas.promedioVenta || 0).toFixed(2)}
              </Text>
              <Text style={styles.estadisticaLabel}>Promedio</Text>
            </View>

            <View style={styles.estadisticaCard}>
              <Ionicons name="today" size={24} color="#9b59b6" />
              <Text style={styles.estadisticaValor}>
                {estadisticas.ventasHoy || 0}
              </Text>
              <Text style={styles.estadisticaLabel}>Hoy</Text>
            </View>
          </View>
        </View>

        {/* ✅ PRODUCTOS POPULARES */}
        {productosPopulares.length > 0 && (
          <View style={styles.popularesContainer}>
            <Text style={styles.popularesTitle}>Productos Más Vendidos</Text>
            {productosPopulares.map((producto, index) => (
              <View key={index} style={styles.productoPopularItem}>
                <View style={styles.productoPopularInfo}>
                  <Text style={styles.productoPopularNombre}>
                    {producto.nombre}
                  </Text>
                  <Text style={styles.productoPopularCantidad}>
                    {producto.cantidad} vendidos
                  </Text>
                </View>
                <View style={[
                  styles.productoPopularBadge,
                  { backgroundColor: index === 0 ? '#f39c12' : index === 1 ? '#95a5a6' : '#cd7f32' }
                ]}>
                  <Text style={styles.productoPopularPosicion}>#{index + 1}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ✅ ACCIONES */}
        <View style={styles.accionesContainer}>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={exportarDatos}
          >
            <Ionicons name="download" size={20} color="#fff" />
            <Text style={styles.exportButtonText}>Exportar Datos</Text>
          </TouchableOpacity>
        </View>

        {/* ✅ DATE PICKER MODAL */}
        {mostrarDatePicker && (
          <DateTimePicker
            value={tipoFecha === 'inicio' ? fechaInicio : fechaFin}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
      </ScrollView>
    </View>
  );
}

// ✅ ESTILOS CORREGIDOS
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#495057',
  },
  syncStatusText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  offlineText: {
    fontSize: 12,
    color: '#e67e22',
    fontWeight: '500',
  },
  statusContainer: {
    margin: 20,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  statusSuccess: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
  },
  statusError: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    textAlign: 'center',
  },
  filtrosContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filtrosTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  fechasContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 10,
  },
  fechaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    gap: 8,
  },
  fechaButtonText: {
    fontSize: 14,
    color: '#495057',
  },
  filtroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  filtroLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    minWidth: 80,
  },
  selectorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  selectorButtonText: {
    fontSize: 14,
    color: '#495057',
  },
  limpiarFiltrosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  limpiarFiltrosText: {
    fontSize: 14,
    color: '#95a5a6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  opcionesContainer: {
    maxHeight: 300,
  },
  opcionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 5,
  },
  opcionItemSeleccionada: {
    backgroundColor: '#4a6ee0',
  },
  opcionTexto: {
    fontSize: 16,
    color: '#495057',
  },
  opcionTextoSeleccionado: {
    color: '#fff',
    fontWeight: '500',
  },
  estadisticasContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  estadisticasTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  estadisticasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  estadisticaCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  estadisticaValor: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginVertical: 5,
  },
  estadisticaLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  popularesContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  popularesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  productoPopularItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  productoPopularInfo: {
    flex: 1,
  },
  productoPopularNombre: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  productoPopularCantidad: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  productoPopularBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  productoPopularPosicion: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  accionesContainer: {
    margin: 20,
  },
  exportButton: {
    backgroundColor: '#27ae60',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 8,
    gap: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});