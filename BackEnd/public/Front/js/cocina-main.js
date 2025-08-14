// ==========================================
// INICIALIZACIÓN Y CONTROL PRINCIPAL - SISTEMA DE COCINA
// ==========================================

// Variables globales de estado
let currentUser = null;
let authToken = null;
let autoRefreshInterval = null;
let connectionCheckInterval = null;
let isConnected = false;
let lastConnectionCheck = null;

// ==========================================
// INICIALIZACIÓN PRINCIPAL
// ==========================================

/**
 * Inicializar aplicación al cargar el DOM
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando Sistema de Cocina...');
    
    // Configurar eventos de formularios
    setupFormEvents();
    
    // Configurar eventos de modal
    setupModalEvents();
    
    // Configurar eventos de visibilidad
    setupVisibilityEvents();
    
    // Verificar autenticación existente
    checkExistingAuth();
    
    // Iniciar verificación de conexión
    startConnectionMonitoring();
    
    // Mostrar información del sistema
    showSystemInfo();
    
    console.log('✅ Sistema de Cocina inicializado');
});

/**
 * Configurar eventos de formularios
 */
function setupFormEvents() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

/**
 * Configurar eventos de modal
 */
function setupModalEvents() {
    const modal = document.getElementById('order-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeOrderModal();
            }
        });
    }
}

/**
 * Configurar eventos de visibilidad de página
 */
function setupVisibilityEvents() {
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // Página oculta - pausar auto-refresh
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
                autoRefreshInterval = null;
                console.log('⏸️ Auto-refresh pausado (página oculta)');
            }
        } else {
            // Página visible - reanudar auto-refresh si es necesario  
            if (currentUser && (currentUser.rol === 'cocina' || currentUser.rol === 'chef')) {
                startAutoRefresh();
                // Refrescar inmediatamente al volver
                if (currentSection === 'kitchen') {
                    setTimeout(() => refreshKitchenOrders(), 1000);
                }
                console.log('▶️ Auto-refresh reanudado (página visible)');
            }
        }
    });
}

// ==========================================
// AUTENTICACIÓN
// ==========================================

/**
 * Verificar autenticación existente
 */
async function checkExistingAuth() {
    try {
        const savedToken = localStorage.getItem('authToken');
        const savedUser = localStorage.getItem('currentUser');
        
        if (savedToken && savedUser) {
            console.log('🔍 Verificando autenticación guardada...');
            
            const isValid = await window.API.verifyToken(savedToken);
            
            if (isValid) {
                authToken = savedToken;
                currentUser = JSON.parse(savedUser);
                window.authToken = authToken;
                window.currentUser = currentUser;
                
                showApp();
                console.log('✅ Sesión restaurada exitosamente');
                return;
            } else {
                console.log('⚠️ Token expirado, limpiando datos');
                clearAuthData();
            }
        }
    } catch (error) {
        console.warn('⚠️ Error verificando autenticación:', error.message);
        clearAuthData();
    }
    
    // Si no hay autenticación válida, mostrar login
    showLogin();
}

/**
 * Manejar inicio de sesión
 */
async function handleLogin(event) {
    event.preventDefault();
    
    const loginBtn = document.getElementById('login-btn');
    const loginBtnText = document.getElementById('login-btn-text');
    const loginError = document.getElementById('login-error');
    
    // Obtener datos del formulario
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    // Limpiar errores previos
    clearFormErrors();
    
    // Validaciones básicas
    if (!email || !password) {
        showFieldError('email', 'Email y contraseña son requeridos');
        return;
    }
    
    try {
        // Mostrar estado de carga
        loginBtn.disabled = true;
        loginBtnText.textContent = 'Iniciando sesión...';
        loginError.textContent = '';
        
        // Intentar login
        const response = await window.API.login(email, password);
        
        if (response.success) {
            // Guardar datos de autenticación
            authToken = response.token;
            currentUser = response.user;
            
            // Hacer disponible globalmente
            window.authToken = authToken;
            window.currentUser = currentUser;
            
            console.log('✅ Login exitoso:', currentUser.nombre);
            
            // Mostrar aplicación
            showApp();
            
        } else {
            throw new Error(response.message || 'Error de autenticación');
        }
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        
        // Mostrar error específico
        if (error.message.includes('401') || error.message.includes('credentials')) {
            loginError.textContent = 'Email o contraseña incorrectos';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            loginError.textContent = 'Error de conexión. Verifique su internet.';
        } else {
            loginError.textContent = error.message || 'Error iniciando sesión. Intenta nuevamente.';
        }
        
    } finally {
        // Rehabilitar botón
        loginBtn.disabled = false;
        loginBtnText.textContent = 'Iniciar Sesión';
    }
}

