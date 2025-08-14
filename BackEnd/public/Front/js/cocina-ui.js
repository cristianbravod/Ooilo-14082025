// ==========================================
// FUNCIONES DE INTERFAZ DE USUARIO - SISTEMA DE COCINA
// ==========================================

// Variables globales de UI
let currentSection = 'dashboard';
let isRefreshing = false;
let orders = [];
let selectedOrderId = null;

// ==========================================
// FUNCIONES DE NAVEGACIÓN
// ==========================================

/**
 * Mostrar sección específica
 */
function showSection(sectionName) {
    // Remover clase active de todas las secciones
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remover clase active de todos los tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Mostrar sección seleccionada
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Activar tab correspondiente
    const targetTab = document.getElementById(`${sectionName}-tab`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    currentSection = sectionName;
    
    // Cargar datos específicos de la sección
    loadSectionData(sectionName);
}

/**
 * Cargar datos específicos de cada sección
 */
function loadSectionData(section) {
    if (!window.currentUser) return;
    
    switch(section) {
        case 'dashboard':
            refreshDashboard();
            break;
        case 'kitchen':
            refreshKitchenOrders();
            break;
        case 'admin':
            refreshOrders();
            break;
        case 'tables':
            refreshTables();
            break;
    }
}

/**
 * Configurar permisos según rol de usuario
 */
function setupRolePermissions() {
    const userRole = window.currentUser?.rol || 'guest';
    
    const ROLE_PERMISSIONS = {
        'admin': ['dashboard', 'kitchen', 'admin', 'tables'],
        'chef': ['dashboard', 'kitchen'],
        'cocina': ['dashboard', 'kitchen'],
        'mesero': ['dashboard', 'tables'],
        'cajero': ['dashboard', 'admin'],
        'guest': ['dashboard']
    };
    
    const allowedSections = ROLE_PERMISSIONS[userRole] || ['dashboard'];
    
    // Mostrar/ocultar tabs según permisos
    document.querySelectorAll('.nav-tab').forEach(tab => {
        const sectionId = tab.getAttribute('onclick')?.match(/showSection\('(\w+)'/)?.[1];
        if (sectionId && !allowedSections.includes(sectionId)) {
            tab.classList.add('hidden');
        } else {
            tab.classList.remove('hidden');
        }
    });
    
    // Si la sección actual no está permitida, ir a dashboard
    if (!allowedSections.includes(currentSection)) {
        showSection('dashboard');
    }
}

// ==========================================
// FUNCIONES DE RENDERIZADO DE ÓRDENES
// ==========================================

function getOrderDisplayStatus(order) {
    if (!order || !order.items || order.items.length === 0) {
        return order.estado || 'pendiente';
    }

    const itemStates = order.items.map(item => item.estado || 'pendiente');

    if (itemStates.includes('preparando')) {
        return 'preparando';
    }
    if (itemStates.every(state => state === 'lista')) {
        return 'lista';
    }
    if (itemStates.every(state => state === 'pendiente')) {
        return 'pendiente';
    }
    if (itemStates.some(state => state === 'lista')) {
        return 'preparando';
    }

    return order.estado; // Fallback to the original state
}

/**
 * Renderizar órdenes en contenedor específico
 */
function renderOrdersInContainer(containerId, ordenes, showActions = true) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ Contenedor ${containerId} no encontrado`);
        return;
    }
    
    if (!ordenes || ordenes.length === 0) {
        container.innerHTML = `
            <div class="no-orders">
                <div class="icon">🍽️</div>
                <h3>No hay órdenes activas</h3>
                <p>Las nuevas órdenes aparecerán aquí automáticamente</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = ordenes.map(orden => renderOrderCard(orden, showActions)).join('');
    
    // Aplicar estilos de prioridad
    applyPriorityStyles();
}

/**
 * Renderizar tarjeta individual de orden
 */
function renderOrderCard(orden, showActions = true) {
    const timeAgo = formatTimeAgo(orden.fecha_creacion);
    const waitTime = orden.minutos_espera || 0;
    const priority = orden.prioridad || 'NORMAL';
    const displayStatus = getOrderDisplayStatus(orden);
    
    return `
        <div class="order-card" data-order-id="${orden.id}" data-priority="${priority}">
            <div class="order-header">
                <div class="order-info">
                    <h3>🪑 ${orden.mesa_numero || orden.mesa || 'Mesa ?'}</h3>
                    <span class="order-id">Orden #${orden.id}</span>
                    <span class="order-time">${timeAgo}</span>
                    ${waitTime > 0 ? `<span class="wait-time">${waitTime} min</span>` : ''}
                </div>
                ${showActions ? `
                    <div class="order-actions">
                        <div class="status-input-group">
                            <label class="status-label">Estado:</label>
                            <input 
                                type="text" 
                                class="status-input" 
                                value="${displayStatus}" 
                                placeholder="pendiente, preparando, lista, entregada"
                                onkeypress="handleOrderStatusKeyPress(event, ${orden.id})"
                                onblur="handleOrderStatusChange(${orden.id}, this.value)"
                                onchange="handleOrderStatusChange(${orden.id}, this.value)"
                                data-original-value="${displayStatus}"
                                autocomplete="off"
                                spellcheck="false"
                            >
                            <button class="btn-update-status" onclick="updateOrderStatusFromInput(${orden.id})" type="button">
                                ✓
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="order-items">
                ${(orden.items || []).map(item => renderOrderItem(item, orden, showActions)).join('')}
            </div>
            
            ${(orden.observaciones || orden.notas) ? `
                <div class="order-notes">
                    <strong>📝 Observaciones:</strong> ${orden.observaciones || orden.notas}
                </div>
            ` : ''}
            
            <div class="order-footer">
                <span class="order-total">Total: $${formatCurrency(orden.total || 0)}</span>
                <span class="order-status ${getStatusClass(displayStatus)}">${getStatusLabel(displayStatus)}</span>
                ${showActions ? `
                    <button class="btn btn-secondary btn-sm" onclick="showOrderDetails(${orden.id})">
                        👁️ Detalles
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Renderizar item individual de orden
 */
function renderOrderItem(item, orden, showActions = true) {
    const isOrderInProgress = orden && orden.items.some(i => i.estado === 'preparando' || i.estado === 'lista');
    const isItemPending = (item.estado || 'pendiente') === 'pendiente';
    const highlightClass = isOrderInProgress && isItemPending ? 'item-pending-urgent' : '';

    return `
        <div class="order-item ${highlightClass}" data-item-id="${item.id}">
            <div class="item-info">
                <span class="item-name">${item.nombre || 'Item desconocido'}</span>
                <span class="item-quantity">x${item.cantidad}</span>
                ${(item.instrucciones_especiales || item.observaciones) ? `
                    <div class="item-notes">📝 ${item.instrucciones_especiales || item.observaciones}</div>
                ` : ''}
            </div>
            ${showActions ? `
                <div class="item-actions">
                    <div class="item-status-input-group">
                        <input 
                            type="text" 
                            class="item-status-input" 
                            value="${item.estado || 'pendiente'}" 
                            placeholder="pendiente, preparando, lista, entregado"
                            onkeypress="handleItemStatusKeyPress(event, ${orden.id}, ${item.id})"
                            onblur="handleItemStatusChange(${orden.id}, ${item.id}, this.value)"
                            onchange="handleItemStatusChange(${orden.id}, ${item.id}, this.value)"
                            data-original-value="${item.estado || 'pendiente'}"
                            autocomplete="off"
                            spellcheck="false"
                        >
                        <button class="btn-update-item-status" onclick="updateItemStatusFromInput(${orden.id}, ${item.id})" type="button">
                            ✓
                        </button>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// ==========================================
// FUNCIONES DE EVENTOS DE ÓRDENES
// ==========================================

/**
 * Manejar tecla presionada en input de estado de orden
 */
function handleOrderStatusKeyPress(event, ordenId) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const input = event.target;
        handleOrderStatusChange(ordenId, input.value);
    }
}

/**
 * Manejar tecla presionada en input de estado de item
 */
function handleItemStatusKeyPress(event, ordenId, itemId) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const input = event.target;
        handleItemStatusChange(ordenId, itemId, input.value);
    }
}

/**
 * Actualizar estado de orden desde input
 */
function updateOrderStatusFromInput(ordenId) {
    const input = document.querySelector(`[data-order-id="${ordenId}"] .status-input`);
    if (input) {
        handleOrderStatusChange(ordenId, input.value);
    }
}

/**
 * Actualizar estado de item desde input
 */
function updateItemStatusFromInput(ordenId, itemId) {
    const input = document.querySelector(`[data-item-id="${itemId}"] .item-status-input`);
    if (input) {
        handleItemStatusChange(ordenId, itemId, input.value);
    }
}

/**
 * Validar estado ingresado
 */
function validateStatus(estado, type = 'order') {
    const validOrderStates = ['pendiente', 'preparando', 'lista', 'listo', 'entregada', 'cancelada'];
    const validItemStates = ['pendiente', 'preparando', 'lista', 'listo', 'entregado', 'cancelado'];
    
    const validStates = type === 'order' ? validOrderStates : validItemStates;
    const normalizedState = estado.toLowerCase().trim();
    
    return validStates.includes(normalizedState) ? normalizedState : null;
}

/**
 * Manejar cambio de estado de orden
 */
async function handleOrderStatusChange(ordenId, nuevoEstado) {
    if (!nuevoEstado) return;
    
    // Validar estado
    const validatedState = validateStatus(nuevoEstado, 'order');
    if (!validatedState) {
        showNotification('Estado inválido. Use: pendiente, preparando, lista, entregada, cancelada', 'error');
        // Revertir al valor original
        const input = document.querySelector(`[data-order-id="${ordenId}"] .status-input`);
        if (input) {
            input.value = input.dataset.originalValue;
        }
        return;
    }
    
    try {
        // Mostrar estado de carga en el input
        const input = document.querySelector(`[data-order-id="${ordenId}"] .status-input`);
        const button = document.querySelector(`[data-order-id="${ordenId}"] .btn-update-status`);
        
        if (input) input.disabled = true;
        if (button) {
            button.disabled = true;
            button.innerHTML = '⏳';
        }
        
        await window.API.updateOrderStatus(ordenId, validatedState);
        
        showNotification(`Orden #${ordenId} actualizada a: ${getStatusLabel(validatedState)}`, 'success');
        
        // Actualizar el valor original en el input
        if (input) {
            input.dataset.originalValue = validatedState;
        }
        
        // Refrescar órdenes después de un breve delay
        setTimeout(() => refreshCurrentSection(), 500);
        
    } catch (error) {
        console.error('❌ Error actualizando orden:', error);
        showNotification(`Error actualizando orden #${ordenId}`, 'error');
        
        // Revertir el input en caso de error
        const input = document.querySelector(`[data-order-id="${ordenId}"] .status-input`);
        if (input) {
            input.value = input.dataset.originalValue;
        }
        
    } finally {
        // Rehabilitar controles
        const input = document.querySelector(`[data-order-id="${ordenId}"] .status-input`);
        const button = document.querySelector(`[data-order-id="${ordenId}"] .btn-update-status`);
        
        if (input) input.disabled = false;
        if (button) {
            button.disabled = false;
            button.innerHTML = '✓';
        }
    }
}

/**
 * Manejar cambio de estado de item
 */
async function handleItemStatusChange(ordenId, itemId, nuevoEstado) {
    if (!nuevoEstado) return;
    
    // Validar estado
    const validatedState = validateStatus(nuevoEstado, 'item');
    if (!validatedState) {
        showNotification('Estado inválido. Use: pendiente, preparando, lista, entregado, cancelado', 'error');
        // Revertir al valor original
        const input = document.querySelector(`[data-item-id="${itemId}"] .item-status-input`);
        if (input) {
            input.value = input.dataset.originalValue;
        }
        return;
    }
    
    try {
        // Mostrar estado de carga en el input
        const input = document.querySelector(`[data-item-id="${itemId}"] .item-status-input`);
        const button = document.querySelector(`[data-item-id="${itemId}"] .btn-update-item-status`);
        
        if (input) input.disabled = true;
        if (button) {
            button.disabled = true;
            button.innerHTML = '⏳';
        }
        
        const response = await window.API.updateItemStatus(ordenId, itemId, validatedState);
        
        showNotification(`Item actualizado a: ${getStatusLabel(validatedState)}`, 'success');
        
        // Si la orden se completó automáticamente, mostrar notificación especial
        if (response.orden_completada) {
            showNotification(`¡Orden #${ordenId} completada automáticamente!`, 'success');
        }
        
        // Actualizar el valor original en el input
        if (input) {
            input.dataset.originalValue = validatedState;
        }
        
        // Refrescar órdenes
        setTimeout(() => refreshCurrentSection(), 500);
        
    } catch (error) {
        console.error('❌ Error actualizando item:', error);
        showNotification('Error actualizando item', 'error');
        
        // Revertir el input en caso de error
        const input = document.querySelector(`[data-item-id="${itemId}"] .item-status-input`);
        if (input) {
            input.value = input.dataset.originalValue;
        }
        
    } finally {
        // Rehabilitar controles
        const input = document.querySelector(`[data-item-id="${itemId}"] .item-status-input`);
        const button = document.querySelector(`[data-item-id="${itemId}"] .btn-update-item-status`);
        
        if (input) input.disabled = false;
        if (button) {
            button.disabled = false;
            button.innerHTML = '✓';
        }
    }
}

/**
 * Mostrar detalles de orden en modal
 */
function showOrderDetails(ordenId) {
    const orden = orders.find(o => o.id == ordenId);
    if (!orden) {
        showNotification('Orden no encontrada', 'error');
        return;
    }
    
    const modal = document.getElementById('order-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    modalTitle.textContent = `Detalles - Orden #${orden.id}`;
    
    modalBody.innerHTML = `
        <div class="order-details">
            <div class="detail-section">
                <h4>📍 Información General</h4>
                <p><strong>Mesa:</strong> ${orden.mesa_numero || orden.mesa}</p>
                <p><strong>Estado:</strong> <span class="order-status ${getStatusClass(orden.estado)}">${getStatusLabel(orden.estado)}</span></p>
                <p><strong>Total:</strong> $${formatCurrency(orden.total || 0)}</p>
                <p><strong>Creada:</strong> ${formatDateTime(orden.fecha_creacion)}</p>
                ${orden.minutos_espera ? `<p><strong>Tiempo de espera:</strong> ${orden.minutos_espera} minutos</p>` : ''}
            </div>
            
            <div class="detail-section">
                <h4>🍽️ Items del Pedido</h4>
                <div class="modal-items">
                    ${(orden.items || []).map(item => `
                        <div class="modal-item">
                            <div class="item-header">
                                <span class="item-name">${item.nombre}</span>
                                <span class="item-quantity">x${item.cantidad}</span>
                                <span class="item-status ${getStatusClass(item.estado)}">${getStatusLabel(item.estado || 'pendiente')}</span>
                            </div>
                            ${(item.instrucciones_especiales || item.observaciones) ? `
                                <div class="item-notes">📝 ${item.instrucciones_especiales || item.observaciones}</div>
                            ` : ''}
                            <div class="item-price">$${formatCurrency((item.precio_unitario || 0) * item.cantidad)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            ${(orden.observaciones || orden.notas) ? `
                <div class="detail-section">
                    <h4>📝 Observaciones</h4>
                    <p>${orden.observaciones || orden.notas}</p>
                </div>
            ` : ''}
        </div>
    `;
    
    selectedOrderId = ordenId;
    modal.style.display = 'flex';
}

/**
 * Cerrar modal de detalles
 */
function closeOrderModal() {
    const modal = document.getElementById('order-modal');
    modal.style.display = 'none';
    selectedOrderId = null;
}

/**
 * Actualizar orden desde modal
 */
function updateOrderFromModal() {
    if (!selectedOrderId) return;
    
    // Por ahora solo cerrar modal, funcionalidad de edición se puede agregar después
    closeOrderModal();
    showNotification('Funcionalidad de edición próximamente', 'info');
}

// ==========================================
// FUNCIONES DE DASHBOARD
// ==========================================

/**
 * Actualizar estadísticas del dashboard
 */
function updateDashboardStats() {
    const pending = orders.filter(o => o.estado === 'pendiente').length;
    const preparing = orders.filter(o => o.estado === 'preparando').length;
    const ready = orders.filter(o => ['lista', 'listo'].includes(o.estado)).length;
    const totalSales = orders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
    
    // Actualizar elementos del DOM
    updateElementText('pending-orders', pending);
    updateElementText('preparing-orders', preparing);
    updateElementText('ready-orders', ready);
    updateElementText('total-sales', `$${formatCurrency(totalSales)}`);
}

/**
 * Refrescar dashboard
 */
async function refreshDashboard() {
    showLoading('dashboard-orders');
    
    try {
        orders = await window.API.getAllOrders({ limit: 20 });
        updateDashboardStats();
        renderOrdersInContainer('dashboard-orders', orders.slice(0, 6), false);
    } catch (error) {
        console.error('❌ Error cargando dashboard:', error);
        showError('dashboard-orders', 'Error cargando el dashboard');
    }
}

// ==========================================
// FUNCIONES DE COCINA
// ==========================================

/**
 * Refrescar órdenes de cocina
 */
async function refreshKitchenOrders() {
    if (isRefreshing) return;
    
    showLoading('kitchen-orders');
    
    try {
        isRefreshing = true;
        console.log('🍳 Cargando órdenes de cocina con orden FIFO...');
        
        const kitchenOrders = await window.API.getActiveOrders();
        orders = kitchenOrders; // Actualizar órdenes globales
        
        renderOrdersInContainer('kitchen-orders', kitchenOrders, true);
        
        // Actualizar timestamp
        updateLastUpdateTime();
        
        console.log(`✅ ${kitchenOrders.length} órdenes de cocina cargadas`);
        
    } catch (error) {
        console.error('❌ Error cargando órdenes de cocina:', error);
        showError('kitchen-orders', 'Error cargando pedidos de cocina');
    } finally {
        isRefreshing = false;
    }
}

/**
 * Actualizar tiempo de última actualización
 */
function updateLastUpdateTime() {
    const timestamp = document.getElementById('last-update');
    if (timestamp) {
        timestamp.textContent = `Última actualización: ${new Date().toLocaleTimeString()}`;
    }
}

// ==========================================
// FUNCIONES DE ADMINISTRACIÓN
// ==========================================

/**
 * Refrescar órdenes de administración
 */
async function refreshOrders() {
    showLoading('admin-orders');
    
    try {
        orders = await window.API.getAllOrders();
        renderOrdersInContainer('admin-orders', orders, true);
    } catch (error) {
        console.error('❌ Error cargando órdenes de administración:', error);
        showError('admin-orders', 'Error cargando pedidos');
    }
}

/**
 * Exportar órdenes (placeholder)
 */
function exportOrders() {
    showNotification('Funcionalidad de exportación próximamente', 'info');
}

// ==========================================
// FUNCIONES DE MESAS
// ==========================================

/**
 * Refrescar mesas
 */
async function refreshTables() {
    showLoading('tables-grid');
    
    try {
        const mesas = await window.API.getAllTables();
        renderTablesGrid(mesas);
    } catch (error) {
        console.error('❌ Error cargando mesas:', error);
        showError('tables-grid', 'Error cargando mesas');
    }
}

/**
 * Renderizar grid de mesas
 */
function renderTablesGrid(mesas) {
    const container = document.getElementById('tables-grid');
    
    if (!mesas || mesas.length === 0) {
        container.innerHTML = `
            <div class="no-orders">
                <div class="icon">🪑</div>
                <h3>No hay mesas configuradas</h3>
                <p>Agregue mesas para comenzar a gestionar el restaurante</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = mesas.map(mesa => `
        <div class="table-card" data-table-id="${mesa.id}">
            <div class="table-header">
                <h3>${mesa.nombre}</h3>
                <span class="table-status status-${mesa.estado}">${getStatusLabel(mesa.estado)}</span>
            </div>
            <div class="table-info">
                <p><strong>Número:</strong> ${mesa.numero}</p>
                <p><strong>Capacidad:</strong> ${mesa.capacidad} personas</p>
                <p><strong>Ubicación:</strong> ${mesa.ubicacion || 'Sin especificar'}</p>
                <p><strong>Tipo:</strong> ${mesa.tipo || 'Mesa'}</p>
            </div>
            <div class="table-actions">
                <select class="status-select" onchange="handleTableStatusChange(${mesa.id}, this.value)">
                    <option value="disponible" ${mesa.estado === 'disponible' ? 'selected' : ''}>✅ Disponible</option>
                    <option value="ocupada" ${mesa.estado === 'ocupada' ? 'selected' : ''}>🔴 Ocupada</option>
                    <option value="limpieza" ${mesa.estado === 'limpieza' ? 'selected' : ''}>🧽 En Limpieza</option>
                    <option value="fuera_servicio" ${mesa.estado === 'fuera_servicio' ? 'selected' : ''}>⛔ Fuera de Servicio</option>
                </select>
            </div>
        </div>
    `).join('');
}

/**
 * Manejar cambio de estado de mesa
 */
async function handleTableStatusChange(mesaId, nuevoEstado) {
    if (!nuevoEstado) return;
    
    try {
        showLoadingButton(`[data-table-id="${mesaId}"] .status-select`);
        
        await window.API.updateTableStatus(mesaId, nuevoEstado);
        
        showNotification(`Mesa actualizada a: ${getStatusLabel(nuevoEstado)}`, 'success');
        
        // Refrescar mesas
        setTimeout(() => refreshTables(), 500);
        
    } catch (error) {
        console.error('❌ Error actualizando mesa:', error);
        showNotification('Error actualizando mesa', 'error');
        
        // Revertir el select en caso de error
        setTimeout(() => refreshTables(), 1000);
    }
}

/**
 * Agregar nueva mesa (placeholder)
 */
function addTable() {
    showNotification('Funcionalidad de agregar mesa próximamente', 'info');
}

// ==========================================
// FUNCIONES DE ESTADO Y LOADING
// ==========================================

/**
 * Mostrar estado de carga
 */
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Cargando...</p>
            </div>
        `;
    }
}

/**
 * Mostrar error
 */
function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="error-state">
                <div class="icon">❌</div>
                <h3>Error</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="refreshCurrentSection()">
                    🔄 Reintentar
                </button>
            </div>
        `;
    }
}

/**
 * Mostrar botón de carga
 */
function showLoadingButton(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.disabled = true;
        const originalText = element.textContent || element.innerHTML;
        element.dataset.originalText = originalText;
        element.innerHTML = '⏳';
        
        // Restaurar después de 2 segundos
        setTimeout(() => {
            element.disabled = false;
            element.innerHTML = originalText;
        }, 2000);
    }
}

/**
 * Refrescar sección actual
 */
function refreshCurrentSection() {
    loadSectionData(currentSection);
}

// ==========================================
// FUNCIONES DE UTILIDAD
// ==========================================

/**
 * Formatear tiempo relativo
 */
function formatTimeAgo(fechaCreacion) {
    try {
        const fecha = new Date(fechaCreacion);
        const ahora = new Date();
        const diffMs = ahora - fecha;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        
        if (diffMins < 1) return 'Recién';
        if (diffMins < 60) return `${diffMins} min`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
        return fecha.toLocaleDateString();
    } catch (error) {
        return 'Tiempo desconocido';
    }
}

/**
 * Formatear fecha y hora completa
 */
function formatDateTime(fecha) {
    try {
        return new Date(fecha).toLocaleString('es-CL');
    } catch (error) {
        return 'Fecha desconocida';
    }
}

/**
 * Formatear moneda
 */
function formatCurrency(amount) {
    try {
        return new Intl.NumberFormat('es-CL', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    } catch (error) {
        return amount?.toString() || '0';
    }
}

/**
 * Obtener etiqueta de estado
 */
function getStatusLabel(estado) {
    const labels = {
        'pendiente': '⏳ Pendiente',
        'confirmada': '✅ Confirmada',
        'preparando': '🔥 Preparando',
        'lista': '🔔 Lista',
        'listo': '🔔 Listo',
        'entregada': '📦 Entregada',
        'entregado': '📦 Entregado',
        'cancelada': '❌ Cancelada',
        'disponible': '✅ Disponible',
        'ocupada': '🔴 Ocupada',
        'limpieza': '🧽 En Limpieza',
        'fuera_servicio': '⛔ Fuera de Servicio'
    };
    return labels[estado] || estado;
}

/**
 * Obtener clase CSS de estado
 */
function getStatusClass(estado) {
    return `status-${estado?.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
}

/**
 * Aplicar estilos de prioridad
 */
function applyPriorityStyles() {
    document.querySelectorAll('.order-card').forEach(card => {
        const priority = card.dataset.priority;
        card.classList.remove('priority-alta', 'priority-media', 'priority-normal');
        
        if (priority === 'ALTA') {
            card.classList.add('priority-alta');
        } else if (priority === 'MEDIA') {
            card.classList.add('priority-media');
        } else {
            card.classList.add('priority-normal');
        }
    });
}

/**
 * Actualizar texto de elemento
 */
function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

// ==========================================
// FUNCIONES DE NOTIFICACIONES
// ==========================================

/**
 * Mostrar notificación
 */
function showNotification(message, type = 'info') {
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.display = 'block';
    
    // Auto-ocultar después de 4 segundos
    setTimeout(() => {
        if (notification && notification.style.display === 'block') {
            notification.style.display = 'none';
        }
    }, 4000);
}

/**
 * Mostrar overlay de carga
 */
function showLoadingOverlay(show = true) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

// ==========================================
// DEBUG Y UTILIDADES
// ==========================================

/**
 * Debug - Verificar que los inputs sean editables
 */
function debugInputs() {
    console.log('🔍 Verificando inputs editables...');
    
    const statusInputs = document.querySelectorAll('.status-input');
    const itemInputs = document.querySelectorAll('.item-status-input');
    
    console.log(`📊 Encontrados: ${statusInputs.length} inputs de estado de orden`);
    console.log(`📊 Encontrados: ${itemInputs.length} inputs de estado de item`);
    
    statusInputs.forEach((input, index) => {
        console.log(`📝 Input orden ${index + 1}:`, {
            disabled: input.disabled,
            readonly: input.readOnly,
            value: input.value,
            placeholder: input.placeholder,
            cursor: getComputedStyle(input).cursor,
            userSelect: getComputedStyle(input).userSelect
        });
    });
    
    itemInputs.forEach((input, index) => {
        console.log(`📝 Input item ${index + 1}:`, {
            disabled: input.disabled,
            readonly: input.readOnly,
            value: input.value,
            placeholder: input.placeholder,
            cursor: getComputedStyle(input).cursor,
            userSelect: getComputedStyle(input).userSelect
        });
    });
}

// ==========================================
// EXPORTAR FUNCIONES GLOBALES
// ==========================================

// Hacer funciones disponibles globalmente
window.showSection = showSection;
window.setupRolePermissions = setupRolePermissions;
window.handleOrderStatusChange = handleOrderStatusChange;
window.handleItemStatusChange = handleItemStatusChange;
window.handleOrderStatusKeyPress = handleOrderStatusKeyPress;
window.handleItemStatusKeyPress = handleItemStatusKeyPress;
window.updateOrderStatusFromInput = updateOrderStatusFromInput;
window.updateItemStatusFromInput = updateItemStatusFromInput;
window.handleTableStatusChange = handleTableStatusChange;
window.showOrderDetails = showOrderDetails;
window.closeOrderModal = closeOrderModal;
window.updateOrderFromModal = updateOrderFromModal;
window.refreshDashboard = refreshDashboard;
window.refreshKitchenOrders = refreshKitchenOrders;
window.refreshOrders = refreshOrders;
window.refreshTables = refreshTables;
window.refreshCurrentSection = refreshCurrentSection;
window.exportOrders = exportOrders;
window.addTable = addTable;
window.showNotification = showNotification;
window.showLoadingOverlay = showLoadingOverlay;
window.debugInputs = debugInputs; // Debug function

console.log('✅ UI de cocina inicializada con inputs de texto');
console.log('🎨 Funciones de interfaz disponibles globalmente');
console.log('🔧 Para debug: window.debugInputs()');