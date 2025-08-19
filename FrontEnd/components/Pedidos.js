// FrontEnd/components/Pedidos.js - Refactored
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal,
  ActivityIndicator, RefreshControl, Image, TextInput, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/ApiService';
import { useAuth } from '../contexts/AuthContext';

export default function Pedidos({ menu = [], platosEspeciales = [], categorias = [] }) {
  const { user } = useAuth();
  const isInitialMount = useRef(true);
  
  const [mesasDisponibles, setMesasDisponibles] = useState([]);
  const [mesaActual, setMesaActual] = useState(null);
  const [pedidosMesas, setPedidosMesas] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  
  const [refreshing, setRefreshing] = useState(false);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [mostrarSelectorMesa, setMostrarSelectorMesa] = useState(false);

  const cargarMesas = async () => {
    setRefreshing(true);
    try {
      const mesas = await ApiService.getMesas();
      setMesasDisponibles(mesas.filter(m => m.activa !== false && m.estado !== 'fuera_servicio'));
    } catch (error) {
      console.error('❌ Error cargando mesas:', error);
      Alert.alert('Error', 'Hubo un problema cargando las mesas.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarMesas();
  }, []);

  useEffect(() => {
    const cargarPedidosGuardados = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem('@pedidosMesas');
        if (jsonValue != null) {
          setPedidosMesas(JSON.parse(jsonValue));
          console.log('✅ Pedidos recuperados de AsyncStorage');
        }
      } catch (e) {
        console.error('❌ Error al cargar pedidos desde AsyncStorage', e);
      }
    };
    cargarPedidosGuardados();
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      const guardarPedidos = async () => {
        try {
          const jsonValue = JSON.stringify(pedidosMesas);
          await AsyncStorage.setItem('@pedidosMesas', jsonValue);
        } catch (e) {
          console.error('❌ Error guardando pedidos en AsyncStorage:', e);
        }
      };
      guardarPedidos();
    }
  }, [pedidosMesas]);

  const formatearPrecio = useCallback((precio) => {
    const numPrecio = typeof precio === 'string' ? parseFloat(precio) : precio;
    if (isNaN(numPrecio)) return '$0';
    return `$${numPrecio.toLocaleString('es-CL')}`;
  }, []);

  const getPedidoMesaActual = useCallback(() => {
    if (!mesaActual) return { productos: [], productosNuevos: [], total: 0 };
    const pedidoGuardado = pedidosMesas[mesaActual.id] || { productos: [], productosNuevos: [] };
    const todosProductos = [...(pedidoGuardado.productos || []), ...(pedidoGuardado.productosNuevos || [])];
    const total = todosProductos.reduce((sum, item) => {
        const precio = typeof item.precio === 'string' ? parseFloat(item.precio) : item.precio;
        return sum + (precio * item.cantidad);
    }, 0);
    return { ...pedidoGuardado, productos: todosProductos, total };
  }, [mesaActual, pedidosMesas]);

  const agregarProducto = useCallback((item, esEspecial) => {
    if (!mesaActual) {
      Alert.alert('Atención', 'Por favor, selecciona una mesa antes de agregar productos.');
      return;
    }
    setPedidosMesas(prev => {
      const pedidoActual = prev[mesaActual.id] || { productos: [], productosNuevos: [] };
      const productosNuevos = pedidoActual.productosNuevos || [];
      const existente = productosNuevos.find(p => p.id === item.id && p.es_especial === esEspecial);
      
      let productosNuevosActualizados;
      if (existente) {
        productosNuevosActualizados = productosNuevos.map(p => p.id === item.id && p.es_especial === esEspecial ? { ...p, cantidad: p.cantidad + 1 } : p);
      } else {
        productosNuevosActualizados = [...productosNuevos, { ...item, cantidad: 1, es_especial: esEspecial }];
      }

      return {
        ...prev,
        [mesaActual.id]: {
          ...pedidoActual,
          productosNuevos: productosNuevosActualizados
        }
      };
    });
  }, [mesaActual]);
  
  const eliminarDelPedido = (itemId, esEspecial) => {
    if (!mesaActual) return;
    
    setPedidosMesas(prev => {
      const pedidoActual = prev[mesaActual.id];
      if (!pedidoActual) return prev;

      const productosNuevosActualizados = (pedidoActual.productosNuevos || []).filter(p => !(p.id === itemId && p.es_especial === esEspecial));
      const productosEnviadosActualizados = (pedidoActual.productos || []).filter(p => !(p.id === itemId && p.es_especial === esEspecial));

      return {
        ...prev,
        [mesaActual.id]: {
          ...pedidoActual,
          productos: productosEnviadosActualizados,
          productosNuevos: productosNuevosActualizados
        }
      };
    });
  };

  const cambiarCantidadPedido = useCallback((itemId, esEspecial, nuevaCantidad) => {
    if (!mesaActual) return;

    if (nuevaCantidad < 1) {
      eliminarDelPedido(itemId, esEspecial);
      return;
    }
    
    setPedidosMesas(prev => {
      const pedidoActual = prev[mesaActual.id];
      if (!pedidoActual) return prev;

      const updateList = (list) => list.map(p => (p.id === itemId && p.es_especial === esEspecial) ? { ...p, cantidad: nuevaCantidad } : p);

      const enNuevos = (pedidoActual.productosNuevos || []).some(p => p.id === itemId && p.es_especial === esEspecial);

      return {
        ...prev,
        [mesaActual.id]: {
          ...pedidoActual,
          productosNuevos: enNuevos ? updateList(pedidoActual.productosNuevos) : pedidoActual.productosNuevos,
          productos: !enNuevos ? updateList(pedidoActual.productos) : pedidoActual.productos,
        }
      };
    });
  }, [mesaActual]);

  const enviarPedidoACocina = useCallback(async () => {
    if (!mesaActual) return;
    const productosNuevos = pedidosMesas[mesaActual.id]?.productosNuevos || [];
    if (productosNuevos.length === 0) return Alert.alert('Info', 'No hay productos nuevos para enviar a cocina.');
    
    setEnviandoPedido(true);
    try {
      const pedidoParaEnviar = {
        mesa: mesaActual.nombre,
        items: productosNuevos.map(p => ({ ...p, menu_item_id: p.id, precio: parseFloat(p.precio) })),
        total: productosNuevos.reduce((sum, item) => sum + (parseFloat(item.precio) * item.cantidad), 0),
        cliente: `Mesa ${mesaActual.nombre}`,
        observaciones: `Pedido por ${user?.nombre || 'sistema'}`
      };
      
      await ApiService.createQuickOrder(pedidoParaEnviar);
      
      setPedidosMesas(prev => {
        const pedidoAnterior = prev[mesaActual.id];
        return {
          ...prev,
          [mesaActual.id]: {
            ...pedidoAnterior,
            productos: [...(pedidoAnterior.productos || []), ...productosNuevos],
            productosNuevos: [],
            estado: 'enviado',
          }
        };
      });
      Alert.alert('Éxito', `Nuevos productos enviados a cocina para ${mesaActual.nombre}.`);
    } catch (error) {
      console.error('❌ Error enviando pedido adicional:', error);
      Alert.alert('Error', `No se pudo enviar el pedido a cocina. ${error.message}`);
    } finally {
      setEnviandoPedido(false);
    }
  }, [pedidosMesas, mesaActual, user]);
  
  const cerrarMesa = useCallback(() => {
    if (!mesaActual) return;
    const pedidoMesa = getPedidoMesaActual();
    if (pedidoMesa.productos.length === 0) return Alert.alert('Info', 'No hay nada que cobrar en esta mesa.');

    Alert.alert(
      'Confirmar Cierre',
      `¿Deseas cerrar la mesa ${mesaActual.nombre} con un total de ${formatearPrecio(pedidoMesa.total)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Mesa', style: 'destructive', onPress: () => {
            setPedidosMesas(prev => {
                const newPedidos = { ...prev };
                delete newPedidos[mesaActual.id];
                return newPedidos;
            });
            setMesaActual(null);
            Alert.alert('Mesa Cerrada', `${mesaActual.nombre} ha sido cerrada.`);
        }}
      ]
    );
  }, [mesaActual, getPedidoMesaActual, formatearPrecio, pedidosMesas]);

  const { menuFiltrado, especialesFiltrados } = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    const filtrar = (lista) => lista.filter(p => p.nombre.toLowerCase().includes(searchLower));
    
    const menuFiltrado = {};
    const menuNormal = menu.filter(p => p && p.nombre);

    if (searchQuery) {
        menuFiltrado['Resultados de la Búsqueda'] = filtrar(menuNormal);
    } else {
        categorias.forEach(cat => {
            if (cat && cat.nombre) {
                menuFiltrado[cat.nombre] = menuNormal.filter(p => p.categoria_id === cat.id && p.disponible !== false);
            }
        });
    }
    const especialesFiltrados = filtrar(platosEspeciales.filter(p => p && p.nombre && p.disponible !== false));
    return { menuFiltrado, especialesFiltrados };
  }, [searchQuery, menu, platosEspeciales, categorias]);

  const pedidoActual = getPedidoMesaActual();

  const renderProductGrid = (productos, esEspecial = false) => {
    if (!productos || productos.length === 0) return null;
    const filas = [];
    for (let i = 0; i < productos.length; i += 2) {
      filas.push(productos.slice(i, i + 2));
    }
    return filas.map((fila, filaIndex) => (
      <View key={filaIndex} style={styles.gridRow}>
        {fila.map((item) => (
          <TouchableOpacity key={`${item.id}-${esEspecial}`} style={styles.productCard} onPress={() => agregarProducto(item, esEspecial)}>
            <Image source={{ uri: item.imagen_url || item.imagen }} style={styles.productImage} />
            <Text style={styles.productName} numberOfLines={2}>{item.nombre}</Text>
            <Text style={styles.productPrice}>{formatearPrecio(item.precio)}</Text>
          </TouchableOpacity>
        ))}
        {fila.length % 2 !== 0 && <View style={styles.productCardPlaceholder} />}
      </View>
    ));
  };

  const renderPedidoYResumen = () => {
    if (!mesaActual || pedidoActual.productos.length === 0) return null;
    const productosNuevos = pedidosMesas[mesaActual.id]?.productosNuevos || [];

    return (
        <View style={styles.resumenCard}>
            <Text style={styles.pedidoMesaTitulo}>Pedido de {mesaActual.nombre}</Text>
            {pedidoActual.productos.map(item => {
                const esNuevo = (pedidosMesas[mesaActual.id]?.productosNuevos || []).some(p => p.id === item.id && p.es_especial === item.es_especial);
                return (
                    <View key={`${item.id}-${item.es_especial}`} style={styles.pedidoItem}>
                        <Text style={[styles.pedidoNombre, !esNuevo && styles.itemEnviado]} numberOfLines={1}>
                            {!esNuevo && "🧾 "}{item.nombre}
                        </Text>
                        <View style={styles.pedidoControles}>
                            <TouchableOpacity onPress={() => cambiarCantidadPedido(item.id, item.es_especial, item.cantidad - 1)}><Ionicons name="remove-circle-outline" size={28} color="#FF9800" /></TouchableOpacity>
                            <Text style={styles.cantidadText}>{item.cantidad}</Text>
                            <TouchableOpacity onPress={() => cambiarCantidadPedido(item.id, item.es_especial, item.cantidad + 1)}><Ionicons name="add-circle" size={28} color="#4CAF50" /></TouchableOpacity>
                            <TouchableOpacity onPress={() => eliminarDelPedido(item.id, item.es_especial)} style={{marginLeft: 10}}><Ionicons name="trash-bin" size={24} color="#f44336" /></TouchableOpacity>
                        </View>
                    </View>
                );
            })}
            <View style={styles.resumenTotal}>
              <Text style={styles.totalText}>Total: {formatearPrecio(pedidoActual.total)}</Text>
            </View>
            <TouchableOpacity style={[styles.actionButton, styles.enviarButton, productosNuevos.length === 0 && styles.buttonDisabled]} onPress={enviarPedidoACocina} disabled={enviandoPedido || productosNuevos.length === 0}>
              {enviandoPedido ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Enviar a Cocina ({productosNuevos.length})</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.cerrarButton]} onPress={cerrarMesa}>
                <Text style={styles.actionButtonText}>Cerrar Mesa</Text>
            </TouchableOpacity>
          </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mesaSelector}>
        <Text style={styles.label}>Mesa:</Text>
        <TouchableOpacity style={styles.mesaPicker} onPress={() => setMostrarSelectorMesa(true)}>
          <Text style={styles.mesaTexto}>{mesaActual ? mesaActual.nombre : 'Seleccionar mesa'}</Text>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput style={styles.searchInput} placeholder="Buscar producto..." value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={cargarMesas} />}>
        {especialesFiltrados.length > 0 && (
          <View style={styles.categoriaSeccion}>
            <Text style={styles.categoriaTitulo}>🌟 Especiales</Text>
            {renderProductGrid(especialesFiltrados, true)}
          </View>
        )}
        
        {Object.entries(menuFiltrado).map(([categoria, productos]) => (
          productos.length > 0 && (
            <View key={categoria} style={styles.categoriaSeccion}>
              <Text style={styles.categoriaTitulo}>{categoria}</Text>
              {renderProductGrid(productos, false)}
            </View>
          )
        ))}
        
        {renderPedidoYResumen()}
      </ScrollView>

      <Modal visible={mostrarSelectorMesa} animationType="slide" transparent={true} onRequestClose={() => setMostrarSelectorMesa(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Mesa</Text>
            <ScrollView>
              {mesasDisponibles.map(mesa => (
                <TouchableOpacity key={mesa.id} style={styles.mesaItem} onPress={() => { setMesaActual(mesa); setMostrarSelectorMesa(false); }}>
                  <Text style={styles.mesaNombre}>{mesa.nombre}</Text>
                  <Ionicons name={pedidosMesas[mesa.id] && (pedidosMesas[mesa.id].productos?.length > 0 || pedidosMesas[mesa.id].productosNuevos?.length > 0) ? "close-circle" : "checkmark-circle"} size={24} color={pedidosMesas[mesa.id] && (pedidosMesas[mesa.id].productos?.length > 0 || pedidosMesas[mesa.id].productosNuevos?.length > 0) ? "#FF9800" : "#4CAF50"} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    mesaSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderBottomWidth: 1, borderColor: '#e0e0e0' },
    label: { fontSize: 16, fontWeight: '600', marginRight: 12 },
    mesaPicker: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 8 },
    mesaTexto: { fontSize: 16 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 8, marginHorizontal: 16, marginTop: 16, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e0e0e0' },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 16, paddingVertical: Platform.OS === 'ios' ? 12 : 8 },
    scrollView: { flex: 1 },
    categoriaSeccion: { marginTop: 20 },
    categoriaTitulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, paddingHorizontal: 16 },
    gridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    productCard: { width: '48%', backgroundColor: 'white', borderRadius: 12, padding: 12, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: {width: 0, height: 2} },
    productCardPlaceholder: { width: '48%' },
    productImage: { width: '100%', height: 100, borderRadius: 8, marginBottom: 8 },
    productName: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
    productPrice: { fontSize: 16, fontWeight: 'bold', color: '#d32f2f', marginTop: 2 },
    resumenCard: { backgroundColor: 'white', borderRadius: 12, margin: 16, padding: 16, marginTop: 20, borderWidth: 1, borderColor: '#e0e0e0' },
    pedidoMesaTitulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    pedidoItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f0f0f0' },
    pedidoNombre: { fontSize: 16, flex: 1 },
    itemEnviado: { color: '#777', fontStyle: 'italic' },
    pedidoControles: { flexDirection: 'row', alignItems: 'center' },
    cantidadText: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 12 },
    resumenTotal: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: '#f0f0f0', alignItems: 'flex-end' },
    totalText: { fontSize: 18, fontWeight: 'bold' },
    actionButton: { marginTop: 10, padding: 14, borderRadius: 8, alignItems: 'center' },
    enviarButton: { backgroundColor: '#4CAF50' },
    cerrarButton: { backgroundColor: '#d32f2f' },
    buttonDisabled: { backgroundColor: '#a5d6a7' },
    actionButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
    mesaItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#f0f0f0' },
});