/**
 * Cerrar sesión
 */
async function logout() {
    try {
        showLoadingOverlay(true);
        
        await window.API.logout();
        
        clearAuthData();
        showLogin();
        showNotification('Sesión cerrada correctamente', 'success');
        
        console.log('✅ Logout exitoso');
        
    } catch (error) {
        console.error('❌ Error en logout:', error);
        
        // Cerrar sesión localmente aunque falle el servidor
        clearAuthData();
        showLogin();
        showNotification('Sesión cerrada localmente', 'warning');
        
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Limpiar datos de autenticación
 */
function clearAuthData() {
    currentUser = null;
    authToken = null;
    window.currentUser = null;
    window.authToken = null;
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // Detener auto-refresh
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

/**
 * Mostrar pantalla de login
 */
function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').classList.remove('authenticated');
    
    // Limpiar formulario
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.reset();
        clearFormErrors();
    }
}

/**
 * Mostrar aplicación principal
 */
function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').classList.add('authenticated');
    
    // Actualizar información del usuario
    document.getElementById('user-name').textContent = currentUser.nombre || 'Usuario';
    document.getElementById('user-role').textContent = currentUser.rol || 'Rol';
    
    // Configurar título según rol
    const appTitle = document.getElementById('app-title');
    if (currentUser.rol === 'admin') {
        appTitle.textContent = 'Panel Administrador';
    } else if (currentUser.rol === 'chef' || currentUser.rol === 'cocina') {
        appTitle.textContent = 'Sistema Cocina';
    } else {
        appTitle.textContent = 'Sistema Restaurante';
    }
    
    // Configurar permisos de navegación
    setupRolePermissions();
    
    // Cargar datos iniciales
    refreshDashboard();
    
    // Iniciar auto-refresh para roles de cocina
    if (currentUser.rol === 'cocina' || currentUser.rol === 'chef') {
        startAutoRefresh();
    }
    
    showNotification(`Bienvenido, ${currentUser.nombre}`, 'success');
}

// ==========================================
// AUTO-REFRESH Y MONITOREO
// ==========================================

/**
 * Iniciar auto-refresh de órdenes
 */
function startAutoRefresh() {
    // Limpiar intervalo existente
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // Iniciar nuevo intervalo cada 10 segundos
    autoRefreshInterval = setInterval(() => {
        if (currentSection === 'kitchen' && currentUser && !document.hidden) {
            console.log('🔄 Auto-refresh de cocina...');
            refreshKitchenOrders();
        }
    }, 10000);
    
    // Actualizar botón de estado
    updateAutoRefreshButton(true);
    
    console.log('✅ Auto-refresh iniciado (cada 10 segundos)');
}

/**
 * Detener auto-refresh
 */
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
    
    updateAutoRefreshButton(false);
    console.log('⏹️ Auto-refresh detenido');
}

/**
 * Toggle auto-refresh
 */
function toggleAutoRefresh() {
    if (autoRefreshInterval) {
        stopAutoRefresh();
        showNotification('Auto-refresh desactivado', 'info');
    } else {
        startAutoRefresh();
        showNotification('Auto-refresh activado', 'success');
    }
}

