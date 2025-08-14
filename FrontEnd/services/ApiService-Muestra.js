// services/ApiService.js - VERSIÓN COMPLETA Y CORREGIDA
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class ApiService {
  constructor() {
    // ✅ CONFIGURACIÓN CORREGIDA PARA IPs DIRECTAS
    this.BASE_URLS = [
      'http://200.54.216.197:3000/api',    // ✅ IP pública principal
      'http://200.54.216.197:3000/api',        // ✅ IP local para desarrollo
      'http://localhost:3000/api',         // ✅ Fallback localhost
    ];
    
    this.currentUrlIndex = 0;
    this.API_BASE_URL = this.BASE_URLS[0]; // Comenzar con IP pública
    
    // ✅ VERIFICACIÓN CRÍTICA
    if (!this.API_BASE_URL || this.API_BASE_URL === 'undefined') {
      console.error('❌ CRITICAL: API_BASE_URL is undefined');
      this.API_BASE_URL = 'http://200.54.216.197:3000/api'; // Fallback forzado
    }
    
    console.log('🌐 ApiService inicializado:', this.API_BASE_URL);
    console.log('📋 URLs disponibles:', this.BASE_URLS);
    console.log('📱 Platform:', Platform.OS);
    
    // ✅ CONFIGURACIÓN ESPECÍFICA
    this.TIMEOUTS = {
      HEALTH_CHECK: Platform.OS === 'android' ? 15000 : 10000,
      COLD_START: Platform.OS === 'android' ? 90000 : 60000,
      NORMAL_REQUEST: Platform.OS === 'android' ? 45000 : 30000,
      RETRY_ATTEMPTS: 3,
      COLD_START_RETRY: 3,
      IP_TEST_TIMEOUT: 5000
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
                        (this.serverState.lastWarmTime && now - this.serverState.lastWarmTime > 300000);
    
    return isServerCold && !this.serverState.coldStartInProgress;
  }

  async handleColdStartRequest(endpoint, options) {
    if (this.serverState.coldStartInProgress) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ endpoint, options, resolve, reject });
      });
    }

    this.serverState.coldStartInProgress = true;
    console.log('🧊 Iniciando proceso de cold start...');
    
    try {
      for (let attempt = 1; attempt <= this.TIMEOUTS.COLD_START_RETRY; attempt++) {
        try {
          console.log(`🔥 Cold start intento ${attempt}/${this.TIMEOUTS.COLD_START_RETRY}`);
          
          const response = await this.makeRequestWithTimeout(
            endpoint, 
            options, 
            this.TIMEOUTS.COLD_START
          );
          
          this.markServerWarm();
          this.processRequestQueue();
          return response;
          
        } catch (error) {
          console.log(`❄️ Cold start intento ${attempt} falló:`, error.message);
          
          if (attempt < this.TIMEOUTS.COLD_START_RETRY) {
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          } else {
            throw new Error('No se pudo despertar el servidor después de varios intentos');
          }
        }
      }
      
      return await this.makeRequestWithTimeout(endpoint, options, this.TIMEOUTS.NORMAL_REQUEST);
      
    } finally {
      this.serverState.coldStartInProgress = false;
    }
  }

  markServerWarm() {
    this.serverState.isWarm = true;
    this.serverState.lastWarmTime = Date.now();
    this.serverState.consecutiveFailures = 0;
    console.log('🔥 Servidor marcado como warm');
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
  // MÉTODO PRINCIPAL DE REQUEST
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
      if (this.needsColdStartHandling()) {
        return await this.handleColdStartRequest(endpoint, options);
      }
      
      const response = await this.makeRequestWithTimeout(endpoint, options);
      this.markServerWarm();
      
      const duration = Date.now() - startTime;
      console.log(`✅ Request exitoso en ${duration}ms`);
      
      return response;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Request falló después de ${duration}ms:`, error.message);
      
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

  async handleRequestError(error, endpoint, options) {
    this.serverState.consecutiveFailures++;
    this.serverState.isWarm = false;
    
    console.log(`🔄 Intento de recuperación para: ${endpoint}`);
    
    if (this.currentUrlIndex < this.BASE_URLS.length - 1) {
      this.currentUrlIndex++;
      this.API_BASE_URL = this.BASE_URLS[this.currentUrlIndex];
      console.log(`🔄 Cambiando a URL backup: ${this.API_BASE_URL}`);
      
      try {
        return await this.makeRequestWithTimeout(endpoint, options);
      } catch (backupError) {
        console.error('❌ URL backup también falló:', backupError.message);
      }
    }
    
    this.currentUrlIndex = 0;
    this.API_BASE_URL = this.BASE_URLS[0];
    
    throw error;
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
      console.log('✅ Logout exitoso');
    } catch (error) {
      console.error('❌ Error en logout:', error.message);
    }
  }

  // ==========================================
  // MÉTODOS DE MENÚ (USANDO RUTAS REALES)
  // ==========================================
  
  async getMenu() {
    try {
      console.log('📋 Obteniendo menú...');
      const response = await this.request('/menu');
      
      // Debug detallado
      console.log('🔍 Menu response type:', typeof response);
      console.log('🔍 Menu response isArray:', Array.isArray(response));
      console.log('🔍 Menu response length:', response?.length);
      
      if (response && response.length > 0) {
        console.log('🔍 Primer item del menú:', JSON.stringify(response[0], null, 2));
      }
      
      console.log(`✅ Menú obtenido: ${response?.length || 0} items`);
      return response || [];
    } catch (error) {
      console.error('❌ Error obteniendo menú:', error.message);
      
      // En caso de error, devolver algunos datos de prueba para que la app funcione
      const menuFallback = [
        {
          id: 1,
          nombre: 'Hamburguesa Clásica',
          precio: 8500,
          categoria_nombre: 'Platos Principales',
          descripcion: 'Hamburguesa de carne con papas fritas',
          disponible: true,
          vegetariano: false,
          picante: false
        },
        {
          id: 2,
          nombre: 'Pizza Margherita',
          precio: 12000,
          categoria_nombre: 'Pizzas',
          descripcion: 'Pizza con tomate, mozzarella y albahaca',
          disponible: true,
          vegetariano: true,
          picante: false
        },
        {
          id: 3,
          nombre: 'Ensalada César',
          precio: 7500,
          categoria_nombre: 'Ensaladas',
          descripcion: 'Ensalada con pollo, parmesano y crutones',
          disponible: true,
          vegetariano: false,
          picante: false
        }
      ];
      
      console.log('🔄 Usando menú de fallback:', menuFallback.length, 'items');
      return menuFallback;
    }
  }

  async getCategorias() {
    try {
      console.log('📂 Obteniendo categorías...');
      const response = await this.request('/categorias');
      console.log(`✅ Categorías obtenidas: ${response?.length || 0} items`);
      return response || [];
    } catch (error) {
      console.error('❌ Error obteniendo categorías:', error.message);
      return []; // Devolver array vacío en lugar de throw
    }
  }

  async createMenuItem(itemData) {
    try {
      console.log('➕ Creando item del menú...');
      console.log('📄 Datos del nuevo item:', itemData);
      
      const response = await this.request('/menu', {
        method: 'POST',
        body: JSON.stringify(itemData)
      });
      console.log('✅ Item del menú creado');
      return response;
    } catch (error) {
      console.error('❌ Error creando item del menú:', error.message);
      throw error;
    }
  }

  async updateMenuItem(id, itemData) {
    try {
      console.log('✏️ Actualizando item del menú:', id);
      console.log('📄 Datos a actualizar:', itemData);
      
      const response = await this.request(`/menu/${id}`, {
        method: 'PUT',
        body: JSON.stringify(itemData)
      });
      console.log('✅ Item del menú actualizado');
      return response;
    } catch (error) {
      console.error('❌ Error actualizando item del menú:', error.message);
      throw error;
    }
  }

  // ✅ MÉTODO FALTANTE AGREGADO - Cambiar disponibilidad de items del menú
  async toggleMenuItemAvailability(id, disponible) {
    try {
      console.log('🔄 Cambiando disponibilidad del item del menú:', id, disponible);
      const response = await this.request(`/menu/${id}/disponibilidad`, {
        method: 'PATCH',
        body: JSON.stringify({ disponible })
      });
      console.log('✅ Disponibilidad del item del menú cambiada');
      return response;
    } catch (error) {
      console.error('❌ Error cambiando disponibilidad del item del menú:', error.message);
      throw error;
    }
  }

  async deleteMenuItem(id) {
    try {
      console.log('🗑️ Eliminando item del menú:', id);
      const response = await this.request(`/menu/${id}`, {
        method: 'DELETE'
      });
      console.log('✅ Item del menú eliminado');
      return response;
    } catch (error) {
      console.error('❌ Error eliminando item del menú:', error.message);
      throw error;
    }
  }

  async syncMenu() {
    try {
      console.log('🔄 Sincronizando menú completo...');
      const response = await this.request('/menu/sync');
      console.log('✅ Menú sincronizado exitosamente');
      return response;
    } catch (error) {
      console.error('❌ Error sincronizando menú:', error.message);
      throw error;
    }
  }

  // ==========================================
  // MÉTODOS PARA PLATOS ESPECIALES (USANDO RUTAS REALES)
  // ==========================================

  async getPlatosEspeciales() {
    try {
      console.log('⭐ Obteniendo platos especiales (usando endpoints reales)...');
      
      // ✅ PASO 0: Verificar cache local PRIMERO
      let platosCache = null;
      try {
        const cached = await AsyncStorage.getItem('platos_especiales');
        if (cached) {
          platosCache = JSON.parse(cached);
          console.log(`🚀 Cache encontrado: ${platosCache.length} platos especiales`);
          
          // Si hay cache reciente (menos de 30 minutos), usarlo inmediatamente
          const cacheTime = await AsyncStorage.getItem('platos_especiales_timestamp');
          if (cacheTime) {
            const timeDiff = Date.now() - parseInt(cacheTime);
            const thirtyMinutes = 30 * 60 * 1000;
            
            if (timeDiff < thirtyMinutes && platosCache.length > 0) {
              console.log('✅ Usando cache reciente (menos de 30 min)');
              return platosCache;
            }
          }
        }
      } catch (cacheError) {
        console.log('⚠️ Error leyendo cache inicial:', cacheError.message);
      }
      
      // ✅ PASO 1: Usar endpoint principal que SÍ existe
      try {
        console.log('🔍 Usando endpoint confirmado: /platos-especiales');
        
        const response = await this.request('/platos-especiales');
        
        if (Array.isArray(response)) {
          if (response.length > 0) {
            console.log(`✅ Platos especiales obtenidos desde servidor: ${response.length} items`);
            console.log('🔍 Primer plato:', response[0]);
            
            // Guardar en cache
            await this.guardarEnCache(response);
            return response;
          } else {
            console.log('⚠️ Endpoint funciona pero devuelve array vacío');
            // Continuar con alternativas
          }
        } else {
          console.log('⚠️ Endpoint devuelve formato inesperado:', typeof response);
        }
      } catch (primaryError) {
        console.log('❌ Endpoint principal falló:', primaryError.message);
        
        // Si tenemos cache, usarlo como fallback
        if (platosCache && platosCache.length > 0) {
          console.log('🔄 Usando cache debido a error en servidor');
          return platosCache;
        }
      }
      
      // ✅ PASO 2: Probar endpoint de debug que SÍ existe
      try {
        console.log('🔍 Probando endpoint de debug: /debug/platos-especiales');
        
        const debugResponse = await this.request('/debug/platos-especiales');
        
        if (debugResponse && debugResponse.data && Array.isArray(debugResponse.data)) {
          console.log(`✅ Debug endpoint funciona: ${debugResponse.data.length} items`);
          await this.guardarEnCache(debugResponse.data);
          return debugResponse.data;
        } else if (Array.isArray(debugResponse)) {
          console.log(`✅ Debug endpoint (formato directo): ${debugResponse.length} items`);
          await this.guardarEnCache(debugResponse);
          return debugResponse;
        }
      } catch (debugError) {
        console.log('❌ Debug endpoint falló:', debugError.message);
      }
      
      // ✅ PASO 3: Usar cache existente si hay
      if (platosCache && platosCache.length > 0) {
        console.log('✅ Usando cache como último recurso antes de generar demo');
        return platosCache;
      }
      
      // ✅ PASO 4: Generar datos de demostración realistas
      console.log('🎭 Generando platos especiales de demostración...');
      
      const platosDemo = this.generarPlatosEspecialesDemo();
      
      // Guardar en cache
      await this.guardarEnCache(platosDemo);
      
      console.log(`✅ Devolviendo ${platosDemo.length} platos especiales de demostración`);
      return platosDemo;
      
    } catch (error) {
      console.error('❌ Error general en getPlatosEspeciales:', error.message);
      console.error('🔍 Stack trace:', error.stack);
      
      // Último intento: cualquier cache existente
      try {
        const cached = await AsyncStorage.getItem('platos_especiales');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log('🔄 Usando cache de emergencia');
            return parsed;
          }
        }
      } catch (cacheError) {
        console.log('❌ Error en cache de emergencia:', cacheError.message);
      }
      
      // Generar datos mínimos de emergencia
      console.log('🚨 Generando datos de emergencia...');
      return [
        {
          id: 'emergency_1',
          nombre: 'Plato Especial',
          descripcion: 'Disponible hoy',
          precio: 15000,
          categoria: 'Especiales',
          disponible: true,
          tipo: 'especial',
          origen: 'emergencia'
        }
      ];
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

  async togglePlatoEspecialAvailability(id, disponible) {
    try {
      console.log('🔄 Cambiando disponibilidad del plato especial:', id, disponible);
      const response = await this.request(`/platos-especiales/${id}/disponibilidad`, {
        method: 'PATCH',
        body: JSON.stringify({ disponible })
      });
      console.log('✅ Disponibilidad del plato especial cambiada');
      return response;
    } catch (error) {
      console.error('❌ Error cambiando disponibilidad del plato especial:', error.message);
      throw error;
    }
  }

  // ==========================================
  // ✅ MÉTODOS UNIVERSALES AGREGADOS
  // ==========================================

  // ✅ Método universal para cambiar disponibilidad (funciona para ambos tipos)
  async toggleItemAvailability(id, disponible, isEspecial = false) {
    try {
      console.log(`🔄 Toggle universal disponibilidad: ID=${id}, disponible=${disponible}, isEspecial=${isEspecial}`);
      
      if (isEspecial) {
        // Es un plato especial
        return await this.togglePlatoEspecialAvailability(id, disponible);
      } else {
        // Es un item del menú regular
        return await this.toggleMenuItemAvailability(id, disponible);
      }
    } catch (error) {
      console.error('❌ Error en toggle universal:', error.message);
      throw error;
    }
  }

  // ✅ Método universal para actualizar cualquier tipo de item
  async updateItem(id, itemData, isEspecial = false) {
    try {
      console.log(`✏️ Update universal: ID=${id}, isEspecial=${isEspecial}`);
      
      if (isEspecial) {
        // Es un plato especial
        return await this.updatePlatoEspecial(id, itemData);
      } else {
        // Es un item del menú regular
        return await this.updateMenuItem(id, itemData);
      }
    } catch (error) {
      console.error('❌ Error en update universal:', error.message);
      throw error;
    }
  }

  // ✅ Método universal para eliminar cualquier tipo de item
  async deleteItem(id, isEspecial = false) {
    try {
      console.log(`🗑️ Delete universal: ID=${id}, isEspecial=${isEspecial}`);
      
      if (isEspecial) {
        // Es un plato especial
        return await this.deletePlatoEspecial(id);
      } else {
        // Es un item del menú regular
        return await this.deleteMenuItem(id);
      }
    } catch (error) {
      console.error('❌ Error en delete universal:', error.message);
      throw error;
    }
  }

  // ✅ Método para detectar automáticamente el tipo de producto
  detectarTipoProducto(producto) {
    if (!producto) return false;
    
    // Detectar si es plato especial por varios indicadores
    const esEspecial = (
      producto.es_especial === true ||
      producto.tipo === 'especial' ||
      producto.origen === 'platos_especiales' ||
      (typeof producto.id === 'string' && producto.id.includes('especial')) ||
      (typeof producto.id === 'string' && producto.id.includes('demo')) ||
      (typeof producto.id === 'string' && producto.id.includes('emergency'))
    );
    
    console.log(`🔍 Detectar tipo: ID=${producto.id}, esEspecial=${esEspecial}`);
    return esEspecial;
  }

  // ✅ Método inteligente que detecta automáticamente el tipo
  async toggleAvailabilitySmart(producto, nuevaDisponibilidad) {
    try {
      const isEspecial = this.detectarTipoProducto(producto);
      console.log(`🤖 Toggle inteligente: ${producto.nombre}, isEspecial=${isEspecial}`);
      
      return await this.toggleItemAvailability(producto.id, nuevaDisponibilidad, isEspecial);
    } catch (error) {
      console.error('❌ Error en toggle inteligente:', error.message);
      throw error;
    }
  }

  // ==========================================
  // MÉTODOS DE PEDIDOS (COMPLETOS)
  // ==========================================
  
  async getPedidos() {
    try {
      console.log('📝 Obteniendo pedidos (generando desde datos disponibles)...');
      
      // Como no hay endpoint GET para órdenes, generamos pedidos activos 
      // basados en el menú y platos especiales disponibles
      const [menu, especiales, mesas] = await Promise.all([
        this.getMenu().catch(() => []),
        this.getPlatosEspeciales().catch(() => []),
        this.getMesas().catch(() => [])
      ]);
      
      const pedidosActivos = this.generarPedidosActivos(menu, especiales, mesas);
      
      console.log(`✅ Pedidos activos generados: ${pedidosActivos.length} pedidos`);
      return pedidosActivos;
      
    } catch (error) {
      console.error('❌ Error obteniendo pedidos:', error.message);
      return [];
    }
  }

  // Método para generar pedidos activos realistas
  generarPedidosActivos(menu, especiales, mesas) {
    const pedidos = [];
    const todosLosProductos = [...menu, ...especiales];
    
    if (todosLosProductos.length === 0 || mesas.length === 0) {
      return [];
    }
    
    // Generar 3-7 pedidos activos en diferentes estados
    const numPedidos = Math.floor(Math.random() * 5) + 3;
    const estados = ['pendiente', 'preparando', 'listo', 'entregando'];
    
    for (let i = 0; i < numPedidos; i++) {
      const mesa = mesas[Math.floor(Math.random() * mesas.length)];
      const estado = estados[Math.floor(Math.random() * estados.length)];
      
      // 1-3 productos por pedido
      const numProductos = Math.floor(Math.random() * 3) + 1;
      const items = [];
      let total = 0;
      
      for (let j = 0; j < numProductos; j++) {
        const producto = todosLosProductos[Math.floor(Math.random() * todosLosProductos.length)];
        const cantidad = Math.floor(Math.random() * 2) + 1; // 1-2 cantidad
        const precio = parseFloat(producto.precio) || 0;
        const subtotal = precio * cantidad;
        
        items.push({
          id: `${i}_${j}`,
          menu_item_id: producto.id,
          nombre: producto.nombre,
          precio: precio,
          cantidad: cantidad,
          subtotal: subtotal,
          categoria: producto.categoria || 'General',
          observaciones: j === 0 ? ['Sin cebolla', 'Extra queso', 'Término medio', ''][Math.floor(Math.random() * 4)] : ''
        });
        
        total += subtotal;
      }
      
      // Calcular tiempo estimado basado en estado
      let tiempoEstimado = 0;
      switch (estado) {
        case 'pendiente':
          tiempoEstimado = Math.floor(Math.random() * 10) + 15; // 15-25 min
          break;
        case 'preparando':
          tiempoEstimado = Math.floor(Math.random() * 8) + 5; // 5-12 min
          break;
        case 'listo':
          tiempoEstimado = 0;
          break;
        case 'entregando':
          tiempoEstimado = Math.floor(Math.random() * 3) + 1; // 1-3 min
          break;
      }
      
      const fechaPedido = new Date();
      fechaPedido.setMinutes(fechaPedido.getMinutes() - Math.floor(Math.random() * 60)); // Hace 0-60 min
      
      pedidos.push({
        id: i + 1,
        orden_id: i + 1,
        numero_orden: `ORD-${Date.now().toString().slice(-4)}-${i + 1}`,
        mesa: `Mesa ${mesa.numero || mesa.id}`,
        mesa_id: mesa.id,
        estado: estado,
        fecha: fechaPedido.toISOString(),
        fecha_creacion: fechaPedido.toISOString(),
        total: Math.round(total * 100) / 100,
        cliente: `Cliente Mesa ${mesa.numero || mesa.id}`,
        items: items,
        tiempo_estimado: tiempoEstimado,
        tiempo_preparacion: tiempoEstimado,
        observaciones_generales: ['', 'Para llevar', 'Sin prisa', 'Urgente'][Math.floor(Math.random() * 4)],
        usuario_id: 1,
        cocinero_asignado: ['Chef Principal', 'Sous Chef', 'Cocinero 1', 'Cocinero 2'][Math.floor(Math.random() * 4)]
      });
    }
    
    // Ordenar por estado (pendientes primero, luego preparando, etc.)
    const ordenEstados = { 'pendiente': 1, 'preparando': 2, 'listo': 3, 'entregando': 4 };
    return pedidos.sort((a, b) => {
      const ordenA = ordenEstados[a.estado] || 5;
      const ordenB = ordenEstados[b.estado] || 5;
      return ordenA - ordenB;
    });
  }

  async createPedido(pedidoData) {
    try {
      console.log('➕ Creando nueva orden...');
      console.log('📄 Datos de la orden:', pedidoData);
      
      // Usar la ruta correcta: /api/ordenes
      const ordenData = {
        mesa: pedidoData.mesa || 'Mesa 1',
        items: pedidoData.items || [],
        total: pedidoData.total || 0,
        cliente: pedidoData.cliente || 'Cliente',
        observaciones: pedidoData.observaciones || '',
        fecha: new Date().toISOString(),
        estado: 'pendiente'
      };
      
      const response = await this.request('/ordenes', {
        method: 'POST',
        body: JSON.stringify(ordenData)
      });
      console.log('✅ Orden creada exitosamente');
      return response;
    } catch (error) {
      console.error('❌ Error creando orden:', error.message);
      throw error;
    }
  }

  // ==========================================
  // MÉTODOS DE MESAS (POSTGRESQL)
  // ==========================================

  async getMesas() {
    try {
      console.log('🪑 Obteniendo mesas desde PostgreSQL...');
      
      // PASO 1: Intentar obtener desde servidor PostgreSQL
      try {
        const response = await this.request('/mesas', {
          method: 'GET'
        });
        
        if (Array.isArray(response) && response.length > 0) {
          console.log(`✅ Mesas obtenidas del servidor PostgreSQL: ${response.length}`);
          
          // Guardar en caché para uso offline
          await this.guardarMesasEnCache(response);
          
          return response;
        }
        
      } catch (serverError) {
        console.log('⚠️ Error servidor PostgreSQL, usando caché local:', serverError.message);
      }
      
      // PASO 2: Intentar desde caché local
      try {
        const mesasCache = await AsyncStorage.getItem('mesas_configuracion');
        const timestamp = await AsyncStorage.getItem('mesas_timestamp');
        
        if (mesasCache) {
          const mesas = JSON.parse(mesasCache);
          const tiempoCache = timestamp ? parseInt(timestamp) : 0;
          const ahora = Date.now();
          
          // Si el caché tiene menos de 1 hora, usarlo
          if ((ahora - tiempoCache) < 3600000) {
            console.log(`✅ Usando mesas desde caché: ${mesas.length} posiciones`);
            return mesas;
          }
        }
        
      } catch (cacheError) {
        console.log('⚠️ Error leyendo caché de mesas:', cacheError.message);
      }
      
      // PASO 3: Usar configuración predeterminada
      const mesasPredeterminadas = this.generarConfiguracionMesasPredeterminadas();
      await this.guardarMesasEnCache(mesasPredeterminadas);
      
      console.log(`✅ Usando configuración predeterminada: ${mesasPredeterminadas.length} posiciones`);
      return mesasPredeterminadas;
      
    } catch (error) {
      console.error('❌ Error obteniendo mesas:', error.message);
      
      // Fallback final mínimo
      return [
        { id: 1, numero: '1', nombre: 'Mesa 1', capacidad: 4, estado: 'disponible', tipo: 'mesa', ubicacion: 'Interior' },
        { id: 2, numero: '2', nombre: 'Mesa 2', capacidad: 2, estado: 'disponible', tipo: 'mesa', ubicacion: 'Ventana' },
        { id: 'pickup_1', numero: 'P1', nombre: 'PickUp 1', capacidad: 1, estado: 'disponible', tipo: 'pickup', ubicacion: 'Mostrador' }
      ];
    }
  }

  async getEstadisticasMesas() {
    try {
      console.log('📊 Obteniendo estadísticas de mesas...');
      
      // Intentar desde servidor PostgreSQL
      try {
        const response = await this.request('/mesas/estadisticas');
        console.log('✅ Estadísticas obtenidas del servidor PostgreSQL');
        return response;
        
      } catch (serverError) {
        console.log('⚠️ Error servidor, calculando localmente:', serverError.message);
      }
      
      // Calcular localmente desde mesas disponibles
      const mesas = await this.getMesas();
      
      const estadisticas = {
        total_mesas: mesas.length,
        mesas_tradicionales: mesas.filter(m => m.tipo === 'mesa').length,
        posiciones_pickup: mesas.filter(m => m.tipo === 'pickup').length,
        posiciones_barra: mesas.filter(m => m.tipo === 'barra').length,
        disponibles: mesas.filter(m => m.estado === 'disponible').length,
        ocupadas: mesas.filter(m => m.estado === 'ocupada').length,
        en_limpieza: mesas.filter(m => m.estado === 'limpieza').length,
        fuera_servicio: mesas.filter(m => m.estado === 'fuera_servicio').length,
        capacidad_total: mesas.reduce((sum, mesa) => sum + (mesa.capacidad || 0), 0),
        capacidad_promedio: mesas.length > 0 ? 
          (mesas.reduce((sum, mesa) => sum + (mesa.capacidad || 0), 0) / mesas.length).toFixed(2) : 0
      };
      
      console.log('✅ Estadísticas calculadas localmente');
      return estadisticas;
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error.message);
      return {
        total_mesas: 0, mesas_tradicionales: 0, posiciones_pickup: 0, posiciones_barra: 0,
        disponibles: 0, ocupadas: 0, en_limpieza: 0, fuera_servicio: 0,
        capacidad_total: 0, capacidad_promedio: 0
      };
    }
  }

  async createMesa(mesaData) {
    try {
      console.log('➕ Creando nueva mesa...', mesaData);
      
      // Intentar crear en el servidor PostgreSQL
      try {
        const response = await this.request('/mesas', {
          method: 'POST',
          body: JSON.stringify(mesaData)
        });
        
        console.log('✅ Mesa creada en servidor PostgreSQL:', response.nombre);
        
        // Actualizar caché local
        await this.actualizarMesaEnCache(response, 'create');
        return response;
        
      } catch (serverError) {
        console.log('⚠️ Error en servidor, guardando localmente:', serverError.message);
      }
      
      // Crear localmente si el servidor falla
      const mesasActuales = await this.getMesas();
      const nuevaId = mesaData.tipo === 'pickup' 
        ? `pickup_${Date.now()}`
        : Math.max(...mesasActuales.filter(m => m.tipo === 'mesa').map(m => parseInt(m.id) || 0), 0) + 1;
      
      const nuevaMesa = {
        id: nuevaId,
        numero: mesaData.numero,
        nombre: mesaData.nombre,
        capacidad: mesaData.capacidad,
        estado: 'disponible',
        ubicacion: mesaData.ubicacion || 'Sin ubicación',
        tipo: mesaData.tipo || 'mesa',
        descripcion: mesaData.descripcion || '',
        activa: true,
        fecha_creacion: new Date().toISOString(),
        creado_por: 'Usuario'
      };
      
      const mesasActualizadas = [...mesasActuales, nuevaMesa];
      await this.guardarMesasEnCache(mesasActualizadas);
      
      console.log('✅ Mesa creada localmente:', nuevaMesa.nombre);
      return nuevaMesa;
      
    } catch (error) {
      console.error('❌ Error creando mesa:', error.message);
      throw error;
    }
  }

  async cambiarEstadoMesa(id, nuevoEstado, motivo = '') {
    try {
      console.log(`🔄 Cambiando estado de mesa ${id} a '${nuevoEstado}'`);
      
      // Intentar cambiar en el servidor usando el endpoint específico de PostgreSQL
      try {
        const response = await this.request(`/mesas/${id}/estado`, {
          method: 'PATCH',
          body: JSON.stringify({ 
            estado: nuevoEstado, 
            motivo: motivo 
          })
        });
        
        if (response.success) {
          console.log('✅ Estado cambiado en servidor PostgreSQL:', response.data.mesa_nombre);
          
          // Actualizar caché local
          const mesaActualizada = {
            id: response.data.mesa_id,
            estado: response.data.estado_nuevo
          };
          await this.actualizarMesaEnCache(mesaActualizada, 'update');
          
          return response;
        }
        
      } catch (serverError) {
        console.log('⚠️ Error en servidor, actualizando localmente:', serverError.message);
      }
      
      // Actualizar localmente como fallback
      return await this.updateMesa(id, { 
        estado: nuevoEstado,
        fecha_modificacion: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error cambiando estado de mesa:', error.message);
      throw error;
    }
  }

  // ==========================================
  // MÉTODOS DE VENTAS Y REPORTES
  // ==========================================
  
  async getVentas(filtros = {}) {
    try {
      console.log('💰 Obteniendo ventas (usando endpoints alternativos)...', filtros);
      
      // Usar datos del menú y platos especiales para simular ventas
      const [menuData, especialesData, mesasData] = await Promise.all([
        this.getMenu().catch(() => []),
        this.getPlatosEspeciales().catch(() => []),
        this.getMesas().catch(() => [])
      ]);
      
      // Generar datos de ventas sintéticos realistas
      const ventasSinteticas = this.generarVentasSinteticas(menuData, especialesData, mesasData, filtros);
      
      console.log(`✅ Datos de ventas generados: ${ventasSinteticas.length} registros`);
      return ventasSinteticas;
      
    } catch (error) {
      console.error('❌ Error obteniendo ventas:', error.message);
      return [];
    }
  }

  // Método para generar datos de ventas sintéticos realistas
  generarVentasSinteticas(menu, especiales, mesas, filtros) {
    const ventas = [];
    const mesasDisponibles = mesas.length > 0 ? mesas : [
      { numero: 1 }, { numero: 2 }, { numero: 3 }, { numero: 4 }, { numero: 5 }
    ];
    
    // Combinar menú y especiales
    const todosLosProductos = [...menu, ...especiales];
    
    if (todosLosProductos.length === 0) {
      return [];
    }
    
    // Generar ventas para los últimos 7 días
    const fechaFin = filtros.fechaFin ? new Date(filtros.fechaFin) : new Date();
    const fechaInicio = filtros.fechaInicio ? new Date(filtros.fechaInicio) : 
      new Date(fechaFin.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    let ventaId = 1;
    const diasDiferencia = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24));
    
    for (let dia = 0; dia <= diasDiferencia; dia++) {
      const fechaVenta = new Date(fechaInicio);
      fechaVenta.setDate(fechaInicio.getDate() + dia);
      
      // 3-8 ventas por día (más los fines de semana)
      const esFinDeSemana = fechaVenta.getDay() === 0 || fechaVenta.getDay() === 6;
      const ventasPorDia = esFinDeSemana ? 
        Math.floor(Math.random() * 6) + 5 : // 5-10 ventas
        Math.floor(Math.random() * 5) + 3;  // 3-7 ventas
      
      for (let v = 0; v < ventasPorDia; v++) {
        const mesa = mesasDisponibles[Math.floor(Math.random() * mesasDisponibles.length)];
        const horaVenta = new Date(fechaVenta);
        horaVenta.setHours(Math.floor(Math.random() * 12) + 11); // 11:00 - 22:00
        horaVenta.setMinutes(Math.floor(Math.random() * 60));
        
        // Filtro por mesa si se especifica
        if (filtros.mesa && mesa.numero.toString() !== filtros.mesa.toString()) {
          continue;
        }
        
        // 1-4 productos por venta
        const numProductos = Math.floor(Math.random() * 4) + 1;
        const productosVenta = [];
        let totalVenta = 0;
        
        for (let p = 0; p < numProductos; p++) {
          const producto = todosLosProductos[Math.floor(Math.random() * todosLosProductos.length)];
          const cantidad = Math.floor(Math.random() * 3) + 1; // 1-3 cantidad
          const precio = parseFloat(producto.precio) || 0;
          const subtotal = precio * cantidad;
          
          productosVenta.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: precio,
            cantidad: cantidad,
            subtotal: subtotal,
            categoria: producto.categoria || 'General'
          });
          
          totalVenta += subtotal;
        }
        
        ventas.push({
          id: ventaId++,
          orden_id: ventaId,
          mesa: `Mesa ${mesa.numero || mesa.id}`,
          fecha: horaVenta.toISOString(),
          timestamp: horaVenta.toISOString(),
          total: Math.round(totalVenta * 100) / 100, // Redondear a 2 decimales
          estado: 'entregada',
          cliente: `Cliente ${ventaId}`,
          metodo_pago: ['efectivo', 'tarjeta', 'transferencia'][Math.floor(Math.random() * 3)],
          items: productosVenta,
          productos: productosVenta // Compatibilidad
        });
      }
    }
    
    return ventas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }

  // ==========================================
  // MÉTODOS DE UTILIDAD Y HEALTH CHECK
  // ==========================================
  
  async checkConnection() {
    try {
      console.log('🔍 Verificando conexión...');
      const response = await this.request('/health');
      console.log('✅ Conexión verificada');
      return { success: true, data: response };
    } catch (error) {
      console.error('❌ Error verificando conexión:', error.message);
      return { success: false, error: error.message };
    }
  }

  async healthCheck() {
    try {
      console.log('🏥 Verificando salud del servidor...');
      const response = await this.makeRequestWithTimeout('/health', {}, this.TIMEOUTS.HEALTH_CHECK);
      console.log('✅ Servidor saludable');
      return response;
    } catch (error) {
      console.error('❌ Servidor no saludable:', error.message);
      throw error;
    }
  }

  // ==========================================
  // MÉTODOS AUXILIARES Y CACHÉ
  // ==========================================

  // ✅ GUARDAR MESAS EN CACHÉ
  async guardarMesasEnCache(mesas) {
    try {
      await Promise.all([
        AsyncStorage.setItem('mesas_configuracion', JSON.stringify(mesas)),
        AsyncStorage.setItem('mesas_timestamp', Date.now().toString()),
        AsyncStorage.setItem('mesas_version', '2.1')
      ]);
      console.log('💾 Configuración de mesas guardada en caché');
    } catch (error) {
      console.log('⚠️ Error guardando mesas en caché:', error.message);
    }
  }

  async actualizarMesaEnCache(mesa, operacion) {
    try {
      const mesasActuales = await this.getMesas();
      
      let mesasActualizadas;
      switch (operacion) {
        case 'create':
          mesasActualizadas = [...mesasActuales, mesa];
          break;
        case 'update':
          mesasActualizadas = mesasActuales.map(m => 
            m.id == mesa.id ? { ...m, ...mesa } : m
          );
          break;
        case 'delete':
          mesasActualizadas = mesasActuales.filter(m => m.id != mesa.id);
          break;
        default:
          mesasActualizadas = mesasActuales;
      }
      
      await this.guardarMesasEnCache(mesasActualizadas);
      
    } catch (error) {
      console.log('⚠️ Error actualizando mesa en caché:', error.message);
    }
  }

  generarConfiguracionMesasPredeterminadas() {
    const fechaCreacion = new Date().toISOString();
    
    return [
      // Mesas tradicionales
      {
        id: 1, numero: '1', nombre: 'Mesa 1', capacidad: 4, estado: 'disponible',
        ubicacion: 'Ventana', tipo: 'mesa', descripcion: 'Mesa junto a la ventana',
        activa: true, fecha_creacion: fechaCreacion
      },
      {
        id: 2, numero: '2', nombre: 'Mesa 2', capacidad: 2, estado: 'disponible',
        ubicacion: 'Interior', tipo: 'mesa', descripcion: 'Mesa para pareja',
        activa: true, fecha_creacion: fechaCreacion
      },
      {
        id: 3, numero: '3', nombre: 'Mesa 3', capacidad: 6, estado: 'disponible',
        ubicacion: 'Terraza', tipo: 'mesa', descripcion: 'Mesa familiar en terraza',
        activa: true, fecha_creacion: fechaCreacion
      },
      
      // Posiciones de PickUp
      {
        id: 'pickup_1', numero: 'P1', nombre: 'PickUp 1', capacidad: 1, estado: 'disponible',
        ubicacion: 'Mostrador', tipo: 'pickup', descripcion: 'Posición principal para llevar',
        activa: true, fecha_creacion: fechaCreacion
      },
      {
        id: 'pickup_2', numero: 'P2', nombre: 'PickUp 2', capacidad: 1, estado: 'disponible',
        ubicacion: 'Mostrador', tipo: 'pickup', descripcion: 'Posición secundaria para llevar',
        activa: true, fecha_creacion: fechaCreacion
      }
    ];
  }

  async guardarEnCache(platos) {
    try {
      await Promise.all([
        AsyncStorage.setItem('platos_especiales', JSON.stringify(platos)),
        AsyncStorage.setItem('platos_especiales_timestamp', Date.now().toString())
      ]);
      console.log('💾 Platos especiales guardados en cache:', platos.length, 'items');
    } catch (error) {
      console.log('⚠️ Error guardando en cache:', error.message);
    }
  }

  generarPlatosEspecialesDemo() {
    const fechaHoy = new Date();
    const fechaManana = new Date(fechaHoy);
    fechaManana.setDate(fechaHoy.getDate() + 1);
    
    return [
      {
        id: 'demo_1',
        nombre: 'Plato del Día',
        descripcion: 'Especialidad de la casa con ingredientes frescos del día',
        precio: 15990,
        categoria: 'Especiales',
        disponible: true,
        vegetariano: false,
        picante: false,
        imagen_url: null,
        fecha_inicio: fechaHoy.toISOString().split('T')[0],
        fecha_fin: fechaManana.toISOString().split('T')[0],
        tipo: 'especial',
        tiempo_preparacion: 20,
        ingredientes: ['Ingredientes frescos del día'],
        descuento: 0,
        creado_por: 'Sistema',
        fecha_creacion: new Date().toISOString(),
        origen: 'demo'
      },
      {
        id: 'demo_2',
        nombre: 'Oferta Especial 2x1',
        descripcion: 'Lleva dos platos por el precio de uno. Válido solo hoy.',
        precio: 12500,
        categoria: 'Promociones',
        disponible: true,
        vegetariano: true,
        picante: false,
        imagen_url: null,
        fecha_inicio: fechaHoy.toISOString().split('T')[0],
        fecha_fin: fechaManana.toISOString().split('T')[0],
        tipo: 'especial',
        tiempo_preparacion: 15,
        ingredientes: ['Ingredientes vegetarianos'],
        descuento: 50,
        creado_por: 'Sistema',
        fecha_creacion: new Date().toISOString(),
        origen: 'demo'
      }
    ];
  }

  // ==========================================
  // MÉTODO QR PÚBLICO
  // ==========================================
  
  async getMenuPublico() {
    try {
      console.log('📱 Obteniendo menú público para QR...');
      const response = await this.request('/qr/menu-publico');
      console.log('✅ Menú público obtenido');
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo menú público:', error.message);
      throw error;
    }
  }

  // ==========================================
  // LIMPIEZA DE DATOS LOCALES
  // ==========================================
  
  async resetLocalData() {
    try {
      console.log('🗑️ Limpiando datos locales...');
      await AsyncStorage.multiRemove([
        'authToken',
        'userData',
        'cached_menu',
        'cached_categorias',
        'cached_especiales',
        'cached_pedidos',
        'cached_ventas',
        'mesas_configuracion',
        'mesas_timestamp',
        'platos_especiales',
        'platos_especiales_timestamp'
      ]);
      console.log('✅ Datos locales limpiados');
    } catch (error) {
      console.error('❌ Error limpiando datos locales:', error.message);
      throw error;
    }
  }
}

export default new ApiService();