// ==========================================
// INICIALIZACIÓN PRINCIPAL
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🍽️ Menú digital inicializando...');
    console.log('⚙️ Configuración actual: ' + JSON.stringify(RESTAURANT_CONFIG, null, 2));
    
    // 1. Aplicar configuración inicial
    aplicarConfiguracionInicial();
    
    // 2. Forzar actualización de información
    setTimeout(function() {
        console.log('🔄 Forzando actualización de información...');
        document.getElementById('restaurant-phone').textContent = RESTAURANT_CONFIG.defaultPhone;
        document.getElementById('restaurant-hours').textContent = RESTAURANT_CONFIG.defaultHours;
        document.getElementById('restaurant-address').textContent = RESTAURANT_CONFIG.defaultAddress;
    }, 100);
    
    // 3. Configurar eventos del modal
    setupModalEvents();
    
    // 4. Funciones de debug en desarrollo
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.debugMenuDisponibilidad = debugMenuDisponibilidad;
        console.log('🔧 Modo desarrollo activado:');
        console.log('   - debugMenuDisponibilidad(): Debug del filtro de disponibilidad');
    }
    
    // 5. Cargar menú
    cargarMenu();
    
    // 6. Configurar funcionalidades de imagen después de cargar el menú
    setTimeout(function() {
        setupImageAccessibility();
    }, 1000);
});

// ==========================================
// ACTUALIZACIÓN AUTOMÁTICA
// ==========================================

// Actualizar menú cada 5 minutos
setInterval(function() {
    console.log('🔄 Actualizando datos del menú...');
    cargarMenu();
}, 5 * 60 * 1000);

// ==========================================
// LOG DE INICIALIZACIÓN
// ==========================================

console.log('🍽️ Menú digital inicializado con filtro de disponibilidad: ' + RESTAURANT_CONFIG.name);