/**
 * Actualizar botón de auto-refresh
 */
function updateAutoRefreshButton(active) {
    const btn = document.getElementById('auto-refresh-btn');
    if (btn) {
        if (active) {
            btn.innerHTML = '✅ Activo';
            btn.className = 'btn btn-success';
        } else {
            btn.innerHTML = '❌ Inactivo';
            btn.className = 'btn btn-danger';
        }
    }
}

/**
 * Iniciar monitoreo de conexión
 */
function startConnectionMonitoring() {
    // Verificar conexión inmediatamente
    testServerConnection();
    
    // Verificar cada 30 segundos
    connectionCheckInterval = setInterval(() => {
        if (currentUser) {
            testServerConnection();
        }
    }, 30000);
}

/**
 * Probar conexión con el servidor
 */
async function testServerConnection() {
    try {
        const result = await window.API.quickConnectivityTest();
        
        isConnected = result.success;
        lastConnectionCheck = new Date();
        
        updateConnectionStatus(result.success, result.message);
        
        if (!result.success) {
            console.warn('⚠️ Problemas de conectividad:', result.message);
        }
        
    } catch (error) {
        isConnected = false;
        lastConnectionCheck = new Date();
        updateConnectionStatus(false, `Error: ${error.message}`);
        console.error('❌ Error verificando conexión:', error);
    }
}

/**
 * Actualizar estado de conexión en UI
 */
function updateConnectionStatus(connected, message) {
    // Actualizar indicador en header
    const connectionDot = document.getElementById('connection-dot');
    const connectionStatus = document.getElementById('connection-status');
    
    if (connectionDot && connectionStatus) {
        if (connected) {
            connectionDot.style.background = '#27ae60';
            connectionStatus.textContent = 'Conectado';
            connectionStatus.style.color = '#27ae60';
        } else {
            connectionDot.style.background = '#e74c3c';
            connectionStatus.textContent = 'Sin conexión';
            connectionStatus.style.color = '#e74c3c';
        }
    }
    
    // Actualizar estado en login
    const serverStatus = document.getElementById('server-status');
    const serverStatusText = document.getElementById('server-status-text');
    
    if (serverStatus && serverStatusText) {
        serverStatus.className = `server-status ${connected ? 'connected' : 'disconnected'}`;
        serverStatusText.textContent = message || (connected ? 'Servidor conectado' : 'Sin conexión con servidor');
    }
}

// ==========================================
// FUNCIONES DE UTILIDAD DE FORMULARIO
// ==========================================

/**
 * Limpiar errores del formulario
 */
function clearFormErrors() {
    document.querySelectorAll('.form-input').forEach(input => {
        input.classList.remove('error');
    });
    document.querySelectorAll('.error-message').forEach(error => {
        error.textContent = '';
    });
}

/**
 * Mostrar error en campo específico
 */
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(`${fieldId}-error`);
    
    if (field) {
        field.classList.add('error');
    }
    
    if (errorElement) {
        errorElement.textContent = message;
    }
}

// ==========================================
// MANEJO DE ERRORES GLOBALES
// ==========================================

/**
 * Manejar errores globales de JavaScript
 */
window.addEventListener('error', function(event) {
    console.error('❌ Error global capturado:', event.error);
    
    // No mostrar notificación para errores menores
    if (!event.error?.message?.includes('ResizeObserver') && 
        !event.error?.message?.includes('Non-Error promise rejection')) {
        showNotification('Ocurrió un error inesperado', 'error');
    }
});

/**
 * Manejar promesas rechazadas no capturadas
 */
window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ Promesa rechazada no capturada:', event.reason);
    
    // Manejar errores de autenticación
    if (event.reason?.message?.includes('401') || 
        event.reason?.message?.includes('authentication')) {
        console.warn('⚠️ Error de autenticación detectado, cerrando sesión...');
        logout();
    } else {
        showNotification('Error de conexión', 'error');
    }
});

