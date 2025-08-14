# 🍽️ Sistema Web de Cocina - Restaurante

Sistema web completo para gestión de órdenes de cocina en tiempo real, con interfaz optimizada para tablets y monitores de cocina.

## 🏗️ Estructura de Archivos Organizada

```
web-cocina/
├── index.html              # HTML principal limpio y organizado
├── styles.css              # Estilos CSS completos y responsivos
├── js/
│   ├── cocina-api.js       # Comunicación con backend
│   ├── cocina-ui.js        # Interfaz de usuario y renderizado
│   └── cocina-main.js      # Inicialización y control principal
└── README.md               # Esta documentación
```

## 🚀 Características Principales

### ✅ **Funcionalidades Implementadas**
- **Autenticación completa** con roles y permisos
- **Dashboard en tiempo real** con estadísticas
- **Panel de cocina FIFO** - órdenes ordenadas por llegada
- **Gestión de estados** - individual por plato y por orden completa
- **Auto-refresh inteligente** cada 10 segundos
- **Monitoreo de conexión** automático
- **Interfaz responsiva** optimizada para tablets
- **Notificaciones en tiempo real**
- **Persistencia de sesión**

### 🎯 **Secciones del Sistema**
1. **📊 Dashboard**: Vista general con estadísticas
2. **👨‍🍳 Cocina**: Gestión de órdenes activas (FIFO)
3. **👥 Administración**: Gestión completa de órdenes
4. **🪑 Mesas**: Control de estado de mesas

### 🔐 **Roles y Permisos**
- **Admin**: Acceso completo a todas las secciones
- **Chef/Cocina**: Dashboard + Cocina
- **Mesero**: Dashboard + Mesas  
- **Cajero**: Dashboard + Administración

## 📋 Implementación

### **Paso 1: Estructura de Archivos**
Crear la estructura de carpetas y copiar los archivos:

```bash
mkdir web-cocina
cd web-cocina
mkdir js

# Copiar archivos desde los artifacts:
# - index.html (artifact: index_html_organizado)
# - styles.css (artifact: styles_css)  
# - js/cocina-api.js (artifact: cocina_api_js)
# - js/cocina-ui.js (artifact: cocina_ui_js)
# - js/cocina-main.js (artifact: cocina_main_js)
```

### **Paso 2: Configuración de Backend**
Verificar que el backend tenga estos endpoints funcionando:

```javascript
// Endpoints requeridos:
POST /api/auth/login                    // Login
GET  /api/ordenes/activas              // Órdenes para cocina
GET  /api/ordenes                      // Todas las órdenes
PATCH /api/ordenes/:id/estado          // Cambiar estado orden
PATCH /api/ordenes/:id/items/:id/estado // Cambiar estado item
GET  /api/mesas                        // Obtener mesas
PATCH /api/mesas/:id/estado            // Cambiar estado mesa
GET  /api/health                       // Health check
```

### **Paso 3: Configuración de URL**
Editar `js/cocina-api.js` línea 12 si es necesario:

```javascript
BASE_URL: 'http://200.54.216.197:3000/api', // ← Cambiar si es diferente
```

### **Paso 4: Usuarios de Prueba**
Crear usuarios en la base de datos con estos roles:

```sql
-- Ejemplo de usuarios
INSERT INTO usuarios (email, password, nombre, rol) VALUES
('admin@restaurante.com', 'password_hash', 'Administrador', 'admin'),
('chef@restaurante.com', 'password_hash', 'Chef Principal', 'chef'),
('cocina@restaurante.com', 'password_hash', 'Cocinero', 'cocina');
```

## 🔧 Configuración Técnica

### **Variables de Configuración**
El archivo `cocina-api.js` contiene la configuración principal:

```javascript
const API_CONFIG = {
    BASE_URL: 'http://200.54.216.197:3000/api',
    TIMEOUTS: {
        DEFAULT: 30000,     // 30 segundos timeout
        HEALTH_CHECK: 10000, // 10 segundos health check
        LOGIN: 15000        // 15 segundos login
    },
    RETRY_ATTEMPTS: 3,      // Reintentos automáticos
    RETRY_DELAY: 1000      // Delay entre reintentos
};
```

### **Auto-refresh**
- **Frecuencia**: Cada 10 segundos en sección cocina
- **Condiciones**: Solo cuando la página está visible y usuario es chef/cocina
- **Control**: Botón manual para activar/desactivar

### **Monitoreo de Conexión**
- **Verificación**: Cada 30 segundos
- **Indicador visual**: Punto de estado en header
- **Fallback**: Datos simulados si servidor no disponible

## 🎨 Diseño y UX

### **Responsive Design**
- **Desktop**: Layout completo con todas las funciones
- **Tablet**: Optimizado para uso en cocina (pantalla principal)
- **Mobile**: Layout adaptado para pantallas pequeñas

