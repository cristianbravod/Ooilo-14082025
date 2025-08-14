// backend/src/app.js - Aplicación Principal MVC CORREGIDA - SIN DUPLICACIÓN
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const MenuController = require('./controllers/MenuController');
const categoriasRoutes = require('./routes/categorias');
const orderRoutes = require('./routes/orders');
const reportRoutes = require('./routes/reports');
const tableRoutes = require('./routes/tables');
const uploadRoutes = require('./routes/upload'); // ✅ Asegúrate de que existe

// Importar middleware
const { errorHandler, requestLogger } = require('./middleware/errorHandler');

const app = express();

// ==========================================
// CONFIGURACIÓN DE VARIABLES DE ENTORNO
// ==========================================

// ✅ INDICAR QUE server.js MANEJA EL MIDDLEWARE PRINCIPAL
process.env.SERVER_HANDLES_ROUTES = 'true';
process.env.SERVER_HANDLES_ERROR_MIDDLEWARE = 'true';
process.env.STATIC_FILES_HANDLED = 'true';
process.env.DISABLE_APP_LOGGING = 'true';

// ==========================================
// CONFIGURACIÓN CORS PARA DESARROLLO
// ==========================================
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:19000', // Expo Metro Bundler
    'http://localhost:19001', // Expo DevTools
    'http://localhost:19006', // Expo Web
    process.env.EXPO_URL || 'http://192.168.1.100:19000',
    `http://${process.env.LOCAL_IP || '192.168.1.100'}:19000`,
    `exp://${process.env.LOCAL_IP || '192.168.1.100'}:19000`,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// ==========================================
// ✅ MIDDLEWARE COMENTADO PARA EVITAR DUPLICACIÓN CON server.js
// ==========================================

console.log('⚠️  IMPORTANTE: app.js configurado para trabajar con server.js');
console.log('📝 Middleware de body-parser manejado por server.js (límite: 50MB)');
console.log('🔧 CORS y archivos estáticos manejados por server.js');
console.log('💡 Este archivo es un módulo complementario');

// ❌ ESTAS LÍNEAS ESTÁN COMENTADAS PORQUE server.js YA LAS MANEJA
// ❌ DESCOMENTAR SOLO SI USAS ESTE ARCHIVO INDEPENDIENTEMENTE
/*
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
*/

// ==========================================
// LOGGING EN DESARROLLO
// ==========================================
// Solo aplicar logging si no está configurado en server.js
if (process.env.NODE_ENV === 'development' && !process.env.DISABLE_APP_LOGGING) {
  console.log('📊 Aplicando requestLogger desde app.js');
  app.use(requestLogger);
} else {
  console.log('📊 RequestLogger manejado por server.js');
}

// ==========================================
// SERVIR ARCHIVOS ESTÁTICOS
// ==========================================
// Solo si no está configurado en server.js
if (!process.env.STATIC_FILES_HANDLED) {
  console.log('📁 Configurando archivos estáticos desde app.js');
  app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
} else {
  console.log('📁 Archivos estáticos manejados por server.js');
}

// ==========================================
// ENDPOINTS DE INFORMACIÓN
// ==========================================

// Health check específico para app.js
app.get('/api/health-app', (req, res) => {
  res.json({ 
    status: 'OK - APP.JS MODULE', 
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    message: 'Este endpoint es del módulo app.js',
    note: 'Las rutas principales están en server.js',
    middleware_status: {
      body_parser: 'Manejado por server.js (50MB)',
      cors: 'Manejado por server.js',
      static_files: 'Manejado por server.js',
      error_handler: 'Manejado por server.js'
    }
  });
});

// Endpoint de información del módulo
app.get('/api/info-app', (req, res) => {
  res.json({
    message: 'Restaurant Management API - APP.JS Module',
    version: '2.0.0',
    note: 'Este es el módulo app.js - las rutas principales están en server.js',
    status: 'COMPLEMENTARY_MODULE',
    main_server: 'server.js handles main functionality',
    endpoints_available_here: [
      'GET /api/health-app',
      'GET /api/info-app'
    ],
    main_endpoints: 'See server.js for full API endpoints',
    middleware_configuration: {
      body_parser: 'Handled by server.js with 50MB limit',
      cors: 'Handled by server.js',
      static_files: 'Handled by server.js (/uploads)',
      authentication: 'Handled by server.js',
      error_handling: 'Handled by server.js'
    }
  });
});