// ==========================================
// INFORMACIÓN DEL SISTEMA
// ==========================================

/**
 * Mostrar información del sistema en consola
 */
function showSystemInfo() {
    console.log(`
🍽️ SISTEMA DE GESTIÓN RESTAURANTE - WEB COCINA
=============================================
📊 Dashboard: Vista general de pedidos y estadísticas
👨‍🍳 Cocina: Gestión FIFO de pedidos activos en tiempo real
👥 Administración: Gestión completa de órdenes
🪑 Mesas: Estado y control de mesas del restaurante

🔧 CONFIGURACIÓN TÉCNICA:
- API Base: ${window.API_CONFIG?.BASE_URL || 'http://200.54.216.197:3000/api'}
- Auto-refresh: Cada 10 segundos en sección cocina
- Conexión: Verificación cada 30 segundos
- Tiempo de timeout: 30 segundos por request

🚀 FUNCIONALIDADES:
- ✅ Autenticación con roles y permisos
- ✅ Órdenes en tiempo real con estado FIFO
- ✅ Actualización de estados individuales por plato
- ✅ Monitoreo de tiempos y prioridades
- ✅ Gestión completa de mesas
- ✅ Dashboard con estadísticas en vivo

🎯 ROLES SOPORTADOS:
- Admin: Acceso completo a todas las secciones
- Chef/Cocina: Dashboard + Cocina
- Mesero: Dashboard + Mesas
- Cajero: Dashboard + Administración

📱 Sistema optimizado para tablets y móviles
🔄 Auto-refresh inteligente según rol y sección activa
💾 Persistencia de sesión entre recargas

¡Sistema listo para usar!
    `);
}

/**
 * Obtener información de depuración
 */
function getDebugInfo() {
    return {
        version: '1.0.0',
        currentUser: currentUser?.nombre || 'Sin autenticar',
        userRole: currentUser?.rol || 'N/A',
        currentSection: currentSection,
        isConnected: isConnected,
        lastConnectionCheck: lastConnectionCheck,
        autoRefreshActive: !!autoRefreshInterval,
        ordersCount: orders?.length || 0,
        apiBaseUrl: window.API_CONFIG?.BASE_URL,
        timestamp: new Date().toISOString()
    };
}

// ==========================================
// EXPORTAR FUNCIONES GLOBALES
// ==========================================

// Hacer funciones principales disponibles globalmente
window.logout = logout;
window.toggleAutoRefresh = toggleAutoRefresh;
window.testServerConnection = testServerConnection;
window.getDebugInfo = getDebugInfo;
window.clearFormErrors = clearFormErrors;
window.showFieldError = showFieldError;

// Variables globales para compatibilidad
window.currentUser = currentUser;
window.authToken = authToken;
window.isConnected = isConnected;
window.currentSection = currentSection;
window.orders = orders;

// ==========================================
// COMANDOS DE CONSOLA PARA DEPURACIÓN
// ==========================================

// Comandos útiles para depuración (solo en desarrollo)
if (window.location.hostname === 'localhost' || window.location.hostname.includes('192.168')) {
    window.debugCommands = {
        info: getDebugInfo,
        testConnection: testServerConnection,
        refreshOrders: () => refreshKitchenOrders(),
        simulateError: () => { throw new Error('Error de prueba'); },
        clearAuth: () => { clearAuthData(); showLogin(); },
        showNotification: (msg, type) => showNotification(msg, type),
        getOrders: () => orders,
        getUser: () => currentUser
    };
    
    console.log('🛠️ Comandos de depuración disponibles en window.debugCommands');
    console.log('   - info(): Información del sistema');
    console.log('   - testConnection(): Probar conexión');
    console.log('   - refreshOrders(): Refrescar órdenes');
    console.log('   - clearAuth(): Limpiar autenticación');
    console.log('   - showNotification(msg, type): Mostrar notificación');
}

console.log('✅ Sistema principal inicializado');
console.log('🎮 Funciones de control disponibles globalmente');