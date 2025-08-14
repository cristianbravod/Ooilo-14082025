// ==========================================
// CONFIGURACIÓN DE API - SISTEMA DE COCINA
// ==========================================

const API_CONFIG = {
    BASE_URL: 'http://192.1.1.16:3000/api',
    ENDPOINTS: {
        // Autenticación
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        VERIFY_TOKEN: '/auth/verify',
        
        // Órdenes
        ORDENES_ACTIVAS: '/ordenes/activas',
        ORDENES_ALL: '/ordenes',
        ORDEN_BY_ID: '/ordenes/{id}',
        UPDATE_ORDEN_STATUS: '/ordenes/{id}/estado',
        UPDATE_ITEM_STATUS: '/ordenes/{ordenId}/items/{itemId}/estado',
        ADD_ITEMS_TO_ORDER: '/ordenes/{id}/items',
        CLOSE_TABLE: '/ordenes/mesa/{mesa}/cerrar',
        
        // Mesas
        MESAS: '/mesas',
        MESA_BY_ID: '/mesas/{id}',
        UPDATE_MESA_STATUS: '/mesas/{id}/estado',
        
        // Utilidades
        HEALTH_CHECK: '/health',
        SERVER_TIME: '/time'
    },
    TIMEOUTS: {
        DEFAULT: 30000,
        HEALTH_CHECK: 10000,
        LOGIN: 15000
    },
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
};

// ==========================================
// FUNCIONES BASE DE API
// ==========================================

/**
 * Función principal para hacer requests a la API
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const config = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        },
        timeout: options.timeout || API_CONFIG.TIMEOUTS.DEFAULT,
        ...options
    };

    // Agregar token de autenticación si existe
    if (window.authToken) {
        config.headers['Authorization'] = `Bearer ${window.authToken}`;
    }

    try {
        console.log(`🔄 API REQUEST: ${config.method} ${url}`);
        if (options.body) {
            console.log('📤 Body:', JSON.parse(options.body));
        }

        const response = await fetch(url, config);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ API RESPONSE: ${config.method} ${endpoint} - Success`);
        
        return data;
    } catch (error) {
        console.error(`❌ API ERROR: ${config.method} ${endpoint} -`, error.message);
        throw error;
    }
}

/**
 * Función con reintentos automáticos
 */
