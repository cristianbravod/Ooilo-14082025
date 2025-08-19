// MainApp.js - CORRECCIÓN PARA LA CARGA DEL MENÚ
import React, { useState, useEffect, useCallback } from "react";
import { View, Platform, StatusBar, Alert } from "react-native";

// ✅ IMPORTACIONES SEGURAS DE SAFE AREA
import { 
  UniversalSafeAreaProvider, 
  useSafeAreaConfig,
  SafeAreaConfig,
  UniversalSafeAreaView
} from "./navigation/SafeAreaProvider";

import { useAuth } from "./contexts/AuthContext";
import ApiService from "./services/ApiService";

// ✅ COMPONENTES
import LoginScreen from "./screens/LoginScreen";
import LoadingScreen from "./components/LoadingScreen";
import AppNavigator from "./navigation/AppNavigator";

// ✅ COMPONENTE INTERNO CON SAFE AREA
function MainAppContent() {
  const { user, isLoggedIn, loading, initializing, userRole } = useAuth();
  const safeAreaConfig = useSafeAreaConfig();
  
  // ✅ ESTADOS DE LA APLICACIÓN
  const [menu, setMenu] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [platosEspeciales, setPlatosEspeciales] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [nuevoProducto, setNuevoProducto] = useState({ 
    nombre: "", 
    precio: 0, 
    categoria: "", 
    descripcion: "" 
  });
  const [modoEdicion, setModoEdicion] = useState(null);
  
  // ✅ ESTADOS DE CARGA Y SINCRONIZACIÓN
  const [datosListos, setDatosListos] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  // ✅ FUNCIÓN CORREGIDA PARA CARGAR DATOS DESDE EL BACKEND
  const cargarDatosDesdeBackend = useCallback(async () => {
    if (loading) return;

    try {
      setLoadingMessage('🔄 Conectando con el servidor...');
      setLoadingProgress(10);

      // Verificar conectividad
      try {
        await ApiService.healthCheck();
        console.log('✅ Servidor disponible');
        setIsOffline(false);
      } catch (healthError) {
        console.log('⚠️ Server status check failed:', healthError.message);
        // Continuar de todos modos, puede ser timeout pero la API funciona
      }

      setLoadingMessage('📦 Cargando datos principales...');
      setLoadingProgress(20);

      // ✅ CARGAR DATOS CON PROMISE.ALLSETTLED PARA MEJOR MANEJO DE ERRORES
      console.log('🔄 Iniciando carga paralela de datos...');

      const [menuData, categoriasData, platosEspecialesData] = await Promise.allSettled([
        ApiService.getMenu(),
        ApiService.getCategorias(), 
        ApiService.getPlatosEspeciales()
      ]);

      setLoadingProgress(50);
      setLoadingMessage('🔄 Procesando información del menú...');

      // ✅ PROCESAR MENÚ CORRECTAMENTE
      if (menuData.status === 'fulfilled') {
        const menuArray = Array.isArray(menuData.value) ? menuData.value : [];
        console.log('✅ Menú procesado:', menuArray.length, 'items');
        setMenu(menuArray); // ✅ AQUÍ ESTABA EL PROBLEMA - FALTABA ESTA LÍNEA
      } else {
        console.log('❌ Error cargando menú:', menuData.reason);
        setMenu([]); // Asegurar que el estado sea un array vacío
      }

      // ✅ PROCESAR CATEGORÍAS CORRECTAMENTE  
      if (categoriasData.status === 'fulfilled') {
        const categoriasArray = Array.isArray(categoriasData.value) ? categoriasData.value : [];
        console.log('✅ Categorías procesadas:', categoriasArray.length, 'items');
        setCategorias(categoriasArray); // ✅ ASEGURAR QUE SE GUARDEN
      } else {
        console.log('❌ Error cargando categorías:', categoriasData.reason);
        setCategorias([]);
      }

      // ✅ PROCESAR PLATOS ESPECIALES CORRECTAMENTE
      if (platosEspecialesData.status === 'fulfilled') {
        const especialesArray = Array.isArray(platosEspecialesData.value) ? platosEspecialesData.value : [];
        console.log('✅ Platos especiales procesados:', especialesArray.length, 'items');
        setPlatosEspeciales(especialesArray); // ✅ ASEGURAR QUE SE GUARDEN
      } else {
        console.log('❌ Error cargando platos especiales:', platosEspecialesData.reason);
        setPlatosEspeciales([]);
      }

      setLoadingProgress(70);
      setLoadingMessage('📊 Cargando datos adicionales...');

      // ✅ CARGAR DATOS SECUNDARIOS (PEDIDOS Y VENTAS)
      const [pedidosData, ventasData] = await Promise.allSettled([
        ApiService.getPedidos(),
        ApiService.getVentas()
      ]);

      // ✅ PROCESAR PEDIDOS
      if (pedidosData.status === 'fulfilled') {
        const pedidosArray = Array.isArray(pedidosData.value) ? 
          pedidosData.value : 
          pedidosData.value?.pedidos || [];
        setPedidos(pedidosArray);
        console.log('✅ Pedidos cargados:', pedidosArray.length, 'items');
      } else {
        console.log('⚠️ Error cargando pedidos:', pedidosData.reason);
        setPedidos([]);
      }

      // ✅ PROCESAR VENTAS
      if (ventasData.status === 'fulfilled') {
        const ventasArray = Array.isArray(ventasData.value) ? 
          ventasData.value : 
          ventasData.value?.ventas || [];
        setVentas(ventasArray);
        console.log('✅ Ventas cargadas:', ventasArray.length, 'items');
      } else {
        console.log('⚠️ Error cargando ventas:', ventasData.reason);
        setVentas([]);
      }

      setLoadingProgress(90);
      setLoadingMessage('✅ Preparando interfaz...');

      // ✅ LOGGING FINAL PARA DEBUG
      console.log('🔍 ESTADO FINAL DE DATOS:');
      console.log('   📋 Menú:', menuData.status === 'fulfilled' ? menuData.value?.length || 0 : 0, 'items');
      console.log('   📂 Categorías:', categoriasData.status === 'fulfilled' ? categoriasData.value?.length || 0 : 0, 'items');  
      console.log('   ⭐ Platos especiales:', platosEspecialesData.status === 'fulfilled' ? platosEspecialesData.value?.length || 0 : 0, 'items');

      // Simular pequeña pausa para mostrar el progreso
      await new Promise(resolve => setTimeout(resolve, 500));

      setLoadingProgress(100);
      setDatosListos(true);
      setLoadingMessage('🎉 ¡Aplicación lista!');
      setSyncStatus('✅ Datos sincronizados');

      // Limpiar mensaje después de un momento
      setTimeout(() => {
        setLoadingMessage('');
      }, 1000);

    } catch (error) {
      console.error('❌ Error crítico cargando datos:', error);
      setLoadingMessage('❌ Error cargando datos - activando modo emergencia...');
      
      // ✅ MODO EMERGENCIA CON DATOS MÍNIMOS
      console.log('🚨 Activando modo emergencia...');
      
      try {
        // Intentar cargar datos desde cache o usar fallbacks
        const datosEmergencia = await Promise.allSettled([
          // Datos de emergencia con cache
          new Promise(resolve => {
            setTimeout(() => resolve([]), 100); // Menu vacío
          }),
          new Promise(resolve => {
            setTimeout(() => resolve([
              { id: 1, nombre: 'Entradas' },
              { id: 2, nombre: 'Platos Principales' },
              { id: 3, nombre: 'Bebidas' },
              { id: 4, nombre: 'Postres' }
            ]), 100); // Categorías básicas
          }),
          new Promise(resolve => {
            setTimeout(() => resolve([]), 100); // Platos especiales vacío
          })
        ]);

        setMenu(datosEmergencia[0].status === 'fulfilled' ? datosEmergencia[0].value : []);
        setCategorias(datosEmergencia[1].status === 'fulfilled' ? datosEmergencia[1].value : []);
        setPlatosEspeciales(datosEmergencia[2].status === 'fulfilled' ? datosEmergencia[2].value : []);
        setPedidos([]);
        setVentas([]);
        
        console.log('✅ Datos de emergencia cargados');
        setIsOffline(true);
        setSyncStatus('🔴 Modo offline - funcionalidad limitada');
        
      } catch (emergencyError) {
        console.error('❌ Error en modo emergencia:', emergencyError);
        // Datos completamente vacíos pero funcionales
        setMenu([]);
        setCategorias([]);
        setPlatosEspeciales([]);
        setPedidos([]);
        setVentas([]);
      }

      setDatosListos(true);
      setLoadingMessage('📱 Modo offline activo');
    }
  }, [loading]);

  // ✅ CARGAR DATOS AL INICIAR SESIÓN
  useEffect(() => {
    if (isLoggedIn && !datosListos) {
      console.log('🚀 Usuario autenticado, cargando datos...');
      cargarDatosDesdeBackend();
    }
  }, [isLoggedIn, datosListos, cargarDatosDesdeBackend]);

  // ✅ LIMPIAR DATOS AL CERRAR SESIÓN
  useEffect(() => {
    if (!isLoggedIn) {
      console.log('👋 Sesión cerrada, limpiando datos...');
      setMenu([]);
      setPedidos([]);
      setPlatosEspeciales([]);
      setVentas([]);
      setCategorias([]);
      setDatosListos(false);
      setLoadingProgress(0);
      setLoadingMessage('');
      setSyncStatus('');
    }
  }, [isLoggedIn]);

  // ✅ FUNCIÓN DE REFRESCO MANUAL
  const handleRefresh = useCallback(async () => {
    if (loading) return;
    
    console.log('🔄 Refresco manual iniciado...');
    setDatosListos(false);
    setLoadingProgress(0);
    await cargarDatosDesdeBackend();
  }, [cargarDatosDesdeBackend, loading]);

  // ✅ LOG DE DEBUG PARA VERIFICAR ESTADOS
  useEffect(() => {
    if (datosListos) {
      console.log('🔍 DEBUG ESTADOS FINALES:', {
        menu_length: menu.length,
        categorias_length: categorias.length, 
        platosEspeciales_length: platosEspeciales.length,
        pedidos_length: pedidos.length,
        ventas_length: ventas.length
      });
    }
  }, [datosListos, menu, categorias, platosEspeciales, pedidos, ventas]);

  // ✅ RENDERIZADO CONDICIONAL
  if (initializing) {
    return (
      <LoadingScreen 
        type="initialization" 
        message="🚀 Iniciando aplicación..." 
        progress={0}
      />
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  if (isLoggedIn && !datosListos) {
    return (
      <LoadingScreen 
        type="data" 
        message={loadingMessage || '📦 Cargando datos...'} 
        progress={loadingProgress}
        isOffline={isOffline}
        syncStatus={syncStatus}
        onRetry={handleRefresh}
      />
    );
  }

  // ✅ RENDERIZAR APP PRINCIPAL CON DATOS
  return (
    <UniversalSafeAreaView style={{ flex: 1, backgroundColor: '#f8f8f8' }}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#ffffff" 
        translucent={false}
      />
      
      
      {/* Navegador principal con datos */}
      <AppNavigator 
        menu={menu}
        setMenu={setMenu}
        pedidos={pedidos}
        setPedidos={setPedidos}
        platosEspeciales={platosEspeciales}
        setPlatosEspeciales={setPlatosEspeciales}
        ventas={ventas}
        setVentas={setVentas}
        categorias={categorias}
        setCategorias={setCategorias}
        nuevoProducto={nuevoProducto}
        setNuevoProducto={setNuevoProducto}
        modoEdicion={modoEdicion}
        setModoEdicion={setModoEdicion}
        userRole={userRole}
        isOffline={isOffline}
        onRefresh={handleRefresh}
      />
    </UniversalSafeAreaView>
  );
}

// ✅ COMPONENTE PRINCIPAL CON PROVIDER
export default function MainApp() {
  return (
    <UniversalSafeAreaProvider>
      <MainAppContent />
    </UniversalSafeAreaProvider>
  );
}
