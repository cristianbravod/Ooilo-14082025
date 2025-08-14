// Pedidos.js - Sistema completo de gestión de pedidos por mesa
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/ApiService';
import { useAuth } from '../contexts/AuthContext';

export default function Pedidos({ 
  navigation,
  menu = [],           
  platosEspeciales = [], 
  pedidos = [],        
  setPedidos,          
  ventas = [],         
  setVentas            
}) {
  const { user, userRole } = useAuth();

  // ==========================================
  // ESTADOS PRINCIPALES
  // ==========================================
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([]);
  const [platosEspecialesLocal, setPlatosEspecialesLocal] = useState([]);
  
  // ✅ NUEVOS ESTADOS PARA SISTEMA DE MESAS
  const [mesasDisponibles, setMesasDisponibles] = useState([]);
  const [mesaActual, setMesaActual] = useState(null);
  const [loadingMesas, setLoadingMesas] = useState(false);
  const [mostrarSelectorMesa, setMostrarSelectorMesa] = useState(false);
  
  // ✅ ESTADOS PARA GESTIÓN DE PEDIDOS POR MESA
  const [pedidosMesas, setPedidosMesas] = useState({}); // {mesaId: {productos: [], estado: 'abierto/enviado/cerrado', timestamp: ''}}
  const [productosTemporales, setProductosTemporales] = useState([]); // Productos agregados antes de enviar
  
  // Estados de carga
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [loadingEspeciales, setLoadingEspeciales] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [enviandoPedido, setEnviandoPedido] = useState(false);

  // ==========================================
  // FUNCIONES DE UTILIDAD
  // ==========================================

  const formatearPrecio = useCallback((precio) => {
    if (typeof precio !== 'number') {
      precio = parseFloat(precio) || 0;
    }
    return `$${precio.toLocaleString('es-CL')}`;
  }, []);

  const getNombreCategoriaById = useCallback((categoriaId) => {
    if (!categoriaId || !Array.isArray(categoriasDisponibles)) {
      return 'Sin Categoría';
    }
    
    const categoria = categoriasDisponibles.find(cat => 
      cat.id === categoriaId || cat.id === parseInt(categoriaId)
    );
    
    return categoria ? categoria.nombre : 'Sin Categoría';
  }, [categoriasDisponibles]);

  // ✅ FUNCIÓN PARA OBTENER PEDIDO ACTUAL DE LA MESA
  const getPedidoMesaActual = useCallback(() => {
    if (!mesaActual) return { productos: [], estado: 'nuevo', total: 0 };
    
    const pedidoMesa = pedidosMesas[mesaActual.id] || { productos: [], estado: 'nuevo' };
    const todosProductos = [...pedidoMesa.productos, ...productosTemporales];
    const total = todosProductos.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    
    return {
      ...pedidoMesa,
      productos: todosProductos,
      total
    };
  }, [mesaActual, pedidosMesas, productosTemporales]);

  // ==========================================
  // FUNCIONES DE CARGA DE DATOS
  // ==========================================

  const cargarMesasDisponibles = useCallback(async () => {
    try {
      setLoadingMesas(true);
      console.log('🪑 Cargando mesas disponibles...');
      
      const mesas = await ApiService.getMesas();
      console.log('✅ Mesas cargadas:', mesas.length);
      
      const mesasParaPedidos = mesas.filter(mesa => 
        mesa.activa !== false && 
        (mesa.estado === 'disponible' || mesa.estado === 'ocupada')
      );
      
      setMesasDisponibles(mesasParaPedidos);
      
    } catch (error) {
      console.error('❌ Error cargando mesas:', error);
    } finally {
      setLoadingMesas(false);
    }
  }, []);

  const cargarCategoriasDesdeDB = useCallback(async () => {
    try {
      setLoadingCategorias(true);
      const categorias = await ApiService.getCategorias();
      setCategoriasDisponibles(categorias);
    } catch (error) {
      console.error('❌ Error cargando categorías:', error);
      setCategoriasDisponibles([
        { id: 1, nombre: 'Bebidas' },
        { id: 2, nombre: 'Platos Principales' }
      ]);
    } finally {
      setLoadingCategorias(false);
    }
  }, []);

  const cargarPlatosEspeciales = useCallback(async () => {
    try {
      setLoadingEspeciales(true);
      const especiales = await ApiService.getPlatosEspeciales();
      setPlatosEspecialesLocal(especiales);
    } catch (error) {
      console.error('❌ Error cargando platos especiales:', error);
      setPlatosEspecialesLocal([]);
    } finally {
      setLoadingEspeciales(false);
    }
  }, []);

  const cargarDatosIniciales = useCallback(async () => {
    try {
      await Promise.all([
        cargarMesasDisponibles(),
        cargarCategoriasDesdeDB(),
        cargarPlatosEspeciales()
      ]);
    } catch (error) {
      console.error('❌ Error en carga inicial:', error);
      Alert.alert('Error', 'Hubo un problema cargando los datos iniciales');
    }
  }, [cargarMesasDisponibles, cargarCategoriasDesdeDB, cargarPlatosEspeciales]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargarDatosIniciales();
    setRefreshing(false);
  }, [cargarDatosIniciales]);

  // ==========================================
  // EFECTOS
  // ==========================================
  useEffect(() => {
    cargarDatosIniciales();
  }, [cargarDatosIniciales]);

  useEffect(() => {
    console.log('🔍 DEBUG PEDIDOS - Props recibidas:', {
      menu_length: menu?.length || 0,
      platosEspeciales_length: platosEspeciales?.length || 0,
      categorias_length: categoriasDisponibles?.length || 0
    });
  }, [menu, platosEspeciales, categoriasDisponibles]);

  // ==========================================
  // FILTRADO Y PROCESAMIENTO DE DATOS
  // ==========================================

  const filtrarProductosPorCategoria = useCallback((nombreCategoria) => {
    if (!Array.isArray(menu)) return [];

    return menu.filter((producto) => {
      if (!producto || typeof producto !== 'object') return false;

      let categoriaProducto = '';
      if (producto.categoria_id) {
        categoriaProducto = getNombreCategoriaById(producto.categoria_id);
      } else if (producto.categoria) {
        categoriaProducto = producto.categoria;
      } else if (producto.categoria_nombre) {
        categoriaProducto = producto.categoria_nombre;
      }

      const estaDisponible = producto.disponible !== false;
      const coincideCategoria = categoriaProducto === nombreCategoria;
      const esEspecial = categoriaProducto.toLowerCase().includes('especial') || 
                        producto.es_especial === true;

      return estaDisponible && coincideCategoria && !esEspecial;
    });
  }, [menu, getNombreCategoriaById]);

  const productosPorCategoria = useMemo(() => {
    const resultado = {};
    if (!Array.isArray(categoriasDisponibles)) return resultado;

    categoriasDisponibles.forEach(categoria => {
      const productos = filtrarProductosPorCategoria(categoria.nombre);
      const key = categoria.nombre.toLowerCase().replace(/\s+/g, '');
      resultado[key] = productos;
    });

    return resultado;
  }, [categoriasDisponibles, filtrarProductosPorCategoria]);

  const especialesDisponibles = useMemo(() => {
    const especiales = Array.isArray(platosEspeciales) && platosEspeciales.length > 0 
      ? platosEspeciales 
      : platosEspecialesLocal;

    if (!Array.isArray(especiales)) return [];

    return especiales.filter((plato) => {
      if (!plato || typeof plato !== 'object') return false;
      return plato.disponible !== false;
    });
  }, [platosEspeciales, platosEspecialesLocal]);

  // ==========================================
  // FUNCIONES DE GESTIÓN DE PEDIDOS
  // ==========================================

  // ✅ AGREGAR PRODUCTO AL PEDIDO TEMPORAL
  const agregarProducto = useCallback((item, esEspecial = false) => {
    if (!mesaActual) {
      Alert.alert('Error', 'Debes seleccionar una mesa antes de agregar productos');
      return;
    }

    setProductosTemporales(prev => {
      const existente = prev.find(p => p.id === item.id);
      if (existente) {
        return prev.map(p => 
          p.id === item.id 
            ? { ...p, cantidad: p.cantidad + 1 }
            : p
        );
      } else {
        return [...prev, { 
          ...item, 
          cantidad: 1, 
          esEspecial,
          categoria: item.categoria || getNombreCategoriaById(item.categoria_id),
          timestamp: new Date().toISOString()
        }];
      }
    });
  }, [mesaActual, getNombreCategoriaById]);

  // ✅ CAMBIAR CANTIDAD EN PEDIDO DE MESA
  const cambiarCantidadPedido = useCallback((itemId, nuevaCantidad, esTemporal = false) => {
    if (nuevaCantidad <= 0) {
      eliminarDelPedido(itemId, esTemporal);
      return;
    }

    if (esTemporal) {
      setProductosTemporales(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, cantidad: nuevaCantidad }
            : item
        )
      );
    } else {
      // Cambiar cantidad en pedido ya enviado (pedido adicional)
      setPedidosMesas(prev => ({
        ...prev,
        [mesaActual.id]: {
          ...prev[mesaActual.id],
          productos: prev[mesaActual.id]?.productos.map(item =>
            item.id === itemId
              ? { ...item, cantidad: nuevaCantidad }
              : item
          ) || []
        }
      }));
    }
  }, [mesaActual]);

  // ✅ ELIMINAR DEL PEDIDO
  const eliminarDelPedido = useCallback((itemId, esTemporal = false) => {
    if (esTemporal) {
      setProductosTemporales(prev => prev.filter(item => item.id !== itemId));
    } else {
      setPedidosMesas(prev => ({
        ...prev,
        [mesaActual.id]: {
          ...prev[mesaActual.id],
          productos: prev[mesaActual.id]?.productos.filter(item => item.id !== itemId) || []
        }
      }));
    }
  }, [mesaActual]);

  // ✅ ENVIAR PEDIDO A COCINA
  const enviarPedidoACocina = useCallback(async () => {
    if (productosTemporales.length === 0) {
      Alert.alert('Error', 'No hay productos nuevos para enviar');
      return;
    }

    if (!mesaActual) {
      Alert.alert('Error', 'Debes seleccionar una mesa');
      return;
    }

    try {
      setEnviandoPedido(true);

      const pedidoData = {
        mesa_id: mesaActual.id,
        mesa_nombre: mesaActual.nombre,
        mesa_tipo: mesaActual.tipo,
        productos: productosTemporales,
        total: productosTemporales.reduce((sum, item) => sum + (item.precio * item.cantidad), 0),
        fecha: new Date().toISOString(),
        estado: 'enviado',
        camarero: user?.nombre || 'Usuario',
        numero_pedido: `${mesaActual.nombre}-${Date.now()}`
      };

      console.log('📤 Enviando pedido a cocina:', pedidoData);
      
      // Aquí llamarías a ApiService.enviarPedidoCocina(pedidoData)
      
      // Mover productos temporales al pedido de la mesa
      setPedidosMesas(prev => ({
        ...prev,
        [mesaActual.id]: {
          productos: [...(prev[mesaActual.id]?.productos || []), ...productosTemporales],
          estado: 'enviado',
          timestamp: new Date().toISOString(),
          mesa: mesaActual
        }
      }));

      // Limpiar productos temporales
      setProductosTemporales([]);

      Alert.alert(
        'Pedido Enviado', 
        `Pedido enviado a cocina para ${mesaActual.nombre}\nProductos: ${productosTemporales.length}\nTotal: ${formatearPrecio(pedidoData.total)}`
      );
      
    } catch (error) {
      console.error('❌ Error enviando pedido:', error);
      Alert.alert('Error', 'No se pudo enviar el pedido a cocina');
    } finally {
      setEnviandoPedido(false);
    }
  }, [productosTemporales, mesaActual, user, formatearPrecio]);

  // ✅ CERRAR MESA
  const cerrarMesa = useCallback(async () => {
    const pedidoMesa = getPedidoMesaActual();
    
    if (pedidoMesa.productos.length === 0) {
      Alert.alert('Error', 'No hay pedidos en esta mesa');
      return;
    }

    Alert.alert(
      'Cerrar Mesa',
      `¿Confirmas cerrar ${mesaActual.nombre}?\nTotal: ${formatearPrecio(pedidoMesa.total)}\nProductos: ${pedidoMesa.productos.length}`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Cerrar Mesa',
          style: 'destructive',
          onPress: async () => {
            try {
              // Guardar venta final
              const ventaFinal = {
                id: `venta-${mesaActual.id}-${Date.now()}`,
                mesa: mesaActual.nombre,
                productos: pedidoMesa.productos,
                total: pedidoMesa.total,
                fecha: new Date().toISOString(),
                camarero: user?.nombre || 'Usuario'
              };

              // Aquí llamarías a ApiService.cerrarMesa(ventaFinal)
              
              // Limpiar mesa
              setPedidosMesas(prev => {
                const newState = { ...prev };
                delete newState[mesaActual.id];
                return newState;
              });
              setProductosTemporales([]);
              setMesaActual(null);

              Alert.alert('Mesa Cerrada', 'La mesa ha sido cerrada exitosamente');
              
            } catch (error) {
              console.error('❌ Error cerrando mesa:', error);
              Alert.alert('Error', 'No se pudo cerrar la mesa');
            }
          }
        }
      ]
    );
  }, [getPedidoMesaActual, mesaActual, user, formatearPrecio]);

  // ==========================================
  // COMPONENTES DE RENDERIZADO
  // ==========================================

  const renderSelectorMesa = () => {
    if (loadingMesas) {
      return (
        <View style={styles.mesaSelector}>
          <Text style={styles.label}>Mesa:</Text>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#4a6ee0" />
            <Text style={styles.loadingText}>Cargando mesas...</Text>
          </View>
        </View>
      );
    }

    const mesaTexto = mesaActual ? mesaActual.nombre : 'Seleccionar mesa';

    return (
      <View style={styles.mesaSelector}>
        <Text style={styles.label}>Mesa:</Text>
        <TouchableOpacity 
          style={styles.mesaPicker}
          onPress={() => setMostrarSelectorMesa(true)}
        >
          <Text style={styles.mesaTexto}>{mesaTexto}</Text>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderProductGrid = (productos, esSeccionEspecial = false) => {
    if (!Array.isArray(productos) || productos.length === 0) {
      return (
        <View style={styles.emptySection}>
          <Text style={styles.emptySectionText}>No hay productos disponibles</Text>
        </View>
      );
    }

    const filas = [];
    for (let i = 0; i < productos.length; i += 2) {
      filas.push(productos.slice(i, i + 2));
    }

    return filas.map((fila, filaIndex) => (
      <View key={filaIndex} style={styles.gridRow}>
        {fila.map((item) => {
          if (!item || !item.id || !item.nombre) return null;

          return (
            <TouchableOpacity
              key={`${item.id}-${esSeccionEspecial ? 'especial' : 'regular'}`}
              style={styles.productCard}
              onPress={() => agregarProducto(item, esSeccionEspecial)}
            >
              <View style={styles.productImageContainer}>
                {item.imagen_url || item.imagen ? (
                  <Image 
                    source={{ uri: item.imagen_url || item.imagen }} 
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Ionicons name="restaurant" size={24} color="#999" />
                  </View>
                )}
              </View>
              <Text style={styles.productName}>{item.nombre}</Text>
              <Text style={styles.productPrice}>{formatearPrecio(item.precio)}</Text>
              {esSeccionEspecial && (
                <View style={styles.especialBadge}>
                  <Text style={styles.especialText}>PIC</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        {fila.length === 1 && <View style={styles.productCard} />}
      </View>
    ));
  };

  // ✅ RENDERIZAR PEDIDO DE MESA ACTUAL
  const renderPedidoMesa = () => {
    const pedidoMesa = getPedidoMesaActual();
    
    if (pedidoMesa.productos.length === 0) {
      return null;
    }

    return (
      <View style={styles.pedidoMesaContainer}>
        <Text style={styles.pedidoMesaTitulo}>
          Pedidos de {mesaActual?.nombre || 'Mesa'}
        </Text>
        
        {pedidoMesa.productos.map((item, index) => {
          const esTemporal = productosTemporales.some(p => p.id === item.id);
          
          return (
            <View key={`${item.id}-${index}`} style={styles.pedidoItem}>
              <View style={styles.pedidoImageContainer}>
                {item.imagen_url || item.imagen ? (
                  <Image 
                    source={{ uri: item.imagen_url || item.imagen }} 
                    style={styles.pedidoImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.pedidoPlaceholder}>
                    <Ionicons name="restaurant" size={20} color="#999" />
                  </View>
                )}
              </View>
              
              <View style={styles.pedidoInfo}>
                <Text style={styles.pedidoNombre}>
                  {item.nombre} {item.esEspecial && '⚡'}
                </Text>
                <Text style={styles.pedidoCategoria}>
                  ({item.categoria || 'Sin Categoría'}) {item.esEspecial && '- Especial'}
                </Text>
                <Text style={styles.pedidoPrecio}>{formatearPrecio(item.precio)}</Text>
              </View>
              
              <View style={styles.pedidoControles}>
                <TouchableOpacity
                  style={styles.cantidadButton}
                  onPress={() => cambiarCantidadPedido(item.id, item.cantidad - 1, esTemporal)}
                >
                  <Ionicons name="remove" size={16} color="#fff" />
                </TouchableOpacity>
                
                <Text style={styles.cantidadText}>{item.cantidad}</Text>
                
                <TouchableOpacity
                  style={[styles.cantidadButton, styles.cantidadButtonAdd]}
                  onPress={() => cambiarCantidadPedido(item.id, item.cantidad + 1, esTemporal)}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.eliminarButton}
                  onPress={() => eliminarDelPedido(item.id, esTemporal)}
                >
                  <Ionicons name="trash" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // ✅ RENDERIZAR RESUMEN Y BOTONES
  const renderResumenYBotones = () => {
    const pedidoMesa = getPedidoMesaActual();
    const totalProductos = pedidoMesa.productos.reduce((sum, item) => sum + item.cantidad, 0);
    const hayProductosTemporales = productosTemporales.length > 0;
    
    if (pedidoMesa.productos.length === 0) {
      return null;
    }

    return (
      <View style={styles.resumenContainer}>
        <View style={styles.resumenTotal}>
          <Text style={styles.totalText}>Total: {formatearPrecio(pedidoMesa.total)}</Text>
          <Text style={styles.productosText}>Productos: {totalProductos}</Text>
        </View>
        
        {hayProductosTemporales && (
          <TouchableOpacity
            style={[styles.actionButton, styles.enviarButton]}
            onPress={enviarPedidoACocina}
            disabled={enviandoPedido}
          >
            {enviandoPedido ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>ENVIAR A COCINA</Text>
            )}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.actionButton, styles.cerrarButton]}
          onPress={cerrarMesa}
        >
          <Text style={styles.actionButtonText}>CERRAR MESA</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderModalSelectorMesa = () => (
    <Modal
      visible={mostrarSelectorMesa}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setMostrarSelectorMesa(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar Mesa</Text>
            <TouchableOpacity
              onPress={() => setMostrarSelectorMesa(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.mesasList}>
            {mesasDisponibles.map((mesa) => (
              <TouchableOpacity
                key={mesa.id}
                style={[
                  styles.mesaItem,
                  mesa.estado === 'ocupada' && styles.mesaOcupada
                ]}
                onPress={() => {
                  setMesaActual(mesa);
                  setMostrarSelectorMesa(false);
                }}
              >
                <View style={styles.mesaInfo}>
                  <Text style={styles.mesaNombre}>{mesa.nombre}</Text>
                  <Text style={styles.mesaDetalle}>
                    {mesa.tipo} • {mesa.ubicacion || 'Sin ubicación'}
                  </Text>
                  <Text style={[
                    styles.mesaEstado,
                    mesa.estado === 'disponible' ? styles.estadoDisponible : styles.estadoOcupada
                  ]}>
                    {mesa.estado === 'disponible' ? 'Disponible' : 'Ocupada'}
                  </Text>
                </View>
                <Ionicons 
                  name={mesa.estado === 'disponible' ? "checkmark-circle" : "time-outline"} 
                  size={24} 
                  color={mesa.estado === 'disponible' ? "#4CAF50" : "#FF9800"} 
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // ==========================================
  // RENDER PRINCIPAL DEL COMPONENTE
  // ==========================================
  return (
    <View style={styles.container}>
      {renderSelectorMesa()}

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Secciones de Categorías del Menú */}
        {categoriasDisponibles.map((categoria) => {
          const key = categoria.nombre.toLowerCase().replace(/\s+/g, '');
          const productos = productosPorCategoria[key] || [];
          
          if (productos.length === 0) return null;
          
          return (
            <View key={categoria.id} style={styles.categoriaSeccion}>
              <Text style={styles.categoriaTitulo}>
                {categoria.nombre}({productos.length})
              </Text>
              <View style={styles.productosContainer}>
                {renderProductGrid(productos, false)}
              </View>
            </View>
          );
        })}

        {/* Sección de Platos Especiales */}
        {especialesDisponibles.length > 0 && (
          <View style={styles.categoriaSeccion}>
            <Text style={styles.categoriaTitulo}>
              Especiales({especialesDisponibles.length})
            </Text>
            <View style={styles.productosContainer}>
              {renderProductGrid(especialesDisponibles, true)}
            </View>
          </View>
        )}

        {/* Pedido de Mesa Actual */}
        {renderPedidoMesa()}

        <View style={{ height: 150 }} />
      </ScrollView>

      {/* Resumen y Botones de Acción */}
      {renderResumenYBotones()}

      {/* Modal Selector de Mesa */}
      {renderModalSelectorMesa()}
    </View>
  );
}

// ==========================================
// ESTILOS
// ==========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  
  // Selector de Mesa
  mesaSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
    color: '#333',
  },
  mesaPicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  mesaTexto: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },

  // Categorías y Productos
  categoriaSeccion: {
    marginTop: 20,
  },
  categoriaTitulo: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  productosContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#C8E6C9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minHeight: 140,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  productImageContainer: {
    width: 60,
    height: 45,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  especialBadge: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  especialText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptySection: {
    alignItems: 'center',
    padding: 32,
  },
  emptySectionText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },

  // Pedido de Mesa
  pedidoMesaContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pedidoMesaTitulo: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  pedidoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pedidoImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  pedidoImage: {
    width: '100%',
    height: '100%',
  },
  pedidoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pedidoInfo: {
    flex: 1,
  },
  pedidoNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  pedidoCategoria: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  pedidoPrecio: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginTop: 2,
  },
  pedidoControles: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cantidadButton: {
    backgroundColor: '#FF9800',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  cantidadButtonAdd: {
    backgroundColor: '#4CAF50',
  },
  cantidadText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  eliminarButton: {
    backgroundColor: '#f44336',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // Resumen y Botones
  resumenContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resumenTotal: {
    backgroundColor: '#37474F',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  productosText: {
    fontSize: 14,
    color: 'white',
  },
  actionButton: {
    margin: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  enviarButton: {
    backgroundColor: '#4CAF50',
    marginBottom: 8,
  },
  cerrarButton: {
    backgroundColor: '#d32f2f',
    marginTop: 0,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  mesasList: {
    maxHeight: 400,
  },
  mesaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'white',
  },
  mesaOcupada: {
    backgroundColor: '#fff3e0',
  },
  mesaInfo: {
    flex: 1,
  },
  mesaNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  mesaDetalle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  mesaEstado: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  estadoDisponible: {
    color: '#4CAF50',
  },
  estadoOcupada: {
    color: '#FF9800',
  },
});