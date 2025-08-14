// ==========================================
// CONFIGURACIÓN DEL RESTAURANTE
// ==========================================

const RESTAURANT_CONFIG = {
    name: "Ooilo Taqueria",
    iconPath: "icon.png",
    defaultPhone: "+56987654321",
    defaultHours: "Lun-Dom: 11:00 - 23:00",
    defaultAddress: "Av. Alemania 1234, Temuco, Chile"
};

// ==========================================
// VARIABLES GLOBALES
// ==========================================

let menuData = null;
let configurationApplied = false;
let specialItemIds = new Set();

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function getDefaultImage() {
    return "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop";
}

function formatPrice(price) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(price);
}

// ==========================================
// FUNCIONES PARA FILTRAR POR VIGENCIA
// ==========================================

function esProductoVigente(producto) {
    // Si no existe el campo vigente, asumimos que está vigente
    if (!producto.hasOwnProperty('vigente')) {
        return true;
    }
    
    // Verificar múltiples formas de representar el campo vigente
    return producto.vigente === true || 
           producto.vigente === 'true' || 
           producto.vigente === 1 || 
           producto.vigente === '1';
}


function esProductoDisponible(producto) {
    // Si no existe el campo disponible, asumimos que NO está disponible
    if (!producto.hasOwnProperty('disponible')) {
        return false;
    }
    
    // Verificar múltiples formas de representar el campo disponible
    return producto.disponible === true || 
           producto.disponible === 'true' || 
           producto.disponible === 1 || 
           producto.disponible === '1';
}


function esProductoVigente(producto) {
    // Si no existe el campo vigente, asumimos que está vigente
    if (!producto.hasOwnProperty('vigente')) {
        return true;
    }
    
    // Verificar múltiples formas de representar el campo vigente
    return producto.vigente === true || 
           producto.vigente === 'true' || 
           producto.vigente === 1 || 
           producto.vigente === '1';
}


function esProductoMostrable(producto) {
    return esProductoVigente(producto) && esProductoDisponible(producto);
}

// ==========================================
// CONFIGURACIÓN INICIAL
// ==========================================

function aplicarConfiguracionInicial() {
    if (configurationApplied) return;
    
    console.log('🔧 Aplicando configuración inicial del restaurante...');
    
    const restaurantName = RESTAURANT_CONFIG.name;
    const iconPath = RESTAURANT_CONFIG.iconPath;
    const phone = RESTAURANT_CONFIG.defaultPhone;
    const hours = RESTAURANT_CONFIG.defaultHours;
    const address = RESTAURANT_CONFIG.defaultAddress;
    
    // Actualizar nombre en header y banner
    document.getElementById('restaurant-name').textContent = restaurantName;
    document.getElementById('banner-restaurant-name').textContent = restaurantName;
    
    // Cargar icono personalizado
    const iconElement = document.getElementById('restaurant-icon');
    if (iconPath && iconElement) {
        iconElement.src = iconPath;
        console.log('🖼️ Cargando icono personalizado: ' + iconPath);
    }
    
    // Actualizar información de contacto desde la configuración
    document.getElementById('restaurant-phone').textContent = phone;
    document.getElementById('restaurant-hours').textContent = hours;
    document.getElementById('restaurant-address').textContent = address;
    
    // Actualizar título de la página
    document.title = restaurantName + ' - Menú Digital';
    
    configurationApplied = true;
    console.log('✅ Configuración inicial aplicada para: ' + restaurantName);
}

function updateRestaurantContact(restaurante) {
    if (!restaurante) {
        console.log('⚠️ No hay datos de restaurante del backend, manteniendo configuración local');
        return;
    }
    
    console.log('📞 Actualizando información de contacto desde backend...');
    
    // Solo actualizar la información de contacto si viene del backend Y es diferente
    if (restaurante.telefono && restaurante.telefono !== RESTAURANT_CONFIG.defaultPhone) {
        document.getElementById('restaurant-phone').textContent = restaurante.telefono;
        console.log('📞 Teléfono actualizado desde backend: ' + restaurante.telefono);
    }
    
    if (restaurante.horarios && restaurante.horarios !== RESTAURANT_CONFIG.defaultHours) {
        document.getElementById('restaurant-hours').textContent = restaurante.horarios;
        console.log('🕒 Horarios actualizados desde backend: ' + restaurante.horarios);
    }
    
    if (restaurante.direccion && restaurante.direccion !== RESTAURANT_CONFIG.defaultAddress) {
        document.getElementById('restaurant-address').textContent = restaurante.direccion;
        console.log('📍 Dirección actualizada desde backend: ' + restaurante.direccion);
    }
}