// ==========================================
// RUTAS DE LA API - SOLO SI NO ESTÁN EN server.js
// ==========================================
if (!process.env.SERVER_HANDLES_ROUTES) {
  console.log('🛣️  Configurando rutas desde app.js');
  
  app.use('/api/auth', authRoutes);
  app.use('/api/menu', menuRoutes);
  app.put('/api/menu/:id', MenuController.updateMenuItem);
  app.use('/api/categorias', categoriasRoutes);
  app.use('/api/ordenes', orderRoutes);
  app.use('/api/reportes', reportRoutes);
  app.use('/api/mesas', tableRoutes);
  app.use('/api/upload', uploadRoutes); // ✅ Ruta de upload
  
  // Documentación básica de la API (actualizada)
  app.get('/api', (req, res) => {
    res.json({
      message: 'Restaurant Management API - FROM APP.JS',
      version: '2.0.0',
      endpoints: {
        auth: '/api/auth',
        menu: '/api/menu',
        categories: '/api/categorias',
        orders: '/api/ordenes',
        reports: '/api/reportes',
        tables: '/api/mesas',
        upload: '/api/upload',
        health: '/api/health'
      },
      documentation: '/api/docs'
    });
  });
} else {
  console.log('🛣️  Rutas manejadas por server.js');
  
  // Endpoint de redirección para cuando las rutas están en server.js
  app.get('/api', (req, res) => {
    res.json({
      message: 'Routes handled by server.js',
      note: 'This app.js module is in complementary mode',
      redirect_to: 'Use server.js endpoints',
      available_here: [
        '/api/health-app',
        '/api/info-app'
      ]
    });
  });
}

// ==========================================
// MIDDLEWARE DE ERROR PARA UPLOADS
// ==========================================
if (!process.env.SERVER_HANDLES_ERROR_MIDDLEWARE) {
  console.log('⚠️  Configurando middleware de error desde app.js');
  
  app.use((error, req, res, next) => {
    // Errores específicos de multer
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Archivo demasiado grande (máximo 50MB)',
        error: 'FILE_TOO_LARGE',
        source: 'app.js error handler'
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Demasiados archivos (máximo 1)',
        error: 'TOO_MANY_FILES',
        source: 'app.js error handler'
      });
    }
    
    if (error.message === 'Solo se permiten archivos de imagen') {
      return res.status(400).json({
        success: false,
        message: 'Tipo de archivo no permitido. Solo imágenes.',
        error: 'INVALID_FILE_TYPE',
        source: 'app.js error handler'
      });
    }
    
    // Pasar al siguiente middleware de error
    next(error);
  });
} else {
  console.log('⚠️  Middleware de error manejado por server.js');
}

// ==========================================
// MANEJO DE RUTAS NO ENCONTRADAS
// ==========================================
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: `Route ${req.originalUrl} not found in app.js module`,
    note: 'Las rutas principales están manejadas por server.js',
    module: 'app.js (complementary)',
    main_server: 'server.js',
    available_routes_here: [
      'GET /api/health-app', 
      'GET /api/info-app'
    ],
    main_routes: 'Refer to server.js for full API documentation'
  });
});

// ==========================================
// MIDDLEWARE DE MANEJO DE ERRORES FINAL
// ==========================================
if (!process.env.SERVER_HANDLES_ERROR_HANDLER) {
  console.log('🔧 Configurando errorHandler final desde app.js');
  app.use(errorHandler);
} else {
  console.log('🔧 ErrorHandler final manejado por server.js');
}

// ==========================================
// FUNCIÓN DE INICIALIZACIÓN DEL MÓDULO
// ==========================================
function initializeAppModule() {
  console.log('🔧 Inicializando módulo app.js...');
  console.log('📦 Modo: COMPLEMENTARY');
  console.log('🎯 Servidor principal: server.js');
  console.log('⚙️  Configuración de middleware:');
  console.log('   - Body Parser: Manejado por server.js (50MB)');
  console.log('   - CORS: Manejado por server.js');
  console.log('   - Static Files: Manejado por server.js');
  console.log('   - Error Handling: Manejado por server.js');
  console.log('   - Authentication: Manejado por server.js');
  console.log('✅ Módulo app.js inicializado correctamente');
  
  return {
    status: 'initialized',
    mode: 'complementary',
    main_server: 'server.js',
    endpoints: ['/api/health-app', '/api/info-app']
  };
}

// ==========================================
// EXPORTAR MÓDULO
// ==========================================

// Inicializar el módulo al cargar
const moduleInfo = initializeAppModule();

// Agregar información del módulo al objeto app
app.moduleInfo = moduleInfo;

module.exports = app;