### **Sistema de Colores**
```css
--primary-color: #3498db    /* Azul principal */
--success-color: #27ae60    /* Verde éxito */
--warning-color: #f39c12    /* Naranja advertencia */
--danger-color: #e74c3c     /* Rojo peligro */
```

### **Estados de Órdenes**
- **⏳ Pendiente**: Recién llegada, esperando preparación
- **🔥 Preparando**: En proceso de cocina
- **✅ Listo**: Terminado, listo para entregar
- **📦 Entregada**: Orden completada

### **Prioridades Visuales**
- **🔴 ALTA**: Más de 30 minutos - Borde rojo
- **🟡 MEDIA**: 15-30 minutos - Borde amarillo  
- **🟢 NORMAL**: Menos de 15 minutos - Borde verde

## 🔍 Depuración y Logs

### **Consola del Navegador**
El sistema proporciona logs detallados:

```javascript
// Comandos útiles en consola:
getDebugInfo()              // Información del sistema
testServerConnection()      // Probar conexión
refreshKitchenOrders()     // Refrescar órdenes manualmente
window.debugCommands       // Comandos de depuración (desarrollo)
```

### **Información del Sistema**
```javascript
// Al cargar, muestra en consola:
🍽️ SISTEMA DE GESTIÓN RESTAURANTE - WEB COCINA
- API Base: http://200.54.216.197:3000/api
- Auto-refresh: Cada 10 segundos
- Conexión: Verificación cada 30 segundos
- Estado: Sistema listo para usar
```

## 🚨 Solución de Problemas

### **Error: "No se puede conectar con el servidor"**
1. Verificar que el backend esté ejecutándose
2. Comprobar la URL en `cocina-api.js`
3. Verificar que los endpoints estén disponibles
4. Revisar CORS si es necesario

### **Error: "Token expirado"**
- El sistema automáticamente redirige al login
- Los tokens se verifican en cada request
- La sesión se mantiene en localStorage

### **Error: "Órdenes no se actualizan"**
1. Verificar conexión de red
2. Comprobar que auto-refresh esté activo
3. Revisar logs en consola del navegador
4. Verificar permisos del usuario

### **Problemas de Rendimiento**
- Auto-refresh solo funciona en sección activa
- Se pausa cuando la pestaña no está visible
- Usa debouncing para evitar requests duplicados

## 📱 Uso Recomendado

### **Para Tablets en Cocina**
1. Abrir en navegador full-screen
2. Mantener en sección "👨‍🍳 Cocina"
3. Auto-refresh mantendrá datos actualizados
4. Usar touch para cambiar estados

### **Para Monitores**
1. Proyectar en pantallas grandes
2. Modo de solo lectura para visualización
3. Dashboard para vista general

### **Para Administración**
1. Usar sección "👥 Administración"
2. Acceso completo a historial
3. Funciones de exportación (próximamente)

## 🔄 Flujo de Trabajo

### **Flujo Típico de Cocina**
1. **Nueva orden llega** → Aparece en "⏳ Pendiente"
2. **Chef la toma** → Cambiar a "🔥 Preparando"
3. **Platos individuales** → Marcar como "✅ Listo"
4. **Orden completa** → Sistema marca automáticamente como "✅ Lista"
5. **Mesero recoge** → Cambiar a "📦 Entregada"

### **Estados Automáticos**
- Si todos los items están "Listo" → Orden se marca "Lista"
- Tiempo de espera se calcula automáticamente
- Prioridad se asigna según tiempo transcurrido

## 🔐 Seguridad

### **Autenticación**
- Tokens JWT con expiración
- Verificación automática de sesiones
- Cierre automático por inactividad

### **Autorización**
- Permisos por rol estrictamente aplicados
- Rutas protegidas según usuario
- Validación en frontend y backend

### **Datos Sensibles**
- No almacenamiento de contraseñas en frontend
- Tokens encriptados en localStorage
- Comunicación HTTPS recomendada

## 📈 Métricas y Estadísticas

### **Dashboard Muestra**
- **Pedidos Pendientes**: Conteo en tiempo real
- **En Preparación**: Órdenes activas
- **Listos para Entregar**: Órdenes completadas
- **Ventas del Día**: Total acumulado

### **Datos de Rendimiento**
- Tiempo promedio de preparación
- Órdenes por hora
- Eficiencia de cocina
- Tiempos de espera

## 🛠️ Mantenimiento

### **Actualizaciones**
- Sistema modular para fácil actualización
- Archivos separados por funcionalidad
- Configuración centralizada

### **Backup**
- Datos en backend (PostgreSQL)
- Configuración en archivos de texto
- Logs automáticos del sistema

### **Monitoreo**
- Health checks automáticos
- Alertas de conexión
- Métricas de uso en tiempo real

---

## 📞 Soporte

Para problemas técnicos:
1. Revisar logs en consola del navegador
2. Verificar conexión con backend
3. Comprobar configuración de endpoints
4. Usar comandos de depuración disponibles

**Sistema desarrollado para máxima eficiencia en cocina y gestión de restaurante** 🍽️✨