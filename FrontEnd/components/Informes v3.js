// components/Informes.js - PARTE 1: Imports, Estados y Configuración
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
  RefreshControl,
  Linking,
  StyleSheet,
  StatusBar
} from "react-native";

// ✅ IMPORTACIÓN SEGURA CON FALLBACK PATTERN
let useSafeAreaInsets;
try {
  const SafeAreaContext = require('react-native-safe-area-context');
  useSafeAreaInsets = SafeAreaContext.useSafeAreaInsets;
} catch (error) {
  console.log('⚠️ SafeAreaContext no disponible, usando fallback');
  useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 });
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import ApiService from "../services/ApiService";
import { useAuth } from "../contexts/AuthContext";

export default function Informes({ ventas: ventasProp }) {
  const { userRole, isOffline } = useAuth();
  
  // ✅ USO SEGURO DE SAFE AREA INSETS
  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    if (useSafeAreaInsets) {
      insets = useSafeAreaInsets();
    }
  } catch (error) {
    console.log('⚠️ Error usando useSafeAreaInsets');
  }
  
  // ============================================
  // ESTADOS PRINCIPALES
  // ============================================
  const [ventas, setVentas] = useState([]);
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
  const [mostrarFechaInicio, setMostrarFechaInicio] = useState(false);
  const [mostrarFechaFin, setMostrarFechaFin] = useState(false);
  const [mostrarSelectorMesa, setMostrarSelectorMesa] = useState(false);
  const [mostrarSelectorProducto, setMostrarSelectorProducto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  // Estados para visualización
  const [mostrarTodosProductos, setMostrarTodosProductos] = useState(false);
  const [ordenProductos, setOrdenProductos] = useState('cantidad');
  const [mostrarResumenMesas, setMostrarResumenMesas] = useState(false);
  const [ordenMesas, setOrdenMesas] = useState('horario');
  const [mesaExpandida, setMesaExpandida] = useState(null);
  const [ordenExpandida, setOrdenExpandida] = useState(null);
  const [vistaDetallada, setVistaDetallada] = useState(false);
  const [mostrarListaOrdenes, setMostrarListaOrdenes] = useState(false);

  // Datos fijos
  const listaMesas = ["Mesa 1", "Mesa 2", "Mesa 3", "Mesa 4", "Mesa 5"];
  const [todosLosProductos, setTodosLosProductos] = useState([]);
  
  // ============================================
  // EFECTOS Y CARGA INICIAL
  // ============================================
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // ============================================
  // CÁLCULOS MEMOIZADOS
  // ============================================
  
  // Total general del período
  const totalGeneral = React.useMemo(() => {
    if (!Array.isArray(ventasFiltradas)) return {
      totalVentas: 0,
      totalOrdenes: 0,
      totalItems: 0,
      mesasActivas: 0
    };

    const totalVentas = ventasFiltradas.reduce((sum, venta) => sum + (venta.total || 0), 0);
    const totalItems = ventasFiltradas.reduce((sum, venta) => 
      sum + (venta.items?.reduce((itemSum, item) => itemSum + (item.cantidad || 0), 0) || 0), 0
    );
    const mesasUnicas = new Set(ventasFiltradas.map(venta => venta.mesa)).size;

    return {
      totalVentas,
      totalOrdenes: ventasFiltradas.length,
      totalItems,
      mesasActivas: mesasUnicas
    };
  }, [ventasFiltradas]);

  // Resumen de productos
  const resumenProductos = React.useMemo(() => {
    if (!Array.isArray(ventasFiltradas)) return [];
    
    const productos = {};
    
    ventasFiltradas.forEach(venta => {
      if (venta && Array.isArray(venta.items)) {
        venta.items.forEach(item => {
          const nombre = item.nombre;
          if (!productos[nombre]) {
            productos[nombre] = {
              nombre,
              cantidad: 0,
              subtotal: 0
            };
          }
          
          productos[nombre].cantidad += item.cantidad || 0;
          productos[nombre].subtotal += (item.precio || 0) * (item.cantidad || 0);
        });
      }
    });
    
    const productosArray = Object.values(productos);
    
    if (ordenProductos === 'cantidad') {
      return productosArray.sort((a, b) => b.cantidad - a.cantidad);
    } else {
      return productosArray.sort((a, b) => b.subtotal - a.subtotal);
    }
  }, [ventasFiltradas, ordenProductos]);
  
  // ============================================
  // FUNCIONES DE CARGA DE DATOS
  // ============================================
  const cargarDatosIniciales = async () => {
    try {
      setCargando(true);
      setSyncStatus('Cargando datos de informes...');
      
      if (Array.isArray(ventasProp) && ventasProp.length > 0) {
        await procesarVentasLocales(ventasProp);
        setSyncStatus('✅ Datos cargados desde almacenamiento local');
      } else {
        await cargarDesdeBackend();
      }
    } catch (error) {
      console.error('❌ Error cargando datos iniciales:', error);
      setSyncStatus('❌ Error cargando datos');
      await cargarDesdeAsyncStorage();
    } finally {
      setCargando(false);
      setTimeout(() => setSyncStatus(''), 3000);
    }
  };

  const cargarDesdeBackend = async () => {
    try {
      console.log('🌐 Cargando datos desde backend...');
      
      const filtrosIniciales = {
        fecha_inicio: formatearFechaParaAPI(fechaInicio),
        fecha_fin: formatearFechaParaAPI(fechaFin),
        limit: 1000
      };

      const [reporteVentas, productosTop] = await Promise.all([
        ApiService.getVentasReport(filtrosIniciales).catch(() => null),
        ApiService.getProductosPopulares({ limit: 20 }).catch(() => ({ productos: [] }))
      ]);

      if (reporteVentas && reporteVentas.ventas) {
        setVentas(reporteVentas.ventas);
        setVentasFiltradas(reporteVentas.ventas);
        setEstadisticas(reporteVentas.estadisticas || {});
        
        const productosUnicos = [...new Set(
          reporteVentas.ventas.flatMap(venta => 
            venta.items?.map(item => item.nombre) || []
          )
        )];
        setTodosLosProductos(productosUnicos);
        
        setSyncStatus('✅ Datos sincronizados con servidor');
      } else {
        await cargarDesdeAsyncStorage();
      }

      if (productosTop && productosTop.productos) {
        setProductosPopulares(productosTop.productos);
      }
    } catch (error) {
      console.error('❌ Error cargando desde backend:', error);
      setSyncStatus('❌ Error de conexión - usando datos locales');
      await cargarDesdeAsyncStorage();
    }
  };

  const cargarDesdeAsyncStorage = async () => {
    try {
      const [ventasLocal, estadisticasLocal, productosLocal] = await Promise.all([
        AsyncStorage.getItem("ventas"),
        AsyncStorage.getItem("informes_estadisticas"),
        AsyncStorage.getItem("informes_productos_populares")
      ]);

      let ventasCargadas = [];
      
      if (ventasLocal) {
        ventasCargadas = JSON.parse(ventasLocal);
      }

      if (ventasCargadas.length === 0 && ventasProp && ventasProp.length > 0) {
        ventasCargadas = ventasProp;
      }

      await procesarVentasLocales(ventasCargadas);

      if (estadisticasLocal) {
        setEstadisticas(JSON.parse(estadisticasLocal));
      }

      if (productosLocal) {
        setProductosPopulares(JSON.parse(productosLocal));
      }

      setSyncStatus('📱 Datos cargados desde almacenamiento local');
    } catch (error) {
      console.error('❌ Error cargando desde AsyncStorage:', error);
      setVentas([]);
      setVentasFiltradas([]);
      setSyncStatus('❌ No hay datos disponibles');
    }
  };

  const procesarVentasLocales = async (ventasLocal) => {
    try {
      const ventasProcesadas = ventasLocal.map(venta => {
        if (venta.items && Array.isArray(venta.items)) {
          return {
            id: venta.id || Date.now().toString(),
            mesa: venta.mesa || 'Mesa desconocida',
            fecha: venta.fecha || new Date().toISOString(),
            total: parseFloat(venta.total || 0),
            items: venta.items.map(item => ({
              nombre: item.nombre || 'Producto desconocido',
              cantidad: parseInt(item.cantidad || 1),
              precio: parseFloat(item.precio || 0),
              categoria: item.categoria || 'Sin categoría'
            })),
            estado: venta.estado || 'completada',
            metodo_pago: venta.metodo_pago || 'efectivo'
          };
        } else {
          return {
            id: venta.id || Date.now().toString(),
            mesa: venta.mesa || 'Mesa desconocida',
            fecha: venta.fecha || new Date().toISOString(),
            total: parseFloat(venta.total || 0),
            items: venta.productos ? venta.productos.map(producto => ({
              nombre: producto.nombre || 'Producto desconocido',
              cantidad: parseInt(producto.cantidad || 1),
              precio: parseFloat(producto.precio || 0),
              categoria: producto.categoria || 'Sin categoría'
            })) : [],
            estado: 'completada',
            metodo_pago: 'efectivo'
          };
        }
      });

      setVentas(ventasProcesadas);
      setVentasFiltradas(ventasProcesadas);

      const productosUnicos = [...new Set(
        ventasProcesadas.flatMap(venta => 
          venta.items?.map(item => item.nombre) || []
        )
      )];
      setTodosLosProductos(productosUnicos);

      const stats = calcularEstadisticasLocales(ventasProcesadas);
      setEstadisticas(stats);
    } catch (error) {
      console.error('❌ Error procesando ventas locales:', error);
    }
  };

  // ============================================
  // FUNCIONES DE UTILIDAD
  // ============================================
  const calcularEstadisticasLocales = (ventasData) => {
    const totalVentas = ventasData.reduce((sum, venta) => sum + (venta.total || 0), 0);
    const totalItems = ventasData.reduce((sum, venta) => 
      sum + (venta.items?.reduce((itemSum, item) => itemSum + item.cantidad, 0) || 0), 0
    );
    
    return {
      total_ventas: totalVentas,
      total_items: totalItems,
      numero_ordenes: ventasData.length,
      promedio_orden: ventasData.length > 0 ? totalVentas / ventasData.length : 0
    };
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "";
    try {
      return fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return String(fecha);
    }
  };

  const formatearHora = (fecha) => {
    if (!fecha) return "";
    try {
      return fecha.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return String(fecha);
    }
  };

  const formatearFechaParaAPI = (fecha) => {
    if (!fecha) return null;
    try {
      return fecha.toISOString().split('T')[0];
    } catch (e) {
      return null;
    }
  };

  // ... (Continúa con todas las funciones de filtrado, exportación, etc.)

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDesdeBackend();
    setRefreshing(false);
  };
  
  
  
  // ============================================
  // COMPONENTES DE RENDERIZADO
  // ============================================
  const renderSelectorMesa = () => {
    if (Platform.OS === 'ios') {
      return (
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={mesaSeleccionada}
            onValueChange={setMesaSeleccionada}
            style={styles.picker}
          >
            <Picker.Item label="Todas las mesas" value="" />
            {listaMesas.map((mesa) => (
              <Picker.Item label={mesa} value={mesa} key={mesa} />
            ))}
          </Picker>
        </View>
      );
    }
    
    return (
      <TouchableOpacity 
        style={styles.customPicker}
        onPress={() => setMostrarSelectorMesa(true)}
      >
        <Text style={styles.pickerText}>
          {mesaSeleccionada === "" ? "Todas las mesas" : mesaSeleccionada}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#555" />
        
        <Modal
          visible={mostrarSelectorMesa}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setMostrarSelectorMesa(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setMostrarSelectorMesa(false)}
          >
            <View style={styles.pickerModalContent}>
              <Text style={styles.pickerModalTitle}>Seleccionar Mesa</Text>
              
              <TouchableOpacity 
                style={[
                  styles.opcion,
                  mesaSeleccionada === "" && styles.opcionSeleccionada
                ]}
                onPress={() => {
                  setMesaSeleccionada("");
                  setMostrarSelectorMesa(false);
                }}
              >
                <Text 
                  style={[
                    styles.opcionTexto,
                    mesaSeleccionada === "" && styles.opcionTextoSeleccionado
                  ]}
                >
                  Todas las mesas
                </Text>
                {mesaSeleccionada === "" && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </TouchableOpacity>
              
              {listaMesas.map((mesa) => (
                <TouchableOpacity 
                  key={mesa}
                  style={[
                    styles.opcion,
                    mesaSeleccionada === mesa && styles.opcionSeleccionada
                  ]}
                  onPress={() => {
                    setMesaSeleccionada(mesa);
                    setMostrarSelectorMesa(false);
                  }}
                >
                  <Text 
                    style={[
                      styles.opcionTexto,
                      mesaSeleccionada === mesa && styles.opcionTextoSeleccionado
                    ]}
                  >
                    {mesa}
                  </Text>
                  {mesaSeleccionada === mesa && (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </TouchableOpacity>
    );
  };

  const renderSelectorProducto = () => {
    // Similar a renderSelectorMesa pero con productos
    if (Platform.OS === 'ios') {
      return (
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={productoSeleccionado}
            onValueChange={setProductoSeleccionado}
            style={styles.picker}
          >
            <Picker.Item label="Todos los productos" value="" />
            {todosLosProductos.map((nombre) => (
              <Picker.Item label={nombre} value={nombre} key={nombre} />
            ))}
          </Picker>
        </View>
      );
    }
    
    // ... (código similar al selector de mesa)
  };

  // ============================================
  // UTILIDADES DE PADDING Y HELPERS
  // ============================================
  const getTopPadding = () => {
    if (Platform.OS === 'android') {
      return StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 35;
    }
    return insets.top > 0 ? insets.top + 10 : 50;
  };

  const getBottomPadding = () => {
    return Math.max(insets.bottom || 0, 20);
  };

  // ============================================
  // COMPONENTE PRINCIPAL - RENDERIZADO
  // ============================================
  
  // Estado de carga
  if (cargando) {
    return (
      <View style={[styles.centeredContainer, { paddingTop: getTopPadding() }]}>
        <ActivityIndicator size={40} color="#4a6ee0" />
        <Text style={styles.loadingText}>Cargando informes...</Text>
        {syncStatus && <Text style={styles.syncStatusText}>{syncStatus}</Text>}
      </View>
    );
  }

  // Renderizado principal
  return (
    <View style={[styles.container, { paddingTop: getTopPadding() }]}>   
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: getBottomPadding() }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4a6ee0']}
          />
        }
        showsVerticalScrollIndicator={true}
      >
        {/* HEADER */}
        <View style={styles.headerContainer}>
          <Text style={styles.titulo}>Informes de Ventas</Text>
          {isOffline && (
            <View style={styles.offlineIndicator}>
              <Ionicons name="cloud-offline" size={16} color="#e67e22" />
              <Text style={styles.offlineText}>Modo Offline</Text>
            </View>
          )}
        </View>

        {/* Estado de sincronización */}
        {syncStatus && (
          <View style={styles.syncStatus}>
            <Text style={styles.syncStatusText}>{syncStatus}</Text>
          </View>
        )}

        {/* SECCIÓN DE FILTROS */}
        {/* ... (mantener todo el código de filtros como está) */}

        {/* SECCIÓN DE RESULTADOS */}
        <View style={styles.resultadosContainer}>
          <View style={styles.resultadosHeader}>
            <Text style={styles.resultadosTitulo}>Resultados</Text>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{ventasFiltradas.length}</Text>
            </View>
          </View>

          {/* Botón de Exportación */}
          {ventasFiltradas.length > 0 && (userRole === 'admin' || userRole === 'mesero') && (
            <TouchableOpacity
              style={styles.botonExportar}
              onPress={exportarDatos}
              disabled={exportando}
            >
              {exportando ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={[styles.botonExportarTexto, {marginLeft: 8}]}>Exportando...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#fff" />
                  <Text style={styles.botonExportarTexto}>Exportar Datos</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Estado Vacío o Contenido */}
          {ventasFiltradas.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={40} color="#ccc" />
              <Text style={styles.emptyText}>No se encontraron ventas</Text>
              <Text style={styles.emptySubtext}>Prueba con diferentes filtros</Text>
            </View>
          ) : (
            <View style={styles.estadisticasContainer}>
              
              {/* RESUMEN GENERAL DEL PERÍODO */}
              <View style={styles.totalGeneralCard}>
                <View style={styles.totalGeneralHeader}>
                  <Ionicons name="analytics-outline" size={24} color="#4a6ee0" />
                  <Text style={styles.totalGeneralLabel}>Resumen General del Período</Text>
                </View>
                <Text style={styles.periodoTexto}>
                  {formatearFecha(fechaInicio)} - {formatearFecha(fechaFin)}
                </Text>
                
                <View style={styles.totalGeneralGrid}>
                  <View style={styles.totalGeneralItem}>
                    <Text style={styles.totalGeneralValor}>
                      ${totalGeneral.totalVentas.toLocaleString()}
                    </Text>
                    <Text style={styles.totalGeneralTexto}>Total Ventas</Text>
                  </View>
                  <View style={styles.totalGeneralItem}>
                    <Text style={styles.totalGeneralValor}>
                      {totalGeneral.totalOrdenes}
                    </Text>
                    <Text style={styles.totalGeneralTexto}>Órdenes</Text>
                  </View>
                  <View style={styles.totalGeneralItem}>
                    <Text style={styles.totalGeneralValor}>
                      {totalGeneral.totalItems}
                    </Text>
                    <Text style={styles.totalGeneralTexto}>Items</Text>
                  </View>
                  <View style={styles.totalGeneralItem}>
                    <Text style={styles.totalGeneralValor}>
                      {totalGeneral.mesasActivas}
                    </Text>
                    <Text style={styles.totalGeneralTexto}>Mesas Activas</Text>
                  </View>
                </View>
              </View>

              {/* PRODUCTOS MÁS VENDIDOS */}
              {resumenProductos.length > 0 && (
                <View style={styles.productosResumen}>
                  <View style={styles.productosHeader}>
                    <Text style={styles.productosResumenTitulo}>
                      <Ionicons name="list" size={18} color="#555" /> 
                      Productos Vendidos ({resumenProductos.length})
                    </Text>
                    
                    <View style={styles.ordenamientoContainer}>
                      <TouchableOpacity
                        style={[
                          styles.ordenamientoBoton,
                          ordenProductos === 'cantidad' && styles.ordenamientoBotonActivo
                        ]}
                        onPress={() => setOrdenProductos('cantidad')}
                      >
                        <Text style={[
                          styles.ordenamientoTexto,
                          ordenProductos === 'cantidad' && styles.ordenamientoTextoActivo
                        ]}>
                          Por Cantidad
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[
                          styles.ordenamientoBoton,
                          ordenProductos === 'ingresos' && styles.ordenamientoBotonActivo
                        ]}
                        onPress={() => setOrdenProductos('ingresos')}
                      >
                        <Text style={[
                          styles.ordenamientoTexto,
                          ordenProductos === 'ingresos' && styles.ordenamientoTextoActivo
                        ]}>
                          Por Ingresos
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <Text style={styles.productosSubtitulo}>
                    Ordenados por {ordenProductos === 'cantidad' ? 'mayor cantidad vendida' : 'mayores ingresos'}
                  </Text>
                  
                  <ScrollView 
                    style={[
                      styles.productosLista, 
                      mostrarTodosProductos ? styles.productosListaExpandida : styles.productosListaColapsada
                    ]} 
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={false}
                  >
                    {(mostrarTodosProductos ? resumenProductos : resumenProductos.slice(0, 10)).map((item, i) => (
                      <View key={i} style={styles.productoItem}>
                        <View style={[
                          styles.productoRanking,
                          i < 3 && styles[`productoRanking${i + 1}`]
                        ]}>
                          <Text style={[
                            styles.productoNumero,
                            i < 3 && styles.productoNumeroTop
                          ]}>
                            {i + 1}
                          </Text>
                        </View>
                        
                        <View style={styles.productoInfo}>
                          <Text style={styles.productoNombre} numberOfLines={2}>
                            {item.nombre}
                          </Text>
                          
                          <View style={styles.productoStats}>
                            <View style={styles.productoStat}>
                              <Ionicons name="layers-outline" size={14} color="#666" />
                              <Text style={styles.productoCantidad}>x{item.cantidad}</Text>
                            </View>
                            
                            <View style={styles.productoStat}>
                              <Ionicons name="cash-outline" size={14} color="#4a6ee0" />
                              <Text style={styles.productoSubtotal}>
                                ${item.subtotal.toLocaleString()}
                              </Text>
                            </View>
                          </View>
                        </View>
                        
                        {i < 3 && (
                          <View style={styles.topBadge}>
                            <Ionicons 
                              name={i === 0 ? "trophy" : i === 1 ? "medal" : "ribbon"} 
                              size={16} 
                              color={i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : "#CD7F32"} 
                            />
                          </View>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                  
                  {resumenProductos.length > 10 && (
                    <TouchableOpacity
                      style={styles.verTodosBoton}
                      onPress={() => setMostrarTodosProductos(!mostrarTodosProductos)}
                    >
                      <Text style={styles.verTodosTexto}>
                        {mostrarTodosProductos 
                          ? `Mostrar menos (${resumenProductos.length} productos total)`
                          : `Ver todos los productos (${resumenProductos.length - 10} más)`
                        }
                      </Text>
                      <Ionicons 
                        name={mostrarTodosProductos ? "chevron-up" : "chevron-down"} 
                        size={16} 
                        color="#4a6ee0" 
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  scrollContainer: {
    padding: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#555",
    textAlign: "center",
  },
  
  // Header
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#e67e22',
    fontWeight: '500',
  },
  
  // Sync status
  syncStatus: {
    backgroundColor: '#d4edda',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  syncStatusText: {
    fontSize: 14,
    color: '#155724',
    fontWeight: '500',
  },
  
  // Filtros
  filtrosContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  filtrosTitulo: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 14,
  },
  filtroSeccion: {
    marginBottom: 16,
  },
  filtroLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
    color: "#555",
  },
  
  // Pickers
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  customPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 50,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  pickerText: {
    fontSize: 16,
    color: "#333",
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  pickerModalContent: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    width: "80%",
    maxHeight: "60%",
    alignSelf: "center",
    elevation: 5,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#2c3e50",
  },
  opcion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderRadius: 5,
    marginBottom: 5,
  },
  opcionSeleccionada: {
    backgroundColor: "#4a6ee0",
  },
  opcionTexto: {
    fontSize: 16,
    color: "#333",
  },
  opcionTextoSeleccionado: {
    color: "#fff",
    fontWeight: "bold",
  },
  
  // Fechas
  fechasContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  fechaSelector: {
    flex: 1,
    marginRight: 10,
  },
  fechaLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
    color: "#555",
  },
  fechaButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    padding: 12,
  },
  fechaButtonText: {
    fontSize: 14,
    color: "#333",
  },
  
  // Botones
  botonesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  botonPrimario: {
    backgroundColor: "#4a6ee0",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    flex: 2,
  },
  botonTexto: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    marginRight: 8,
  },
  botonSecundario: {
    backgroundColor: "#f1f2f6",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginRight: 12,
    flexDirection: "row",
    justifyContent: "center",
    flex: 1,
  },
  botonSecundarioTexto: {
    color: "#555",
    fontWeight: "600",
    fontSize: 16,
    marginRight: 8,
  },
  botonExportar: {
    backgroundColor: "#27ae60",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  botonExportarTexto: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  
  // Resultados
  resultadosContainer: {
    marginBottom: 20,
  },
  resultadosHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  resultadosTitulo: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2c3e50",
  },
  badgeContainer: {
    backgroundColor: "#e0e6ff",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 10,
  },
  badgeText: {
    color: "#4a6ee0",
    fontWeight: "bold",
    fontSize: 14,
  },
  
  // Empty state
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 40,
    marginBottom: 10,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 18,
    color: "#555",
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  
  // Estadísticas
  estadisticasContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  totalCard: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  totalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#555",
    marginLeft: 8,
  },
  totalValor: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4a6ee0",
    marginBottom: 12,
  },
  estadisticasResumen: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  estatItem: {
    alignItems: 'center',
  },
  estatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  estatValor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },

  // ✅ NUEVOS ESTILOS PARA RESUMEN POR MESA
  mesasResumen: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  mesasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  mesasResumenTitulo: {
    fontSize: 16,
    fontWeight: "500",
    color: "#555",
    marginBottom: 5,
  },
  mesasSubtitulo: {
    fontSize: 12,
    color: "#888",
    marginBottom: 15,
    fontStyle: "italic",
  },
  ordenamientoContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    padding: 2,
  },
  ordenamientoBoton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    marginHorizontal: 2,
  },
  ordenamientoBotonActivo: {
    backgroundColor: '#4a6ee0',
  },
  ordenamientoTexto: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  ordenamientoTextoActivo: {
    color: '#fff',
  },
  mesasLista: {
    maxHeight: 400,
  },
  mesasListaExpandida: {
    maxHeight: 600,
  },
  mesasListaColapsada: {
    maxHeight: 400,
  },
  mesaItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
    position: 'relative',
  },
  mesaIconContainer: {
    alignItems: 'center',
    marginRight: 12,
    minWidth: 60,
  },
  mesaNumero: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#4a6ee0",
    marginTop: 2,
    textAlign: 'center',
  },
  mesaInfo: {
    flex: 1,
    paddingRight: 10,
  },
  mesaStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  mesaStat: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mesaTotal: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4a6ee0",
    marginLeft: 4,
  },
  mesaOrdenes: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
    marginLeft: 4,
  },
  mesaItems: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
    marginLeft: 4,
  },
  mesaHorarios: {
    marginTop: 4,
  },
  mesaHorario: {
    fontSize: 11,
    color: "#888",
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mesaPromedio: {
    alignItems: 'center',
    minWidth: 70,
  },
  mesaPromedioLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  mesaPromedioValor: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  
  // Productos - ESTILOS MEJORADOS
  productosResumen: {
    padding: 20,
  },
  productosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  productosResumenTitulo: {
    fontSize: 16,
    fontWeight: "500",
    color: "#555",
    marginBottom: 5,
  },
  productosSubtitulo: {
    fontSize: 12,
    color: "#888",
    marginBottom: 15,
    fontStyle: "italic",
  },
  productosLista: {
    maxHeight: 400,
  },
  productosListaExpandida: {
    maxHeight: 600,
  },
  productosListaColapsada: {
    maxHeight: 400,
  },
  productoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
    position: 'relative',
  },
  productoRanking: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e0e6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  productoRanking1: {
    backgroundColor: "#FFD700",
  },
  productoRanking2: {
    backgroundColor: "#C0C0C0",
  },
  productoRanking3: {
    backgroundColor: "#CD7F32",
  },
  productoNumero: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#4a6ee0",
  },
  productoNumeroTop: {
    color: "#fff",
  },
  productoInfo: {
    flex: 1,
    paddingRight: 10,
  },
  productoNombre: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  productoStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productoStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productoCantidad: {
    fontSize: 14,
    color: "#777",
    fontWeight: "600",
    marginLeft: 4,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  productoSubtotal: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4a6ee0",
    marginLeft: 4,
  },
  topBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  verTodosBoton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  verTodosTexto: {
    fontSize: 14,
    color: '#4a6ee0',
    fontWeight: '500',
    marginRight: 8,
  },
});