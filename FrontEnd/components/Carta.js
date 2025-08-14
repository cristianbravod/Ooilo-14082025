// components/Carta.js - VERSIÓN CON IMÁGENES MINIATURA Y CATEGORÍAS DINÁMICAS
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Image,
  Platform,
  StatusBar,
  Linking
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import MexicanTheme, { sizes, IconSizes, ThemeUtils } from '../utils/theme';

// ✅ IMPORTACIÓN SEGURA DE SAFE AREA
let useSafeAreaInsets;
try {
  const SafeAreaContext = require('react-native-safe-area-context');
  useSafeAreaInsets = SafeAreaContext.useSafeAreaInsets;
} catch (error) {
  console.log('⚠️ SafeAreaContext no disponible, usando fallback');
  useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 });
}

import ApiService from "../services/ApiService";
import { useAuth } from "../contexts/AuthContext";

export default function Carta({ 
  menu = [], 
  setMenu, 
  categorias = [], 
  setCategorias,
  nuevoProducto = {}, 
  setNuevoProducto, 
  modoEdicion = null,
  setModoEdicion
}) {
  const { user, userRole } = useAuth();
  
  // ✅ USO SEGURO DE SAFE AREA
  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    if (useSafeAreaInsets) {
      insets = useSafeAreaInsets();
    }
  } catch (error) {
    console.log('⚠️ Error usando useSafeAreaInsets');
  }
  
  // Estados principales
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [endpointDisponible, setEndpointDisponible] = useState(true);
  const [errorConexion, setErrorConexion] = useState(null);

  // ✅ NUEVO: Estados para categorías dinámicas
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);

  // ✅ ESTADOS PARA MANEJO DE IMÁGENES MEJORADOS
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [imageUploadResult, setImageUploadResult] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [hasNewImage, setHasNewImage] = useState(false);

  // Estados del formulario COMPLETO
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    precio: '',
    categoria: '',
    categoria_id: null,
    descripcion: '',
    imagen_url: '',
    disponible: true,
    vegetariano: false,
    picante: false
  });

  // Estados para validación del formulario
  const [formErrors, setFormErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);

  // ✅ FUNCIÓN PARA NORMALIZAR PRECIOS
  const normalizarPrecio = useCallback((precio) => {
    console.log('🔍 DEBUG - Precio recibido:', precio, 'tipo:', typeof precio);
    
    if (typeof precio === 'number' && !isNaN(precio) && precio > 0) {
      console.log('✅ Precio ya es número válido:', precio);
      return precio;
    }
    
    if (typeof precio === 'string' && precio.trim() !== '') {
      const cleaned = precio.replace(/[^\d.,]/g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed) && parsed > 0) {
        console.log('✅ Precio string parseado:', parsed);
        return parsed;
      }
    }
    
    console.log('⚠️ Precio inválido, usando 0');
    return 0;
  }, []);

  // ✅ FORMATEAR PRECIO PARA MOSTRAR
  const formatearPrecio = useCallback((precio) => {
    const numeroLimpio = normalizarPrecio(precio);
    if (numeroLimpio === 0) return '$0';
    
    try {
      if (Platform.OS === 'android') {
        const numeroFormateado = numeroLimpio.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `$${numeroFormateado}`;
      } else {
        return numeroLimpio.toLocaleString('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        });
      }
    } catch (error) {
      const numeroRedondeado = Math.round(numeroLimpio);
      return `$${numeroRedondeado.toLocaleString()}`;
    }
  }, [normalizarPrecio]);

  // ✅ CARGAR CATEGORÍAS DESDE LA BASE DE DATOS
  const cargarCategoriasDesdeDB = useCallback(async () => {
    try {
      setLoadingCategorias(true);
      console.log('📂 Cargando categorías desde la base de datos...');
      
      const response = await ApiService.getCategorias();
      const categoriasArray = Array.isArray(response) ? response : [];
      
      // ✅ FILTRAR "PLATOS ESPECIALES" - NO MOSTRAR EN CARTA
      const categoriasFiltradas = categoriasArray.filter(categoria => {
        const nombre = categoria.nombre.toLowerCase();
        return !nombre.includes('especial') && 
               !nombre.includes('special') && 
               nombre !== 'platos especiales';
      });
      
      console.log('✅ Categorías cargadas (sin especiales):', categoriasFiltradas);
      
      setCategoriasDisponibles(categoriasFiltradas);
      
      // Si no hay categoría seleccionada y hay categorías disponibles, seleccionar la primera
      if (!formData.categoria && categoriasFiltradas.length > 0) {
        setFormData(prev => ({
          ...prev,
          categoria: categoriasFiltradas[0].nombre,
          categoria_id: categoriasFiltradas[0].id
        }));
      }
      
    } catch (error) {
      console.error('❌ Error cargando categorías:', error);
      // Fallback con categorías hardcodeadas (SIN platos especiales)
      const categoriasFallback = [
        { id: 1, nombre: 'Entradas' },
        { id: 2, nombre: 'Platos Principales' },
        { id: 3, nombre: 'Postres' },
        { id: 4, nombre: 'Bebidas' },
        { id: 5, nombre: 'Pizzas' }
      ];
      setCategoriasDisponibles(categoriasFallback);
      
      if (!formData.categoria) {
        setFormData(prev => ({
          ...prev,
          categoria: 'Entradas',
          categoria_id: 1
        }));
      }
    } finally {
      setLoadingCategorias(false);
    }
  }, [formData.categoria]);

  // ✅ FUNCIÓN PARA OBTENER NOMBRE DE CATEGORÍA POR ID
  const getNombreCategoriaById = useCallback((categoriaId) => {
    const categoria = categoriasDisponibles.find(cat => cat.id === categoriaId);
    return categoria ? categoria.nombre : 'Sin Categoría';
  }, [categoriasDisponibles]);

  // ✅ FUNCIÓN PARA OBTENER ID DE CATEGORÍA POR NOMBRE
  const getIdCategoriaPorNombre = useCallback((nombreCategoria) => {
    const categoria = categoriasDisponibles.find(cat => cat.nombre === nombreCategoria);
    return categoria ? categoria.id : null;
  }, [categoriasDisponibles]);

  // ✅ PRODUCTOS FILTRADOS POR CATEGORÍA - ACTUALIZADO PARA CATEGORÍAS DINÁMICAS (SIN ESPECIALES)
  const productosPorCategoria = useMemo(() => {
    const menuSeguro = Array.isArray(menu) ? menu : [];
    
    const categorizarProductos = (nombreCategoria) => {
      return menuSeguro.filter(producto => {
        if (!producto || typeof producto !== 'object') {
          return false;
        }
        
        // Obtener la categoría del producto
        let categoriaProducto = '';
        if (producto.categoria_id) {
          categoriaProducto = getNombreCategoriaById(producto.categoria_id);
        } else if (producto.categoria) {
          categoriaProducto = producto.categoria;
        } else if (producto.categoria_nombre) {
          categoriaProducto = producto.categoria_nombre;
        }
        
        // ✅ EXCLUIR productos que sean "platos especiales"
        const esEspecial = categoriaProducto.toLowerCase().includes('especial') || 
                          categoriaProducto.toLowerCase().includes('special') ||
                          categoriaProducto.toLowerCase() === 'platos especiales' ||
                          producto.es_especial === true;
        
        return categoriaProducto === nombreCategoria && !esEspecial;
      });
    };

    // Crear objeto dinámico basado en categorías disponibles (ya filtradas sin especiales)
    const resultado = {};
    categoriasDisponibles.forEach(categoria => {
      const key = categoria.nombre.toLowerCase().replace(/\s+/g, '');
      resultado[key] = categorizarProductos(categoria.nombre);
    });

    return resultado;
  }, [menu, categoriasDisponibles, getNombreCategoriaById]);

  // ✅ VALIDACIÓN DEL FORMULARIO
  const validarFormulario = useCallback(() => {
    const errores = {};
    
    if (!formData.nombre || formData.nombre.trim().length === 0) {
      errores.nombre = 'El nombre es obligatorio';
    }
    
    const precioNormalizado = normalizarPrecio(formData.precio);
    if (precioNormalizado <= 0) {
      errores.precio = 'El precio debe ser mayor a 0';
    }
    
    if (!formData.categoria || !formData.categoria_id) {
      errores.categoria = 'La categoría es obligatoria';
    }
    
    setFormErrors(errores);
    setIsFormValid(Object.keys(errores).length === 0);
    
    return Object.keys(errores).length === 0;
  }, [formData, normalizarPrecio]);

  // Validar formulario cuando cambian los datos
  useEffect(() => {
    validarFormulario();
  }, [formData, validarFormulario]);

  // ✅ CARGAR DATOS DESDE BACKEND AL INICIAR
  useEffect(() => {
    const inicializarDatos = async () => {
      await cargarCategoriasDesdeDB();
      await cargarProductosDesdeBackend();
    };
    
    inicializarDatos();
  }, []);

  // ✅ FUNCIÓN PARA CARGAR PRODUCTOS DESDE BACKEND
  const cargarProductosDesdeBackend = async () => {
    try {
      setLoading(true);
      setSyncStatus('🔄 Cargando productos desde el servidor...');
      
      const response = await ApiService.getMenu();
      const productosArray = Array.isArray(response) ? response : response?.menu || [];
      
      const productosNormalizados = productosArray.map(producto => {
        return {
          ...producto,
          categoria: producto.categoria || getNombreCategoriaById(producto.categoria_id) || 'Sin Categoría',
          precio: normalizarPrecio(producto.precio),
          disponible: Boolean(producto.disponible),
          vegetariano: Boolean(producto.vegetariano),
          picante: Boolean(producto.picante),
          imagen: producto.imagen || producto.imagen_url || null,
          imagen_url: producto.imagen_url || producto.imagen || null
        };
      });
      
      if (typeof setMenu === 'function') {
        setMenu(productosNormalizados);
      }
      
      setSyncStatus('✅ Productos cargados correctamente');
      setEndpointDisponible(true);
      setIsOfflineMode(false);
      
      console.log('✅ Productos cargados:', productosNormalizados.length);
      
    } catch (error) {
      console.error('❌ Error cargando productos:', error);
      setSyncStatus('❌ Error de conexión - modo offline activado');
      setEndpointDisponible(false);
      setIsOfflineMode(true);
      setErrorConexion(error.message);
    } finally {
      setLoading(false);
      setTimeout(() => setSyncStatus(''), 3000);
    }
  };

  // ✅ SELECCIONAR IMAGEN DESDE GALERÍA
  const seleccionarImagen = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permisos necesarios',
          'Para seleccionar imágenes necesitamos acceso a tu galería.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('🖼️ Nueva imagen seleccionada:', result.assets[0].uri);
        setSelectedImage(result.assets[0]);
        setHasNewImage(true);
        setImageError(false);
        
        setFormData(prev => ({
          ...prev,
          imagen_url: result.assets[0].uri
        }));
      }
    } catch (error) {
      console.error('Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  // ✅ SUBIR IMAGEN
  const subirImagen = async () => {
    if (!selectedImage) return null;

    try {
      setUploadingImage(true);
      setImageUploadProgress(0);

      console.log('📤 Subiendo imagen al servidor...');
      const result = await ApiService.uploadImage(selectedImage.uri, {
        onProgress: (progress) => setImageUploadProgress(progress)
      });

      setImageUploadResult(result);
      console.log('✅ Resultado de la subida:', result);
      
      return result;
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      setImageError(true);
      Alert.alert('Error', 'No se pudo subir la imagen');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // ✅ CREAR PRODUCTO
  const crearProducto = async () => {
    if (!validarFormulario()) {
      Alert.alert('Error', 'Por favor corrige los errores en el formulario');
      return;
    }

    if (userRole !== 'admin') {
      Alert.alert('Acceso Denegado', 'Solo los administradores pueden agregar productos');
      return;
    }

    try {
      setLoading(true);
      
      let imagenUrl = formData.imagen_url;
      if (selectedImage && hasNewImage) {
        console.log('📤 Subiendo nueva imagen para crear producto...');
        const uploadResult = await subirImagen();
        if (uploadResult && uploadResult.urls) {
          imagenUrl = uploadResult.urls.medium;
          console.log('✅ Nueva imagen subida:', imagenUrl);
        }
      }

      const nuevoProductoData = {
        nombre: formData.nombre.trim(),
        precio: normalizarPrecio(formData.precio),
        categoria_id: formData.categoria_id,
        categoria: formData.categoria,
        descripcion: formData.descripcion?.trim() || '',
        imagen: imagenUrl,
        imagen_url: imagenUrl,
        disponible: formData.disponible,
        vegetariano: formData.vegetariano,
        picante: formData.picante
      };

      console.log('🍽️ Creando producto:', nuevoProductoData);

      if (endpointDisponible) {
        const response = await ApiService.createMenuItem(nuevoProductoData);
        
        const productoCompleto = {
          ...response,
          categoria: formData.categoria,
          imagen_url: imagenUrl,
          imagen: imagenUrl
        };
        
        if (typeof setMenu === 'function') {
          setMenu(prev => Array.isArray(prev) ? [...prev, productoCompleto] : [productoCompleto]);
        }
        
        setSyncStatus('✅ Producto creado exitosamente');
      } else {
        const productoConId = {
          ...nuevoProductoData,
          id: Date.now(),
          createdAt: new Date().toISOString(),
          _pendingSync: true
        };
        
        if (typeof setMenu === 'function') {
          setMenu(prev => Array.isArray(prev) ? [...prev, productoConId] : [productoConId]);
        }
        
        await guardarCambioOffline('create', productoConId);
        setSyncStatus('📱 Producto guardado localmente');
        setPendingChanges(prev => prev + 1);
      }

      limpiarFormulario();

    } catch (error) {
      console.error('❌ Error creando producto:', error);
      setSyncStatus('❌ Error creando producto');
      Alert.alert('Error', 'No se pudo crear el producto');
    } finally {
      setLoading(false);
      setTimeout(() => setSyncStatus(''), 3000);
    }
  };

  // ✅ ACTUALIZAR PRODUCTO
  const actualizarProducto = async () => {
    if (!validarFormulario() || !modoEdicion) return;

    try {
      setLoading(true);
      setSyncStatus('🔄 Actualizando producto...');
      
      let imagenUrl = existingImageUrl || formData.imagen_url;
      
      if (selectedImage && hasNewImage) {
        console.log('📤 Subiendo nueva imagen para actualizar producto...');
        const uploadResult = await subirImagen();
        if (uploadResult && uploadResult.urls) {
          imagenUrl = uploadResult.urls.medium;
          console.log('✅ Nueva imagen subida:', imagenUrl);
        }
      }

      const productoActualizado = {
        id: modoEdicion,
        nombre: formData.nombre.trim(),
        precio: normalizarPrecio(formData.precio),
        categoria_id: formData.categoria_id,
        categoria: formData.categoria,
        descripcion: formData.descripcion?.trim() || '',
        imagen: imagenUrl || null,
        imagen_url: imagenUrl || null,
        disponible: formData.disponible,
        vegetariano: formData.vegetariano,
        picante: formData.picante
      };

      console.log('✏️ Actualizando producto con datos:', productoActualizado);

      if (endpointDisponible) {
        const response = await ApiService.updateItem(modoEdicion, productoActualizado, false);
        
        const productoCompleto = {
          ...response,
          categoria: formData.categoria,
          imagen_url: imagenUrl,
          imagen: imagenUrl
        };
        
        if (typeof setMenu === 'function') {
          setMenu(prev => Array.isArray(prev) ? 
            prev.map(producto => producto.id === modoEdicion ? productoCompleto : producto) : 
            []
          );
        }
        
        setSyncStatus('✅ Producto actualizado exitosamente');
        console.log('✅ Producto actualizado en el estado:', productoCompleto);
      } else {
        productoActualizado._pendingSync = true;
        
        if (typeof setMenu === 'function') {
          setMenu(prev => Array.isArray(prev) ? 
            prev.map(producto => producto.id === modoEdicion ? productoActualizado : producto) : 
            []
          );
        }
        
        await guardarCambioOffline('update', productoActualizado);
        setSyncStatus('📱 Cambios guardados localmente');
        setPendingChanges(prev => prev + 1);
      }

      limpiarFormulario();

    } catch (error) {
      console.error('❌ Error actualizando producto:', error);
      setSyncStatus('❌ Error actualizando producto');
      Alert.alert('Error', 'No se pudo actualizar el producto');
    } finally {
      setLoading(false);
      setTimeout(() => setSyncStatus(''), 3000);
    }
  };

  // ✅ ELIMINAR PRODUCTO
  const eliminarProducto = async (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar este producto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              if (endpointDisponible) {
                await ApiService.deleteItem(id, false);
                
                if (typeof setMenu === 'function') {
                  setMenu(prev => Array.isArray(prev) ? prev.filter(producto => producto.id !== id) : []);
                }
                
                setSyncStatus('✅ Producto eliminado exitosamente');
              } else {
                if (typeof setMenu === 'function') {
                  setMenu(prev => Array.isArray(prev) ? prev.filter(producto => producto.id !== id) : []);
                }
                
                await guardarCambioOffline('delete', { id });
                setSyncStatus('📱 Eliminación guardada localmente');
                setPendingChanges(prev => prev + 1);
              }
            } catch (error) {
              console.error('❌ Error eliminando producto:', error);
              Alert.alert('Error', 'No se pudo eliminar el producto');
            } finally {
              setLoading(false);
              setTimeout(() => setSyncStatus(''), 3000);
            }
          }
        }
      ]
    );
  };

  // ✅ EDITAR PRODUCTO
  const editarProducto = (producto) => {
    if (!producto || typeof producto !== 'object') return;
    
    console.log('✏️ Editando producto:', producto);
    
    // Obtener categoría por ID si existe
    const categoria = producto.categoria || getNombreCategoriaById(producto.categoria_id) || 'Sin Categoría';
    const categoriaId = producto.categoria_id || getIdCategoriaPorNombre(producto.categoria);
    
    setFormData({
      nombre: producto.nombre || '',
      precio: (producto.precio || 0).toString(),
      categoria: categoria,
      categoria_id: categoriaId,
      descripcion: producto.descripcion || '',
      imagen_url: producto.imagen || producto.imagen_url || '',
      disponible: producto.disponible !== false,
      vegetariano: producto.vegetariano === true,
      picante: producto.picante === true
    });
    
    const imagenExistente = producto.imagen || producto.imagen_url;
    if (imagenExistente) {
      console.log('🖼️ Producto tiene imagen existente:', imagenExistente);
      setExistingImageUrl(imagenExistente);
      setSelectedImage(null);
    } else {
      console.log('📷 Producto sin imagen');
      setExistingImageUrl(null);
      setSelectedImage(null);
    }
    
    setHasNewImage(false);
    setImageError(false);
    setImageUploadProgress(0);
    setImageUploadResult(null);
    setUploadingImage(false);
    
    if (typeof setModoEdicion === 'function') {
      setModoEdicion(producto.id);
    }
    
    setSyncStatus('✏️ Editando producto...');
    console.log('✅ Formulario configurado para editar:', producto.nombre);
  };

  // ✅ TOGGLE DISPONIBILIDAD
  const toggleDisponibilidad = async (producto) => {
    if (userRole !== 'admin') {
      Alert.alert('Acceso restringido', 'Solo los administradores pueden cambiar la disponibilidad');
      return;
    }

    if (!producto || typeof producto !== 'object') return;
    
    try {
      const productoActualizado = { ...producto, disponible: !producto.disponible };
      
      if (endpointDisponible) {
        await ApiService.updateItem(producto.id, productoActualizado, false);
      } else {
        await guardarCambioOffline('update', productoActualizado);
        setPendingChanges(prev => prev + 1);
      }
      
      if (typeof setMenu === 'function') {
        setMenu(prev => Array.isArray(prev) ? 
          prev.map(p => p.id === producto.id ? productoActualizado : p) : 
          []
        );
      }
      
      const nombreSeguro = producto.nombre || 'Producto';
      const estadoTexto = productoActualizado.disponible ? 'activado' : 'desactivado';
      setSyncStatus(`✅ ${nombreSeguro} ${estadoTexto}`);
      
    } catch (error) {
      console.error('❌ Error toggleando disponibilidad:', error);
      Alert.alert('Error', 'No se pudo cambiar la disponibilidad');
    } finally {
      setTimeout(() => setSyncStatus(''), 3000);
    }
  };
  
  // ✅ GUARDAR CAMBIO OFFLINE
  const guardarCambioOffline = async (tipo, data) => {
    try {
      const cambiosExistentes = await AsyncStorage.getItem('cambios_pendientes_menu') || '[]';
      const cambios = JSON.parse(cambiosExistentes);
      
      const nuevoCambio = {
        id: Date.now(),
        tipo,
        data,
        timestamp: new Date().toISOString()
      };
      
      cambios.push(nuevoCambio);
      await AsyncStorage.setItem('cambios_pendientes_menu', JSON.stringify(cambios));
      
      console.log('💾 Cambio guardado offline:', nuevoCambio);
    } catch (error) {
      console.error('❌ Error guardando cambio offline:', error);
    }
  };

  // ✅ ELIMINAR IMAGEN ACTUAL
  const eliminarImagenActual = () => {
    Alert.alert(
      'Eliminar Imagen',
      '¿Estás seguro de que deseas eliminar la imagen actual?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setSelectedImage(null);
            setExistingImageUrl(null);
            setHasNewImage(false);
            setImageError(false);
            setImageUploadResult(null);
            setFormData(prev => ({ ...prev, imagen_url: '' }));
            console.log('🗑️ Imagen eliminada del formulario');
          }
        }
      ]
    );
  };

  // ✅ LIMPIAR FORMULARIO
  const limpiarFormulario = () => {
    const primeraCategoria = categoriasDisponibles[0];
    
    setFormData({
      nombre: '',
      precio: '',
      categoria: primeraCategoria?.nombre || '',
      categoria_id: primeraCategoria?.id || null,
      descripcion: '',
      imagen_url: '',
      disponible: true,
      vegetariano: false,
      picante: false
    });
    
    setSelectedImage(null);
    setExistingImageUrl(null);
    setHasNewImage(false);
    setImageError(false);
    setImageUploadProgress(0);
    setImageUploadResult(null);
    setUploadingImage(false);
    
    if (typeof setModoEdicion === 'function') {
      setModoEdicion(null);
    }
    
    setFormErrors({});
    setShowAdvancedForm(false);
    setSyncStatus('');
    
    console.log('🧹 Formulario limpiado completamente');
  };

  // ✅ REFRESH
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await cargarCategoriasDesdeDB();
      await cargarProductosDesdeBackend();
    } catch (error) {
      console.error('❌ Error en refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // ✅ FUNCIÓN PARA OBTENER LA IMAGEN A MOSTRAR
  const getImageToShow = () => {
    if (selectedImage && hasNewImage) {
      return selectedImage.uri;
    }
    if (existingImageUrl && !hasNewImage) {
      return existingImageUrl;
    }
    return null;
  };

  // ✅ MANEJAR CAMBIO DE CATEGORÍA
  const handleCategoriaChange = (nombreCategoria) => {
    const categoria = categoriasDisponibles.find(cat => cat.nombre === nombreCategoria);
    if (categoria) {
      setFormData(prev => ({
        ...prev,
        categoria: categoria.nombre,
        categoria_id: categoria.id
      }));
    }
  };

  // ✅ PADDING DINÁMICO
  const getTopPadding = () => {
    if (Platform.OS === 'android') {
     return StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 35;
	}
	return insets.top > 0 ? insets.top + 10 : 50;
  };

  const getBottomPadding = () => {
    return Math.max(insets.bottom || 0, 20);
  };

  const imageToShow = getImageToShow();

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
            colors={['#4CAF50']}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Gestión del Menú</Text>
        </View>

        {/* Estado de sincronización */}
        {syncStatus && typeof syncStatus === 'string' && syncStatus.length > 0 && (
          <View style={[
            styles.statusContainer,
            syncStatus.includes('✅') ? styles.statusSuccess :
            syncStatus.includes('❌') ? styles.statusError : {}
          ]}>
            <Text style={styles.statusText}>{syncStatus}</Text>
            {pendingChanges > 0 && (
              <Text style={styles.statusSubtext}>
                {`${pendingChanges} cambios pendientes de sincronización`}
              </Text>
            )}
          </View>
        )}

        {/* Alerta de modo offline */}
        {isOfflineMode && (
          <View style={styles.alertContainer}>
            <Ionicons name="warning" size={20} color="#e65100" />
            <Text style={styles.alertText}>
              Modo offline activo. Los cambios se sincronizarán cuando se restablezca la conexión.
            </Text>
          </View>
        )}

        {/* Formulario */}
        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>
              {modoEdicion ? 'Editar Producto' : 'Agregar Producto al Menú'}
            </Text>
            <TouchableOpacity
              style={styles.advancedToggle}
              onPress={() => setShowAdvancedForm(!showAdvancedForm)}
            >
              <Text style={styles.advancedToggleText}>Avanzado</Text>
              <Ionicons 
                name={showAdvancedForm ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#007AFF" 
              />
            </TouchableOpacity>
          </View>

          {/* Campos básicos */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nombre del Plato *</Text>
            <TextInput
              style={[styles.input, formErrors.nombre && styles.inputError]}
              value={formData.nombre}
              onChangeText={(text) => setFormData(prev => ({ ...prev, nombre: text }))}
              placeholder="Ej: Hamburguesa Clásica"
            />
            {formErrors.nombre && typeof formErrors.nombre === 'string' && (
              <Text style={styles.errorText}>{formErrors.nombre}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Precio *</Text>
            <TextInput
              style={[styles.input, formErrors.precio && styles.inputError]}
              value={formData.precio}
              onChangeText={(text) => setFormData(prev => ({ ...prev, precio: text }))}
              placeholder="Ej: 15000"
              keyboardType="numeric"
            />
            {formErrors.precio && typeof formErrors.precio === 'string' && (
              <Text style={styles.errorText}>{formErrors.precio}</Text>
            )}
            {formData.precio && formData.precio.length > 0 && (
              <Text style={styles.pricePreview}>
                Vista previa: {formatearPrecio(formData.precio)}
              </Text>
            )}
          </View>

          {/* ✅ SELECTOR DE CATEGORÍA DINÁMICO */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Categoría *</Text>
            {loadingCategorias ? (
              <View style={styles.loadingCategorias}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingCategoriasText}>Cargando categorías...</Text>
              </View>
            ) : (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.categoria}
                  onValueChange={(value) => handleCategoriaChange(value)}
                  style={styles.picker}
                  enabled={categoriasDisponibles.length > 0}
                >
                  {categoriasDisponibles.length === 0 ? (
                    <Picker.Item label="No hay categorías disponibles" value="" />
                  ) : (
                    categoriasDisponibles.map((categoria) => (
                      <Picker.Item 
                        key={categoria.id} 
                        label={categoria.nombre} 
                        value={categoria.nombre} 
                      />
                    ))
                  )}
                </Picker>
              </View>
            )}
            {formErrors.categoria && typeof formErrors.categoria === 'string' && (
              <Text style={styles.errorText}>{formErrors.categoria}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={styles.textArea}
              value={formData.descripcion}
              onChangeText={(text) => setFormData(prev => ({ ...prev, descripcion: text }))}
              placeholder="Describe los ingredientes y características del plato..."
              multiline={true}
              numberOfLines={3}
            />
          </View>

          {/* Disponibilidad */}
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Disponible</Text>
            <Switch
              value={formData.disponible}
              onValueChange={(value) => setFormData(prev => ({ ...prev, disponible: value }))}
              thumbColor={formData.disponible ? "#4CAF50" : "#f4f3f4"}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
            />
          </View>

          {/* ✅ IMAGEN DEL PLATO */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Imagen del Plato</Text>
            
            {imageToShow ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: imageToShow }} style={styles.imagePreview} />
                
                <View style={[
                  styles.imageTypeBadge,
                  { backgroundColor: hasNewImage ? '#4CAF50' : '#2196F3' }
                ]}>
                  <Ionicons 
                    name={hasNewImage ? "add-circle" : "image"} 
                    size={12} 
                    color="white" 
                  />
                  <Text style={styles.imageTypeText}>
                    {hasNewImage ? 'Nueva' : 'Actual'}
                  </Text>
                </View>
                
                {uploadingImage && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size={sizes.large} color="#007AFF" />
                    <Text style={styles.uploadingText}>
                      Subiendo imagen... {Math.round(imageUploadProgress)}%
                    </Text>
                    <View style={styles.progressBarContainer}>
                      <View 
                        style={[
                          styles.progressBar, 
                          { width: `${imageUploadProgress}%` }
                        ]} 
                      />
                    </View>
                  </View>
                )}
                
                {imageError && (
                  <View style={styles.imageErrorOverlay}>
                    <Ionicons name="warning" size={24} color="#FF5722" />
                    <Text style={styles.imageErrorText}>Error subiendo imagen</Text>
                  </View>
                )}
                
                <TouchableOpacity
                  style={styles.changeImageButton}
                  onPress={seleccionarImagen}
                  disabled={uploadingImage}
                >
                  <Ionicons name="camera" size={16} color="white" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={eliminarImagenActual}
                  disabled={uploadingImage}
                >
                  <Ionicons name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={seleccionarImagen}
                disabled={uploadingImage}
              >
                <Ionicons name="camera" size={32} color="#007AFF" />
                <Text style={styles.imagePickerText}>Seleccionar Imagen</Text>
                <Text style={styles.imagePickerSubtext}>
                  Toca para seleccionar una foto del plato
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Campos avanzados */}
          {showAdvancedForm && (
            <>
              <View style={styles.switchContainer}>
                <Text style={styles.label}>Vegetariano</Text>
                <Switch
                  value={formData.vegetariano}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, vegetariano: value }))}
                  thumbColor={formData.vegetariano ? "#4CAF50" : "#f4f3f4"}
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                />
              </View>

              <View style={styles.switchContainer}>
                <Text style={styles.label}>Picante</Text>
                <Switch
                  value={formData.picante}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, picante: value }))}
                  thumbColor={formData.picante ? "#FF5722" : "#f4f3f4"}
                  trackColor={{ false: "#767577", true: "#ffab91" }}
                />
              </View>
            </>
          )}

          {/* Botones */}
          <View style={styles.buttonContainer}>
            {modoEdicion ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.updateButton,
                    (!isFormValid || loading || uploadingImage) && styles.buttonDisabled
                  ]}
                  onPress={actualizarProducto}
                  disabled={!isFormValid || loading || uploadingImage}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.buttonText}>Actualizar</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={limpiarFormulario}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.addButton,
                  (!isFormValid || loading || uploadingImage) && styles.buttonDisabled
                ]}
                onPress={crearProducto}
                disabled={!isFormValid || loading || uploadingImage}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.buttonText}>Agregar al Menú</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ✅ LISTA DE PRODUCTOS POR CATEGORÍA DINÁMICA */}
        {categoriasDisponibles.map((categoria) => {
          const key = categoria.nombre.toLowerCase().replace(/\s+/g, '');
          const productos = productosPorCategoria[key] || [];
          
          return (
            <MenuSection 
              key={categoria.id}
              title={categoria.nombre}
              items={productos}
              onEdit={editarProducto}
              onDelete={eliminarProducto}
              onToggleAvailability={toggleDisponibilidad}
              userRole={userRole}
              formatearPrecio={formatearPrecio}
              emptyIcon="restaurant-outline"
              emptyText={`No hay productos en ${categoria.nombre.toLowerCase()}`}
            />
          );
        })}

        {/* Espacio adicional para el scroll */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ✅ COMPONENTE PARA SECCIONES DEL MENÚ
function MenuSection({ 
  title = '', 
  items = [], 
  onEdit, 
  onDelete, 
  onToggleAvailability, 
  userRole = '', 
  formatearPrecio,
  emptyIcon = 'help-outline',
  emptyText = 'No hay elementos'
}) {
  const itemsSeguro = Array.isArray(items) ? items : [];
  
  return (
    <View style={styles.listContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.listTitle}>{title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{itemsSeguro.length.toString()}</Text>
        </View>
      </View>
      
      {itemsSeguro.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name={emptyIcon} size={48} color="#ccc" />
          <Text style={styles.emptyText}>{emptyText}</Text>
          <Text style={styles.emptySubtext}>
            Agrega productos usando el formulario anterior
          </Text>
        </View>
      ) : (
        itemsSeguro.map((producto, index) => {
          if (!producto || typeof producto !== 'object') {
            return null;
          }
          
          return (
            <ProductCard
              key={producto.id || `product-${index}`}
              producto={producto}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleAvailability={onToggleAvailability}
              userRole={userRole}
              formatearPrecio={formatearPrecio}
            />
          );
        })
      )}
    </View>
  );
}

// ✅ COMPONENTE PARA TARJETA DE PRODUCTO CON IMAGEN MINIATURA
function ProductCard({ 
  producto = {}, 
  onEdit, 
  onDelete, 
  onToggleAvailability, 
  userRole = '', 
  formatearPrecio
}) {
  const [imageError, setImageError] = useState(false);

  // Validación temprana
  if (!producto || typeof producto !== 'object' || !producto.id) {
    return null;
  }

  const nombreSeguro = typeof producto.nombre === 'string' ? producto.nombre : 'Sin nombre';
  const precioSeguro = typeof formatearPrecio === 'function' ? formatearPrecio(producto.precio) : '$0';
  const descripcionSegura = typeof producto.descripcion === 'string' ? producto.descripcion : '';
  
  // ✅ OBTENER URL DE IMAGEN DEL PRODUCTO
  const imagenUrl = producto.imagen_url || producto.imagen;

  return (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <View style={styles.productInfo}>
          {/* ✅ IMAGEN MINIATURA DEL PRODUCTO */}
          <View style={styles.productImageContainer}>
            {imagenUrl && !imageError ? (
              <Image
                source={{ uri: imagenUrl }}
                style={styles.productImage}
                onError={() => setImageError(true)}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Ionicons name="image-outline" size={24} color="#ccc" />
              </View>
            )}
          </View>
          
          <View style={styles.productDetails}>
            <Text style={styles.productName}>{nombreSeguro}</Text>
            <Text style={styles.productPrice}>{precioSeguro}</Text>
            {descripcionSegura.length > 0 && (
              <Text style={styles.productDescription} numberOfLines={2}>
                {descripcionSegura}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.productActions}>
          {userRole === 'admin' && typeof onEdit === 'function' && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => onEdit(producto)}
            >
              <Ionicons name="pencil" size={20} color="#2196F3" />
            </TouchableOpacity>
          )}

          {userRole === 'admin' && typeof onDelete === 'function' && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => onDelete(producto.id)}
            >
              <Ionicons name="trash" size={20} color="#FF5722" />
            </TouchableOpacity>
          )}

          {typeof onToggleAvailability === 'function' && (
            <TouchableOpacity
              style={[
                styles.toggleButton,
                { backgroundColor: producto.disponible ? '#4CAF50' : '#FF9800' }
              ]}
              onPress={() => onToggleAvailability(producto)}
              disabled={userRole !== 'admin'}
            >
              <Ionicons 
                name={producto.disponible ? "eye-outline" : "eye-off-outline"} 
                size={20} 
                color="white" 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.productMetadata}>
        <View style={styles.productBadges}>
          {producto.vegetariano === true && (
            <View style={[styles.badge, styles.vegetarianBadge]}>
              <Ionicons name="leaf" size={12} color="#4CAF50" />
              <Text style={styles.badgeText}>Vegetariano</Text>
            </View>
          )}
          {producto.picante === true && (
            <View style={[styles.badge, styles.spicyBadge]}>
              <Ionicons name="flame" size={12} color="#FF5722" />
              <Text style={styles.badgeText}>Picante</Text>
            </View>
          )}
          {producto.disponible === false && (
            <View style={[styles.badge, styles.unavailableBadge]}>
              <Ionicons name="ban" size={12} color="#FF9800" />
              <Text style={styles.badgeText}>No disponible</Text>
            </View>
          )}
          {producto._pendingSync === true && (
            <View style={[styles.badge, styles.pendingSyncBadge]}>
              <Ionicons name="sync" size={12} color="#2196F3" />
              <Text style={styles.badgeText}>Pendiente</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ✅ ESTILOS COMPLETOS CON NUEVOS ESTILOS PARA IMÁGENES MINIATURA
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  statusContainer: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  statusText: {
    color: '#1565c0',
    fontSize: 14,
    fontWeight: '500',
  },
  statusSubtext: {
    color: '#1565c0',
    fontSize: 12,
    marginTop: 2,
  },
  statusSuccess: {
    backgroundColor: '#e8f5e8',
    borderLeftColor: '#4caf50',
  },
  statusError: {
    backgroundColor: '#ffebee',
    borderLeftColor: '#f44336',
  },
  alertContainer: {
    backgroundColor: '#fff3e0',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertText: {
    color: '#e65100',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  formContainer: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
  },
  advancedToggleText: {
    color: '#007AFF',
    fontSize: 14,
    marginRight: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#fff5f5',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  pricePreview: {
    color: '#4CAF50',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  // ✅ NUEVOS ESTILOS PARA CATEGORÍAS DINÁMICAS
  loadingCategorias: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  loadingCategoriasText: {
    marginLeft: 8,
    color: '#6c757d',
    fontSize: 14,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  picker: {
    height: 50,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  // ✅ Estilos para manejo de imágenes mejorados
  imageContainer: {
    position: 'relative',
    marginTop: 8,
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  imageTypeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  imageTypeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#2196F3',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  imageErrorText: {
    color: '#FF5722',
    fontSize: 12,
    marginTop: 4,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF5722',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  uploadingText: {
    color: '#007AFF',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '80%',
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  imagePickerButton: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9ff',
    minHeight: 120,
  },
  imagePickerText: {
    color: '#007AFF',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  imagePickerSubtext: {
    color: '#7f8c8d',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  addButton: {
    backgroundColor: '#4CAF50',
  },
  updateButton: {
    backgroundColor: '#2196F3',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    margin: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  countBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  productCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
    flexDirection: 'row',
  },
  // ✅ NUEVOS ESTILOS PARA IMAGEN MINIATURA EN TARJETAS
  productImageContainer: {
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  productDetails: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    lineHeight: 20,
  },
  productPrice: {
    fontSize: 15,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginTop: 2,
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  editButton: {
    padding: 8,
    marginHorizontal: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  deleteButton: {
    padding: 8,
    marginHorizontal: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
  },
  toggleButton: {
    padding: 8,
    borderRadius: 16,
    marginLeft: 4,
    minWidth: 36,
    alignItems: 'center',
  },
  productMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  productBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 3,
  },
  vegetarianBadge: {
    backgroundColor: '#e8f5e8',
  },
  spicyBadge: {
    backgroundColor: '#fff3e0',
  },
  unavailableBadge: {
    backgroundColor: '#fff3e0',
  },
  pendingSyncBadge: {
    backgroundColor: '#e3f2fd',
  },
  badgeText: {
    fontSize: 10,
    marginLeft: 3,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