async function apiRequestWithRetry(endpoint, options = {}, maxRetries = API_CONFIG.RETRY_ATTEMPTS) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await apiRequest(endpoint, options);
        } catch (error) {
            lastError = error;
            console.warn(`❌ Intento ${attempt}/${maxRetries} falló:`, error.message);
            
            if (attempt < maxRetries) {
                const delay = API_CONFIG.RETRY_DELAY * attempt;
                console.log(`⏳ Reintentando en ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError;
}

// ==========================================
// FUNCIONES DE AUTENTICACIÓN
// ==========================================

/**
 * Iniciar sesión
 */
async function login(email, password) {
    try {
        console.log('🔐 Iniciando sesión...');
        
        const response = await apiRequest(API_CONFIG.ENDPOINTS.LOGIN, {
            method: 'POST',
            timeout: API_CONFIG.TIMEOUTS.LOGIN,
            body: JSON.stringify({ email, password })
        });
        
        if (response.success && response.token) {
            window.authToken = response.token;
            window.currentUser = response.user;
            
            // Guardar en localStorage
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            
            console.log('✅ Sesión iniciada exitosamente');
            return response;
        } else {
            throw new Error(response.message || 'Error de autenticación');
        }
    } catch (error) {
        console.error('❌ Error en login:', error.message);
        throw error;
    }
}

/**
 * Verificar token de autenticación
 */
async function verifyToken(token) {
    try {
        const response = await apiRequest(API_CONFIG.ENDPOINTS.VERIFY_TOKEN, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        return response.success === true;
    } catch (error) {
        console.error('❌ Token inválido:', error.message);
        return false;
    }
}

/**
 * Cerrar sesión
 */
async function logout() {
    try {
        if (window.authToken) {
            await apiRequest(API_CONFIG.ENDPOINTS.LOGOUT, {
                method: 'POST'
            });
        }
    } catch (error) {
        console.warn('⚠️ Error cerrando sesión en servidor:', error.message);
    } finally {
        // Limpiar datos locales siempre
        window.authToken = null;
        window.currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        console.log('✅ Sesión cerrada localmente');
    }
}

// ==========================================
// FUNCIONES DE ÓRDENES
// ==========================================

/**
 * Obtener órdenes activas para cocina (FIFO)
 */
async function getActiveOrders() {
    try {
        console.log('👨‍🍳 Obteniendo órdenes activas...');
        
        const response = await apiRequestWithRetry(API_CONFIG.ENDPOINTS.ORDENES_ACTIVAS);
        
        // Manejar diferentes formatos de respuesta
        let ordenes = [];
        if (response.success && response.data) {
            ordenes = response.data;
        } else if (response.ordenes) {
            ordenes = response.ordenes;
        } else if (Array.isArray(response)) {
            ordenes = response;
        }
        
        // Procesar órdenes para formato consistente
        ordenes = ordenes.map(orden => ({
            ...orden,
            total: parseFloat(orden.total) || 0,
            minutos_espera: orden.minutos_espera ? Math.floor(orden.minutos_espera) : 0,
            prioridad: orden.prioridad || 'NORMAL',
            items: orden.items || [],
            mesa_numero: orden.mesa_numero || orden.mesa || 'Sin mesa'
        }));
        
        console.log(`✅ Órdenes activas obtenidas: ${ordenes.length}`);
        return ordenes;
        
    } catch (error) {
        console.error('❌ Error obteniendo órdenes activas:', error);
        throw error;
    }
}

/**
 * Obtener todas las órdenes (admin)
 */
async function getAllOrders(filters = {}) {
    try {
        console.log('📊 Obteniendo todas las órdenes...');
        
        // Construir query params
        const params = new URLSearchParams();
        if (filters.estado) params.append('estado', filters.estado);
        if (filters.mesa) params.append('mesa', filters.mesa);
        if (filters.limit) params.append('limit', filters.limit);
        if (filters.offset) params.append('offset', filters.offset);
        
        const endpoint = `${API_CONFIG.ENDPOINTS.ORDENES_ALL}${params.toString() ? '?' + params.toString() : ''}`;
        const response = await apiRequestWithRetry(endpoint);
        
        // Procesar respuesta
        let ordenes = [];
        if (response.success && response.data) {
            ordenes = response.data;
        } else if (Array.isArray(response)) {
            ordenes = response;
        }
        
        console.log(`✅ Órdenes obtenidas: ${ordenes.length}`);
        return ordenes;
        
    } catch (error) {
        console.error('❌ Error obteniendo todas las órdenes:', error);
        throw error;
    }
}

/**
 * Obtener orden por ID
 */
async function getOrderById(ordenId) {
    try {
        console.log(`🔍 Obteniendo orden ${ordenId}...`);
        
        const endpoint = API_CONFIG.ENDPOINTS.ORDEN_BY_ID.replace('{id}', ordenId);
        const response = await apiRequest(endpoint);
        
        if (response.success && response.data) {
            return response.data;
        } else if (response.id) {
            return response;
        }
        
        throw new Error('Orden no encontrada');
        
    } catch (error) {
        console.error('❌ Error obteniendo orden:', error);
        throw error;
    }
}

/**
 * Actualizar estado de orden completa
 */
async function updateOrderStatus(ordenId, nuevoEstado) {
    try {
        console.log(`🔄 Actualizando orden ${ordenId} a estado: ${nuevoEstado}`);
        
        const endpoint = API_CONFIG.ENDPOINTS.UPDATE_ORDEN_STATUS.replace('{id}', ordenId);
        const response = await apiRequest(endpoint, {
            method: 'PATCH',
            body: JSON.stringify({ estado: nuevoEstado })
        });
        
        if (response && response.success) {
            console.log('✅ Estado de orden actualizado exitosamente');
            return response;
        } else {
            throw new Error(response?.message || 'Error actualizando orden');
        }
        
    } catch (error) {
        console.error('❌ Error actualizando orden:', error);
        throw error;
    }
}

/**
 * Actualizar estado de item individual
 */
async function updateItemStatus(ordenId, itemId, nuevoEstado) {
    try {
        console.log(`✅ Actualizando item ${itemId} de orden ${ordenId} a estado: ${nuevoEstado}`);
        
        const endpoint = API_CONFIG.ENDPOINTS.UPDATE_ITEM_STATUS
            .replace('{ordenId}', ordenId)
            .replace('{itemId}', itemId);
            
        const response = await apiRequest(endpoint, {
            method: 'PATCH',
            body: JSON.stringify({ estado: nuevoEstado })
        });
        
        if (response && response.success) {
            console.log('✅ Estado de item actualizado exitosamente');
            return response;
        } else {
            throw new Error(response?.message || 'Error actualizando item');
        }
        
    } catch (error) {
        console.error('❌ Error actualizando item:', error);
        throw error;
    }
}

/**
 * Agregar items a orden existente
 */
async function addItemsToOrder(ordenId, nuevosItems) {
    try {
        console.log(`➕ Agregando items a orden ${ordenId}:`, nuevosItems);
        
        const endpoint = API_CONFIG.ENDPOINTS.ADD_ITEMS_TO_ORDER.replace('{id}', ordenId);
        const response = await apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify({ items: nuevosItems })
        });
        
        if (response && response.success) {
            console.log('✅ Items agregados exitosamente');
            return response;
        } else {
            throw new Error(response?.message || 'Error agregando items');
        }
        
    } catch (error) {
        console.error('❌ Error agregando items:', error);
        throw error;
    }
}

/**
 * Cerrar mesa
 */
async function closeTable(mesa, datosCierre = {}) {
    try {
        console.log(`🔒 Cerrando mesa: ${mesa}`);
        
        const endpoint = API_CONFIG.ENDPOINTS.CLOSE_TABLE.replace('{mesa}', mesa);
        const response = await apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(datosCierre)
        });
        
        if (response && response.success) {
            console.log('✅ Mesa cerrada exitosamente');
            return response;
        } else {
            throw new Error(response?.message || 'Error cerrando mesa');
        }
        
    } catch (error) {
        console.error('❌ Error cerrando mesa:', error);
        throw error;
    }
}

// ==========================================
// FUNCIONES DE MESAS
// ==========================================

/**
 * Obtener todas las mesas
 */
async function getAllTables() {
    try {
        console.log('🪑 Obteniendo mesas...');
        
        const response = await apiRequest(API_CONFIG.ENDPOINTS.MESAS);
        
        if (Array.isArray(response)) {
            console.log(`✅ Mesas obtenidas: ${response.length}`);
            return response;
        } else if (response.data && Array.isArray(response.data)) {
            return response.data;
        }
        
        return [];
        
    } catch (error) {
        console.error('❌ Error obteniendo mesas:', error);
        throw error;
    }
}

/**
 * Actualizar estado de mesa
 */
async function updateTableStatus(mesaId, nuevoEstado, motivo = '') {
    try {
        console.log(`🔄 Actualizando mesa ${mesaId} a estado: ${nuevoEstado}`);
        
        const endpoint = API_CONFIG.ENDPOINTS.UPDATE_MESA_STATUS.replace('{id}', mesaId);
        const response = await apiRequest(endpoint, {
            method: 'PATCH',
            body: JSON.stringify({ estado: nuevoEstado, motivo })
        });
        
        if (response && response.success) {
            console.log('✅ Estado de mesa actualizado exitosamente');
            return response;
        } else {
            throw new Error(response?.message || 'Error actualizando mesa');
        }
        
    } catch (error) {
        console.error('❌ Error actualizando mesa:', error);
        throw error;
    }
}

// ==========================================
// FUNCIONES DE UTILIDAD
// ==========================================

/**
 * Verificar conexión con el servidor
 */
async function checkServerConnection() {
    try {
        const response = await apiRequest(API_CONFIG.ENDPOINTS.HEALTH_CHECK, {
            timeout: API_CONFIG.TIMEOUTS.HEALTH_CHECK
        });
        
        return {
            success: true,
            data: response,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('❌ Error verificando conexión:', error.message);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Obtener hora del servidor
 */
async function getServerTime() {
    try {
        const response = await apiRequest(API_CONFIG.ENDPOINTS.SERVER_TIME);
        return response.timestamp || new Date().toISOString();
    } catch (error) {
        console.warn('⚠️ No se pudo obtener hora del servidor, usando hora local');
        return new Date().toISOString();
    }
}

/**
 * Función de prueba rápida de conectividad
 */
async function quickConnectivityTest() {
    try {
        const startTime = Date.now();
        await checkServerConnection();
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        return {
            success: true,
            latency: latency,
            message: `Conexión OK (${latency}ms)`
        };
    } catch (error) {
        return {
            success: false,
            latency: -1,
            message: `Sin conexión: ${error.message}`
        };
    }
}

// ==========================================
// FUNCIONES DE SIMULACIÓN (FALLBACK)
// ==========================================

/**
 * Generar datos simulados si el servidor no está disponible
 */
function generateMockOrders() {
    const mockOrders = [
        {
            id: 1,
            mesa: 'Mesa 1',
            estado: 'pendiente',
            total: 25000,
            fecha_creacion: new Date(Date.now() - 5 * 60000).toISOString(),
            minutos_espera: 5,
            prioridad: 'NORMAL',
            items: [
                { id: 1, nombre: 'Hamburguesa Clásica', cantidad: 2, estado: 'pendiente' },
                { id: 2, nombre: 'Papas Fritas', cantidad: 1, estado: 'pendiente' }
            ]
        },
        {
            id: 2,
            mesa: 'Mesa 3',
            estado: 'preparando',
            total: 18000,
            fecha_creacion: new Date(Date.now() - 15 * 60000).toISOString(),
            minutos_espera: 15,
            prioridad: 'MEDIA',
            items: [
                { id: 3, nombre: 'Pizza Margherita', cantidad: 1, estado: 'preparando' }
            ]
        },
        {
            id: 3,
            mesa: 'Mesa 5',
            estado: 'listo',
            total: 32000,
            fecha_creacion: new Date(Date.now() - 25 * 60000).toISOString(),
            minutos_espera: 25,
            prioridad: 'ALTA',
            items: [
                { id: 4, nombre: 'Lasagna', cantidad: 1, estado: 'listo' },
                { id: 5, nombre: 'Ensalada César', cantidad: 1, estado: 'listo' }
            ]
        }
    ];
    
    console.log('⚠️ Usando datos simulados - servidor no disponible');
    return mockOrders;
}

// ==========================================
// FUNCIONES WRAPPER PARA COMPATIBILIDAD
// ==========================================

/**
 * Función legacy para obtener órdenes (mantener compatibilidad)
 */
async function getOrders() {
    try {
        return await getAllOrders();
    } catch (error) {
        console.warn('⚠️ Fallback a datos simulados');
        return generateMockOrders();
    }
}

/**
 * Función legacy para obtener órdenes de cocina
 */
async function getKitchenOrders() {
    try {
        return await getActiveOrders();
    } catch (error) {
        console.warn('⚠️ Fallback a datos simulados');
        return generateMockOrders().filter(order => 
            ['pendiente', 'preparando', 'listo'].includes(order.estado)
        );
    }
}

// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================

// Interceptor para manejar errores 401 (token expirado)
const originalApiRequest = apiRequest;
window.apiRequest = async function(endpoint, options = {}) {
    try {
        return await originalApiRequest(endpoint, options);
    } catch (error) {
        if (error.message.includes('401')) {
            console.warn('⚠️ Token expirado, cerrando sesión...');
            await logout();
            if (window.showLogin) {
                window.showLogin();
            }
        }
        throw error;
    }
};

// Exportar funciones principales
window.API = {
    // Autenticación
    login,
    logout,
    verifyToken,
    
    // Órdenes
    getActiveOrders,
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    updateItemStatus,
    addItemsToOrder,
    closeTable,
    
    // Mesas
    getAllTables,
    updateTableStatus,
    
    // Utilidades
    checkServerConnection,
    getServerTime,
    quickConnectivityTest,
    
    // Legacy
    getOrders,
    getKitchenOrders
};

console.log('✅ API de cocina inicializada');
console.log('🔗 Endpoint base:', API_CONFIG.BASE_URL);
console.log('📡 Funciones disponibles en window.API');