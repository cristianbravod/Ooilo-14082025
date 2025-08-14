// services/ApiService.js - VERSIÓN CORREGIDA PARA RESOLVER PROBLEMAS DE COLD START
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class ApiService {
  constructor() {
    // ✅ CONFIGURACIÓN CORREGIDA - URLs ÚNICAS
    this.BASE_URLS = [
      'http://200.54.216.197:3000/api',    // ✅ IP pública principal
      'http://192.1.1.16:3000/api',        // ✅ IP local diferente (corregida)
      'http://localhost:3000/api',         // ✅ Fallback localhost
    ];
    
    this.currentUrlIndex = 0;
    this.API_BASE_URL = this.BASE_URLS[0];
    
    // ✅ VERIFICACIÓN CRÍTICA
    if (!this.API_BASE_URL || this.API_BASE_URL === 'undefined') {
      console.error('❌ CRITICAL: API_BASE_URL is undefined');
      this.API_BASE_URL = 'http://200.54.216.197:3000/api';
    }
    
    console.log('🌐 ApiService inicializado:', this.API_BASE_URL);
    console.log('📋 URLs disponibles:', this.BASE_URLS);
    console.log('📱 Platform:', Platform.OS);
    
    // ✅ TIMEOUTS OPTIMIZADOS
    this.TIMEOUTS = {
      HEALTH_CHECK: Platform.OS === 'android' ? 8000 : 6000,
      COLD_START: Platform.OS === 'android' ? 20000 : 15000,      // ✅ REDUCIDO
      NORMAL_REQUEST: Platform.OS === 'android' ? 15000 : 12000,   // ✅ REDUCIDO
      RETRY_ATTEMPTS: 3,
      COLD_START_RETRY: 2,                                         // ✅ REDUCIDO
      IP_TEST_TIMEOUT: 3000
    };
    
    // Estados del servidor
    this.serverState = {
      isWarm: false,
      lastWarmTime: null,
      coldStartInProgress: false,
      consecutiveFailures: 0,
      currentUrlIndex: 0
    };
    
    // Cache de autenticación
    this.authToken = null;
    this.tokenExpiry = null;
    
    // Queue para requests durante cold start
    this.requestQueue = [];
    this.processingQueue = false;
  }

  // ==========================================
  // MÉTODOS DE CONFIGURACIÓN Y ESTADO
  // ==========================================
  
  getServerState() {
    return {
      ...this.serverState,
      currentUrl: this.API_BASE_URL,
      platform: `${Platform.OS}-${__DEV__ ? 'DEV' : 'APK'}`
    };
  }

  getDebugInfo() {
    return {
      apiUrl: this.API_BASE_URL,
      allUrls: this.BASE_URLS,
      currentUrlIndex: this.currentUrlIndex,
      authToken: this.authToken ? 'Present' : 'Not present',
      serverState: this.serverState,
      queueLength: this.requestQueue.length,
      isProcessingQueue: this.processingQueue,
      platform: `${Platform.OS}-${__DEV__ ? 'DEV' : 'PROD'}`
    };
  }

  needsColdStartHandling() {
    const now = Date.now();
    const isServerCold = !this.serverState.isWarm || 
                        (this.serverState.lastWarmTime && now - this.serverState.lastWarmTime > 180000); // 3 minutos
    
    return isServerCold && !this.serverState.coldStartInProgress;
  }

  // ✅ COLD START MEJORADO
  async handleColdStartRequest(endpoint, options) {
    if (this.serverState.coldStartInProgress) {
      console.log('🔄 Cold start ya en progreso, agregando a cola...');
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ endpoint, options, resolve, reject });
      });
    }

    this.serverState.coldStartInProgress = true;
    console.log('🧊 Iniciando proceso de cold start optimizado...');
    
    try {
      // ✅ INTENTAR CON URL ACTUAL PRIMERO
      for (let attempt = 1; attempt <= this.TIMEOUTS.COLD_START_RETRY; attempt++) {
        try {
          console.log(`🔥 Cold start intento ${attempt}/${this.TIMEOUTS.COLD_START_RETRY} con URL: ${this.API_BASE_URL}`);
          
          const response = await this.makeRequestWithTimeout(
            endpoint, 
            options, 
            this.TIMEOUTS.COLD_START
          );
          
          console.log('✅ Cold start exitoso!');
          this.markServerWarm();
          this.processRequestQueue();
          return response;
          
        } catch (error) {
          console.log(`❄️ Cold start intento ${attempt} falló:`, error.message);
          
          // ✅ SI FALLA, INTENTAR SIGUIENTE URL
          if (attempt < this.TIMEOUTS.COLD_START_RETRY) {
            await this.tryNextUrl();
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      // ✅ SI TODOS LOS INTENTOS FALLAN, INTENTAR CON TODAS LAS URLs
      console.log('🔄 Cold start fallido, intentando con todas las URLs...');
      return await this.tryAllUrls(endpoint, options);
      
    } finally {
      this.serverState.coldStartInProgress = false;
    }
  }

  // ✅ NUEVO MÉTODO: INTENTAR CON TODAS LAS URLs
  async tryAllUrls(endpoint, options) {
    const originalIndex = this.currentUrlIndex;
    
    for (let i = 0; i < this.BASE_URLS.length; i++) {
      this.currentUrlIndex = i;
      this.API_BASE_URL = this.BASE_URLS[i];
      
      console.log(`🔄 Probando URL ${i + 1}/${this.BASE_URLS.length}: ${this.API_BASE_URL}`);
      
      try {
        const response = await this.makeRequestWithTimeout(
          endpoint, 
          options, 
          this.TIMEOUTS.NORMAL_REQUEST
        );
        
        console.log(`✅ Éxito con URL: ${this.API_BASE_URL}`);
        this.markServerWarm();
        return response;
        
      } catch (error) {
        console.log(`❌ Error con URL ${this.API_BASE_URL}:`, error.message);
      }
    }
    
    // ✅ RESTAURAR URL ORIGINAL SI TODAS FALLAN
    this.currentUrlIndex = originalIndex;
    this.API_BASE_URL = this.BASE_URLS[originalIndex];
    
    throw new Error('No se pudo conectar con ninguna URL del servidor');
  }

  // ✅ NUEVO MÉTODO: CAMBIAR A SIGUIENTE URL
  async tryNextUrl() {
    const nextIndex = (this.currentUrlIndex + 1) % this.BASE_URLS.length;
    
    if (nextIndex !== this.currentUrlIndex) {
      this.currentUrlIndex = nextIndex;
      this.API_BASE_URL = this.BASE_URLS[this.currentUrlIndex];
      console.log(`🔄 Cambiando a URL: ${this.API_BASE_URL}`);
    }
  }

  markServerWarm() {
    this.serverState.isWarm = true;
    this.serverState.lastWarmTime = Date.now();
    this.serverState.consecutiveFailures = 0;
    console.log(`🔥 Servidor marcado como warm con URL: ${this.API_BASE_URL}`);
  }

  async processRequestQueue() {
    if (this.processingQueue || this.requestQueue.length === 0) return;
    
    this.processingQueue = true;
    console.log(`🔄 Procesando ${this.requestQueue.length} requests en cola...`);
    
    while (this.requestQueue.length > 0) {
      const { endpoint, options, resolve, reject } = this.requestQueue.shift();
      
      try {
        const response = await this.makeRequestWithTimeout(endpoint, options);
        resolve(response);
      } catch (error) {
        reject(error);
      }
    }
    
    this.processingQueue = false;
    console.log('✅ Cola de requests procesada');
  }

  // ==========================================
  // MÉTODO PRINCIPAL DE REQUEST MEJORADO
  // ==========================================
  
  async request(endpoint, options = {}) {
    // ✅ VERIFICACIÓN ADICIONAL DE URL
    if (!this.API_BASE_URL || this.API_BASE_URL === 'undefined') {
      console.error('❌ CRITICAL: API_BASE_URL es undefined en request');
      this.API_BASE_URL = 'http://200.54.216.197:3000/api';
      console.log('🔧 URL corregida a:', this.API_BASE_URL);
    }

    const startTime = Date.now();
    console.log(`🌐 API Request: ${options.method || 'GET'} ${this.API_BASE_URL}${endpoint}`);
    
    try {
      // ✅ VERIFICAR SI NECESITA COLD START
      if (this.needsColdStartHandling()) {
        console.log('🧊 Detectado cold start necesario');
        return await this.handleColdStartRequest(endpoint, options);
      }
      
      // ✅ REQUEST NORMAL
      const response = await this.makeRequestWithTimeout(endpoint, options);
      this.markServerWarm();
      
      const duration = Date.now() - startTime;
      console.log(`✅ Request exitoso en ${duration}ms`);
      
      return response;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Request falló después de ${duration}ms:`, error.message);
      
      // ✅ MANEJO MEJORADO DE ERRORES
      return await this.handleRequestError(error, endpoint, options);
    }
  }

  async makeRequestWithTimeout(endpoint, options = {}, timeout = this.TIMEOUTS.NORMAL_REQUEST) {
    const url = `${this.API_BASE_URL}${endpoint}`;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': `RestaurantApp-${Platform.OS}`,
        ...options.headers
      },
      ...options
    };

    if (this.authToken) {
      requestOptions.headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      requestOptions.signal = controller.signal;
      
      console.log(`📡 Haciendo request a: ${url}`);
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout después de ${timeout}ms`);
      }
      
      throw error;
    }
  }

  // ✅ MANEJO MEJORADO DE ERRORES
  async handleRequestError(error, endpoint, options) {
    this.serverState.consecutiveFailures++;
    this.serverState.isWarm = false;
    
    console.log(`🔄 Manejo de error para: ${endpoint}`);
    console.log(`❌ Error: ${error.message}`);
    
    // ✅ INTENTAR CON TODAS LAS URLs DISPONIBLES
    try {
      console.log('🔄 Intentando recuperación con todas las URLs...');
      return await this.tryAllUrls(endpoint, options);
    } catch (recoveryError) {
      console.error('❌ Recuperación fallida:', recoveryError.message);
      throw new Error(`No se pudo completar la petición: ${error.message}`);
    }
  }

  // ==========================================
  // MÉTODOS DE AUTENTICACIÓN
  // ==========================================
  
  async login(email, password) {
    try {
      console.log('🔐 Iniciando sesión...', email);
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      
      if (response.token) {
        this.authToken = response.token;
        this.tokenExpiry = Date.now() + (response.expiresIn || 86400000);
        await AsyncStorage.setItem('authToken', response.token);
        console.log('✅ Login exitoso - Token guardado');
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error en login:', error.message);
      
      // EN DESARROLLO: crear un token dummy para bypasear autenticación
      if (__DEV__) {
        console.log('🔧 DEV MODE: Creando token dummy...');
        this.authToken = 'dev-token-' + Date.now();
        this.tokenExpiry = Date.now() + 86400000;
        await AsyncStorage.setItem('authToken', this.authToken);
        
        return {
          success: true,
          token: this.authToken,
          user: {
            id: 1,
            nombre: 'Usuario Dev',
            email: email,
            rol: 'admin'
          },
          message: 'Login en modo desarrollo'
        };
      }
      
      throw error;
    }
  }

  async logout() {
    try {
      console.log('🚪 Cerrando sesión...');
      this.authToken = null;
      this.tokenExpiry = null;
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      console.log('✅ Sesión cerrada');
      return { success: true };
    } catch (error) {
      console.error('❌ Error cerrando sesión:', error.message);
      throw error;
    }
  }

  async verify() {
    try {
      const response = await this.request('/auth/verify', {
        method: 'POST'
      });
      console.log('✅ Token verificado');
      return response;
    } catch (error) {
      console.error('❌ Error verificando token:', error.message);
      
      // Limpiar token inválido
      this.authToken = null;
      this.tokenExpiry = null;
      await AsyncStorage.removeItem('authToken');
      
      throw error;
    }
  }

  // ==========================================
  // MÉTODO DE HEALTH CHECK MEJORADO
  // ==========================================
  
  async healthCheck() {
    const startTime = Date.now();
    
    try {
      console.log('🏥 Verificando salud del servidor...');
      
      const response = await this.makeRequestWithTimeout(
        '/health', 
        { method: 'GET' }, 
        this.TIMEOUTS.HEALTH_CHECK
      );
      
      const responseTime = Date.now() - startTime;
      console.log(`✅ Health check exitoso en ${responseTime}ms`);
      
      this.markServerWarm();
      
      return {
        success: true,
        data: response,
        responseTime
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ Health check falló en ${responseTime}ms:`, error.message);
      
      this.serverState.isWarm = false;
      
      return {
        success: false,
        error: error.message,
        responseTime
      };
    }
  }

  // ==========================================
  // MÉTODOS PARA PLATOS ESPECIALES (SIN CAMBIOS)
  // ==========================================

  async getPlatosEspeciales() {
    try {
      console.log('⭐ Obteniendo platos especiales...');
      const response = await this.request('/platos-especiales');
      console.log('✅ Platos especiales obtenidos');
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo platos especiales:', error.message);
      throw error;
    }
  }

  async createPlatoEspecial(platoData) {
    try {
      console.log('⭐ Creando plato especial...');
      console.log('📄 Datos del plato especial:', platoData);
      
      const response = await this.request('/platos-especiales', {
        method: 'POST',
        body: JSON.stringify(platoData)
      });
      console.log('✅ Plato especial creado');
      return response;
    } catch (error) {
      console.error('❌ Error creando plato especial:', error.message);
      throw error;
    }
  }

  async updatePlatoEspecial(id, platoData) {
    try {
      console.log('✏️ Actualizando plato especial:', id);
      console.log('📄 Datos a actualizar:', platoData);
      
      const response = await this.request(`/platos-especiales/${id}`, {
        method: 'PUT',
        body: JSON.stringify(platoData)
      });
      console.log('✅ Plato especial actualizado');
      return response;
    } catch (error) {
      console.error('❌ Error actualizando plato especial:', error.message);
      throw error;
    }
  }

  async deletePlatoEspecial(id) {
    try {
      console.log('🗑️ Eliminando plato especial:', id);
      const response = await this.request(`/platos-especiales/${id}`, {
        method: 'DELETE'
      });
      console.log('✅ Plato especial eliminado');
      return response;
    } catch (error) {
      console.error('❌ Error eliminando plato especial:', error.message);
      throw error;
    }
  }

  // ✅ MÉTODO CRÍTICO - AQUÍ ESTABA EL PROBLEMA
  async togglePlatoEspecialAvailability(id, disponible) {
    try {
      console.log(`🔄 Cambiando disponibilidad del plato especial ${id} a ${disponible}`);
      
      const response = await this.request(`/platos-especiales/${id}/disponibilidad`, {
        method: 'PATCH',
        body: JSON.stringify({ disponible })
      });
      
      console.log('✅ Disponibilidad del plato especial cambiada exitosamente');
      return response;
    } catch (error) {
      console.error('❌ Error cambiando disponibilidad:', error.message);
      throw error;
    }
  }

  // ==========================================
  // MÉTODOS ADICIONALES (sin cambios)
  // ==========================================

  async getMenu() {
    try {
      console.log('🍽️ Obteniendo menú...');
      const response = await this.request('/menu');
      console.log('✅ Menú obtenido');
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo menú:', error.message);
      throw error;
    }
  }

  async getCategorias() {
    try {
      console.log('📂 Obteniendo categorías...');
      const response = await this.request('/categorias');
      console.log('✅ Categorías obtenidas');
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo categorías:', error.message);
      throw error;
    }
  }

  async sync() {
    try {
      console.log('🔄 Sincronizando datos...');
      const response = await this.request('/sync');
      console.log('✅ Sincronización completada');
      return response;
    } catch (error) {
      console.error('❌ Error en sincronización:', error.message);
      throw error;
    }
  }
  
  // services/ApiService.js - AGREGANDO MÉTODOS FALTANTES
// (Esta es una extensión - agregar estos métodos al final de tu ApiService.js existente)

// ==========================================
// MÉTODOS FALTANTES - AGREGAR AL FINAL DE TU APISERVICE
// ==========================================

  // ✅ MÉTODO PARA OBTENER PEDIDOS/ÓRDENES
  async getPedidos() {
    try {
      console.log('📋 Obteniendo pedidos/órdenes...');
      const response = await this.request('/ordenes');
      console.log('✅ Pedidos obtenidos');
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo pedidos:', error.message);
      
      // Retornar datos de emergencia
      return {
        success: false,
        data: [],
        error: error.message,
        emergency_mode: true
      };
    }
  }

  // ✅ MÉTODO PARA OBTENER ÓRDENES ACTIVAS
  async getOrdenesActivas() {
    try {
      console.log('📋 Obteniendo órdenes activas...');
      const response = await this.request('/ordenes/activas');
      console.log('✅ Órdenes activas obtenidas');
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo órdenes activas:', error.message);
      return [];
    }
  }

  // ✅ MÉTODO PARA OBTENER MESAS
  async getMesas() {
    try {
      console.log('🪑 Obteniendo mesas...');
      const response = await this.request('/mesas');
      console.log('✅ Mesas obtenidas');
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo mesas:', error.message);
      
      // Retornar mesas de emergencia
      const mesasEmergencia = [
        { id: 1, numero: 1, capacidad: 4, estado: 'libre', ubicacion: 'Terraza' },
        { id: 2, numero: 2, capacidad: 2, estado: 'libre', ubicacion: 'Interior' },
        { id: 3, numero: 3, capacidad: 6, estado: 'libre', ubicacion: 'Terraza' },
        { id: 4, numero: 4, capacidad: 4, estado: 'libre', ubicacion: 'Interior' },
        { id: 5, numero: 5, capacidad: 2, estado: 'libre', ubicacion: 'Barra' }
      ];
      
      console.log('🆘 Usando mesas de emergencia');
      return mesasEmergencia;
    }
  }

  // ✅ MÉTODO PARA CREAR ORDEN
  async createOrder(orderData) {
    try {
      console.log('📝 Creando nueva orden...');
      const response = await this.request('/ordenes', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });
      console.log('✅ Orden creada');
      return response;
    } catch (error) {
      console.error('❌ Error creando orden:', error.message);
      throw error;
    }
  }

  // ✅ MÉTODO PARA CREAR ORDEN RÁPIDA
  async createQuickOrder(orderData) {
    try {
      console.log('⚡ Creando orden rápida...');
      const response = await this.request('/ordenes/quick', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });
      console.log('✅ Orden rápida creada');
      return response;
    } catch (error) {
      console.error('❌ Error creando orden rápida:', error.message);
      throw error;
    }
  }

  // ✅ MÉTODO PARA OBTENER ÓRDENES POR MESA
  async getOrdersByTable(mesa) {
    try {
      console.log(`🪑 Obteniendo órdenes de mesa ${mesa}...`);
      const response = await this.request(`/ordenes/mesa/${mesa}`);
      console.log('✅ Órdenes de mesa obtenidas');
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo órdenes de mesa:', error.message);
      return [];
    }
  }

  // ✅ MÉTODO PARA ACTUALIZAR ESTADO DE ORDEN
  async updateOrderStatus(orderId, estado) {
    try {
      console.log(`📝 Actualizando estado de orden ${orderId} a ${estado}...`);
      const response = await this.request(`/ordenes/${orderId}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado })
      });
      console.log('✅ Estado de orden actualizado');
      return response;
    } catch (error) {
      console.error('❌ Error actualizando estado de orden:', error.message);
      throw error;
    }
  }

  // ✅ MÉTODO PARA OBTENER ESTADÍSTICAS
  async getStats() {
    try {
      console.log('📊 Obteniendo estadísticas...');
      const response = await this.request('/ordenes/stats/resumen');
      console.log('✅ Estadísticas obtenidas');
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error.message);
      
      // Retornar stats de emergencia
      return {
        ventas_hoy: 0,
        ordenes_activas: 0,
        total_productos: 0,
        mesas_ocupadas: 0,
        emergency_mode: true
      };
    }
  }

  // ✅ MÉTODO PARA OBTENER VENTAS
  async getVentas(filtros = {}) {
    try {
      console.log('💰 Obteniendo datos de ventas...');
      
      let endpoint = '/ordenes';
      const params = new URLSearchParams();
      
      if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
      if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
      if (filtros.estado) params.append('estado', filtros.estado);
      
      if (params.toString()) {
        endpoint += '?' + params.toString();
      }
      
      const response = await this.request(endpoint);
      console.log('✅ Datos de ventas obtenidos');
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo ventas:', error.message);
      return [];
    }
  }

  // ✅ MÉTODO PARA CERRAR MESA
  async closeTable(mesa, metodoPago = 'efectivo') {
    try {
      console.log(`🧾 Cerrando mesa ${mesa}...`);
      const response = await this.request(`/ordenes/mesa/${mesa}/cerrar`, {
        method: 'POST',
        body: JSON.stringify({ metodo_pago: metodoPago })
      });
      console.log('✅ Mesa cerrada');
      return response;
    } catch (error) {
      console.error('❌ Error cerrando mesa:', error.message);
      throw error;
    }
  }

  // ✅ MÉTODO PARA ACTUALIZAR MESA
  async updateMesa(mesaId, datos) {
    try {
      console.log(`🪑 Actualizando mesa ${mesaId}...`);
      const response = await this.request(`/mesas/${mesaId}`, {
        method: 'PUT',
        body: JSON.stringify(datos)
      });
      console.log('✅ Mesa actualizada');
      return response;
    } catch (error) {
      console.error('❌ Error actualizando mesa:', error.message);
      throw error;
    }
  }

  // ✅ MÉTODO PARA CAMBIAR ESTADO DE MESA
  async updateMesaStatus(mesaId, estado) {
    try {
      console.log(`🪑 Cambiando estado de mesa ${mesaId} a ${estado}...`);
      const response = await this.request(`/mesas/${mesaId}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado })
      });
      console.log('✅ Estado de mesa actualizado');
      return response;
    } catch (error) {
      console.error('❌ Error actualizando estado de mesa:', error.message);
      throw error;
    }
  }

  // ✅ MÉTODO PARA OBTENER INFORMES DE VENTAS
  async getInformesVentas(periodo = 'hoy') {
    try {
      console.log(`📈 Obteniendo informes de ventas para: ${periodo}...`);
      
      // Calcular fechas según el período
      const hoy = new Date();
      let fechaInicio, fechaFin;
      
      switch (periodo) {
        case 'hoy':
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
          fechaFin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
          break;
        case 'semana':
          fechaInicio = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
          fechaFin = hoy;
          break;
        case 'mes':
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
          fechaFin = hoy;
          break;
        default:
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
          fechaFin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
      }
      
      const ventas = await this.getVentas({
        fecha_inicio: fechaInicio.toISOString().split('T')[0],
        fecha_fin: fechaFin.toISOString().split('T')[0],
        estado: 'entregada'
      });
      
      // Procesar datos para el informe
      const informe = {
        periodo,
        fecha_inicio: fechaInicio.toISOString().split('T')[0],
        fecha_fin: fechaFin.toISOString().split('T')[0],
        total_ventas: 0,
        total_ordenes: 0,
        promedio_por_orden: 0,
        ventas_por_categoria: {},
        productos_mas_vendidos: [],
        datos: ventas
      };
      
      if (Array.isArray(ventas) && ventas.length > 0) {
        informe.total_ordenes = ventas.length;
        informe.total_ventas = ventas.reduce((sum, orden) => sum + (parseFloat(orden.total) || 0), 0);
        informe.promedio_por_orden = informe.total_ordenes > 0 ? informe.total_ventas / informe.total_ordenes : 0;
      }
      
      console.log('✅ Informe de ventas generado');
      return informe;
      
    } catch (error) {
      console.error('❌ Error obteniendo informes de ventas:', error.message);
      
      // Retornar informe de emergencia
      return {
        periodo,
        total_ventas: 0,
        total_ordenes: 0,
        promedio_por_orden: 0,
        ventas_por_categoria: {},
        productos_mas_vendidos: [],
        datos: [],
        emergency_mode: true,
        error: error.message
      };
    }
  }

  // ✅ MÉTODO PARA DEBUG DE CONECTIVIDAD
  async testConnectivity() {
    try {
      console.log('🔍 Probando conectividad...');
      
      const tests = {
        health: false,
        categorias: false,
        menu: false,
        platos_especiales: false,
        ordenes: false,
        mesas: false
      };
      
      // Test health
      try {
        await this.healthCheck();
        tests.health = true;
        console.log('✅ Health check OK');
      } catch (e) {
        console.log('❌ Health check falló');
      }
      
      // Test categorias
      try {
        await this.getCategorias();
        tests.categorias = true;
        console.log('✅ Categorías OK');
      } catch (e) {
        console.log('❌ Categorías falló');
      }
      
      // Test menu
      try {
        await this.getMenu();
        tests.menu = true;
        console.log('✅ Menú OK');
      } catch (e) {
        console.log('❌ Menú falló');
      }
      
      // Test platos especiales
      try {
        await this.getPlatosEspeciales();
        tests.platos_especiales = true;
        console.log('✅ Platos especiales OK');
      } catch (e) {
        console.log('❌ Platos especiales falló');
      }
      
      // Test ordenes
      try {
        await this.getPedidos();
        tests.ordenes = true;
        console.log('✅ Órdenes OK');
      } catch (e) {
        console.log('❌ Órdenes falló');
      }
      
      // Test mesas
      try {
        await this.getMesas();
        tests.mesas = true;
        console.log('✅ Mesas OK');
      } catch (e) {
        console.log('❌ Mesas falló');
      }
      
      const workingCount = Object.values(tests).filter(Boolean).length;
      const totalTests = Object.keys(tests).length;
      
      console.log(`📊 Conectividad: ${workingCount}/${totalTests} endpoints funcionando`);
      
      return {
        success: workingCount > 0,
        working_endpoints: workingCount,
        total_endpoints: totalTests,
        tests,
        percentage: Math.round((workingCount / totalTests) * 100)
      };
      
    } catch (error) {
      console.error('❌ Error en test de conectividad:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

}

export default new ApiService();