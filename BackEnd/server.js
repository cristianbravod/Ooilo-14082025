// server.js - VERSIÓN CORREGIDA CON /api/menu-publico
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const config = require('./src/config/database');

// ==========================================
// IMPORTACIÓN DE RUTAS - NOMBRES EXACTOS
// ==========================================
const authRoutes = require('./src/routes/auth');
const menuRoutes = require('./src/routes/menu');
const categoriasRoutes = require('./src/routes/categorias');
const orderRoutes = require('./src/routes/orderRoutes');
const mesasRoutes = require('./src/routes/mesas');
const platosEspecialesRoutes = require('./src/routes/platos-especiales');
const uploadRoutes = require('./src/routes/upload');

// ✅ IMPORTAR CONTROLADOR PARA RUTAS DIRECTAS
const MenuController = require('./src/controllers/MenuController');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Iniciando servidor...');
console.log('📦 Cargando middlewares y rutas...');
console.log('✅ Todos los archivos de rutas importados correctamente');

// ==========================================
// CONFIGURACIÓN CORS MEJORADA
// ==========================================
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://192.168.1.100:3000',
      'http://200.54.216.197:3000',
      'http://192.1.1.16:3000',
      'capacitor://localhost',
      'ionic://localhost',
      'http://localhost',
      null // Para aplicaciones móviles
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`⚠️ CORS: Origin bloqueado: ${origin}`);
      callback(null, true); // Permitir de todas formas para desarrollo
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  maxAge: 86400
};

// ✅ MIDDLEWARE MÓVIL MEJORADO
const mobileMiddleware = (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  console.log(`🌐 ${req.method} ${req.path} - Origin: ${req.get('Origin') || 'mobile-app'}`);
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Preflight OPTIONS manejado correctamente');
    return res.status(200).end();
  }
  
  next();
};

// ==========================================
// MIDDLEWARES BÁSICOS (ORDEN CRÍTICO)
// ==========================================

// ✅ 1. CORS PRIMERO
app.use(cors(corsOptions));
app.use(mobileMiddleware);

// ✅ 2. BODY PARSER ANTES QUE LAS RUTAS
app.use(express.json({ 
  limit: '50mb',
  parameterLimit: 50000,
  type: ['application/json', 'text/plain']
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb',
  parameterLimit: 50000
}));

// ✅ 3. ARCHIVOS ESTÁTICOS
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ==========================================
// ENDPOINTS DE DIAGNÓSTICO (ANTES DE LAS RUTAS)
// ==========================================

// ✅ HEALTH CHECK PRINCIPAL
app.get('/api/health', async (req, res) => {
  try {
    const pool = new Pool(config);
    const client = await pool.connect();
    
    // Test de conexión a base de datos
    await client.query('SELECT NOW()');
    client.release();
    
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      version: '2.1.0',
      database: 'Connected',
      migration_status: 'OK',
      environment: process.env.NODE_ENV || 'development',
      server: '192.1.1.16:3000',
      routes_loaded: [
        'auth.js',
        'menu.js', 
        'categorias.js',
        'orderRoutes.js',
        'mesas.js',
        'platos-especiales.js',
        'upload.js'
      ]
    });
  } catch (error) {
    console.error('❌ Health check error:', error.message);
    res.status(500).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      error: error.message,
      server: '192.1.1.16:3000'
    });
  }
});

// ✅ PING ENDPOINT
app.get('/api/ping', (req, res) => {
  res.json({ 
    message: 'pong', 
    timestamp: new Date().toISOString(),
    server: '192.1.1.16:3000' 
  });
});

// ✅ TEST ENDPOINTS
app.get('/api/test-cors', (req, res) => {
  res.json({ 
    message: 'CORS test successful', 
    origin: req.get('Origin'),
    timestamp: new Date().toISOString()
  });
});

app.post('/api/test-body', (req, res) => {
  res.json({ 
    message: 'Body parser test successful', 
    body: req.body,
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// RUTAS DIRECTAS CRÍTICAS (ANTES DE LOS ROUTERS)
// ==========================================

// ✅ RUTA CRÍTICA: /api/menu-publico (la que está fallando)
app.get('/api/menu-publico', MenuController.getMenuForWeb);
console.log('✅ Ruta directa /api/menu-publico registrada');

// ✅ RUTA CRÍTICA: /api/menu (UNION corregida)
app.get('/api/menu', MenuController.getMenu);
console.log('✅ Ruta directa /api/menu registrada');

// ✅ RUTA PARA QR
app.get('/api/qr/menu-publico', MenuController.getMenuForWeb);
console.log('✅ Ruta directa /api/qr/menu-publico registrada');

// ==========================================
// REGISTRAR RUTAS DE LA API (ORDEN CORREGIDO)
// ==========================================

console.log('📋 Registrando rutas de la API...');

// ✅ RUTAS DE AUTENTICACIÓN
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes registradas en /api/auth');

// ✅ RUTAS DE CATEGORÍAS
app.use('/api/categorias', categoriasRoutes);
console.log('✅ Categorias routes registradas en /api/categorias');

// ✅ RUTAS DE MENÚ (las rutas adicionales)
app.use('/api/menu', menuRoutes);
console.log('✅ Menu routes registradas en /api/menu');

// ✅ RUTAS DE PLATOS ESPECIALES (CRÍTICO)
app.use('/api/platos-especiales', platosEspecialesRoutes);
console.log('✅ Platos Especiales routes registradas en /api/platos-especiales');

// ✅ RUTAS DE ÓRDENES
app.use('/api/ordenes', orderRoutes);
console.log('✅ Order routes registradas en /api/ordenes');

// ✅ RUTAS DE MESAS
app.use('/api/mesas', mesasRoutes);
console.log('✅ Mesas routes registradas en /api/mesas');

// ✅ RUTAS DE UPLOAD
app.use('/api/upload', uploadRoutes);
console.log('✅ Upload routes registradas en /api/upload');

// ==========================================
// RUTAS ADICIONALES IMPORTANTES
// ==========================================

// ✅ RUTA DE SINCRONIZACIÓN UNIVERSAL (usa el controlador corregido)
app.get('/api/sync', MenuController.getMenuSync);
console.log('✅ Ruta directa /api/sync registrada');

// ==========================================
// CONFIGURACIÓN BASE DE DATOS
// ==========================================
const pool = new Pool(config);

pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error en PostgreSQL:', err);
});

// ==========================================
// RUTAS ESTÁTICAS Y FRONTEND
// ==========================================

// Ruta para el menú web
app.get('/menu', (req, res) => {
  const menuPath = path.join(__dirname, 'public', 'menu', 'index.html');
  res.sendFile(menuPath, (err) => {
    if (err) {
      res.status(404).json({ message: 'Menu web page not found' });
    }
  });
});

// Ruta para la cocina web
app.get('/cocina', (req, res) => {
  const cocinaPath = path.join(__dirname, 'public', 'cocina', 'index.html');
  res.sendFile(cocinaPath, (err) => {
    if (err) {
      res.status(404).json({ message: 'Cocina web page not found' });
    }
  });
});

// ==========================================
// MANEJO DE ERRORES Y 404s
// ==========================================

// ✅ CATCH-ALL PARA RUTAS NO ENCONTRADAS (DEBE IR AL FINAL)
app.use('*', (req, res) => {
  console.log(`❌ Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false,
    message: `Route ${req.originalUrl} not found`,
    server: '192.1.1.16:3000',
    availableRoutes: [
      // Diagnóstico
      'GET /api/health',
      'GET /api/ping',
      'GET /api/test-cors',
      'POST /api/test-body',
      
      // Autenticación
      'POST /api/auth/login',
      'POST /api/auth/verify',
      
      // Categorías y Menú - ✅ RUTAS CRÍTICAS AGREGADAS
      'GET /api/categorias',
      'GET /api/menu',              // ✅ CORREGIDA
      'GET /api/menu-publico',      // ✅ AGREGADA
      'GET /api/qr/menu-publico',   // ✅ AGREGADA
      'GET /api/sync',              // ✅ CORREGIDA
      
      // ÓRDENES - FLUJO COMPLETO
      'POST /api/ordenes/quick',                        
      'GET /api/ordenes/activas',                       
      'GET /api/cocina/ordenes',                        
      'PATCH /api/ordenes/:ordenId/items/:itemId/estado', 
      'PATCH /api/ordenes/:id/estado',                  
      'POST /api/ordenes/:id/items',                    
      'GET /api/ordenes/mesa/:mesa',                    
      'POST /api/ordenes/mesa/:mesa/cerrar',            
      
      // Otros endpoints de órdenes
      'POST /api/ordenes',                              
      'GET /api/ordenes',                               
      'GET /api/ordenes/:id',                           
      'GET /api/ordenes/stats/resumen',                 
      'GET /api/ordenes/usuario/mis-ordenes',           
      'GET /api/ordenes/test/crear-ejemplo',            
      
      // Platos especiales - ✅ FUNCIONARÁ AHORA
      'GET /api/platos-especiales',
      'POST /api/platos-especiales',
      'PUT /api/platos-especiales/:id',
      'PATCH /api/platos-especiales/:id/disponibilidad',  // ✅ DEBE FUNCIONAR
      'DELETE /api/platos-especiales/:id',
      
      // Mesas
      'GET /api/mesas',
      'POST /api/mesas',
      'PUT /api/mesas/:id',
      'PATCH /api/mesas/:id/estado',
      
      // Upload de imágenes
      'GET /api/upload/list',
      'POST /api/upload/image', 
      'POST /api/upload/base64',
      'GET /api/upload/info/:fileName',
      'DELETE /api/upload/:fileName',
      'GET /api/upload/health'
    ]
  });
});

// ✅ MANEJO GLOBAL DE ERRORES
app.use((err, req, res, next) => {
  console.error('💥 Error del servidor no manejado:', err);
  res.status(500).json({ 
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================
app.listen(PORT, '0.0.0.0', () => {
  console.log('🌟 ===================================');
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log('🌐 Disponible en:');
  console.log(`   - Local: http://localhost:${PORT}`);
  console.log(`   - Red: http://192.1.1.16:${PORT}`);
  console.log(`   - IP Pública: http://200.54.216.197:${PORT}`);
  console.log('📋 Endpoints principales:');
  console.log(`   - Health: http://localhost:${PORT}/api/health`);
  console.log(`   - Menu: http://localhost:${PORT}/api/menu`);
  console.log(`   - Menu Público: http://localhost:${PORT}/api/menu-publico`);
  console.log(`   - Platos Especiales: http://localhost:${PORT}/api/platos-especiales`);
  console.log(`   - Sync: http://localhost:${PORT}/api/sync`);
  console.log('🎯 Correcciones aplicadas:');
  console.log('   ✅ Query SQL sin created_at para menu_items');
  console.log('   ✅ Ruta /api/menu-publico agregada');
  console.log('   ✅ Ruta /api/menu corregida');
  console.log('   ✅ Endpoint /api/sync optimizado');
  console.log('🌟 ===================================');
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Puerto ${PORT} ya está en uso`);
    console.log('💡 Intenta:');
    console.log(`   - Cambiar el puerto: PORT=3001 npm start`);
    console.log(`   - Liberar el puerto: taskkill /f /im node.exe`);
  } else {
    console.error('❌ Error iniciando servidor:', err.message);
  }
  process.exit(1);
});

// ==========================================
// MANEJO DE SEÑALES PARA CIERRE LIMPIO
// ==========================================
process.on('SIGINT', async () => {
  console.log('🛑 Cerrando servidor...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Cerrando servidor...');
  await pool.end();
  process.exit(0);
});

module.exports = app;