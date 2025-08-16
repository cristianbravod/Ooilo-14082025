// server.js
require('dotenv').config(); // Cargar variables de entorno al inicio

const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const config = require('./src/config/database');

// ==========================================
// IMPORTACIÓN DE RUTAS
// ==========================================
const authRoutes = require('./src/routes/auth');
const menuRoutes = require('./src/routes/menu');
const categoriasRoutes = require('./src/routes/categorias');
const orderRoutes = require('./src/routes/orderRoutes');
const mesasRoutes = require('./src/routes/mesas');
const platosEspecialesRoutes = require('./src/routes/platos-especiales');
const uploadRoutes = require('./src/routes/upload');
const MenuController = require('./src/controllers/MenuController');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Iniciando servidor...');
console.log('📦 Cargando middlewares y rutas...');

// ==========================================
// CONFIGURACIÓN DE CORS
// ==========================================
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir solicitudes sin 'origin' (como apps móviles o Postman) y las de la lista blanca.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ CORS: Origen no permitido: ${origin}`);
      callback(new Error('Origen no permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
};

// ==========================================
// MIDDLEWARES (ORDEN CRÍTICO)
// ==========================================
app.use(cors(corsOptions));

// BODY PARSER ANTES QUE LAS RUTAS
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

// ARCHIVOS ESTÁTICOS
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ==========================================
// ENDPOINTS DE DIAGNÓSTICO
// ==========================================
app.get('/api/health', async (req, res) => {
  try {
    const pool = new Pool(config);
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      version: '2.1.0',
      database: 'Connected',
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    console.error('❌ Health check error:', error.message);
    res.status(500).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

app.get('/api/ping', (req, res) => {
  res.json({
    message: 'pong',
    timestamp: new Date().toISOString(),
  });
});

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
// RUTAS DIRECTAS
// ==========================================
app.get('/api/menu-publico', MenuController.getMenuForWeb);
app.get('/api/menu', MenuController.getMenu);
app.get('/api/qr/menu-publico', MenuController.getMenuForWeb);
app.get('/api/sync', MenuController.getMenuSync);

// ==========================================
// REGISTRAR RUTAS DE LA API
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/platos-especiales', platosEspecialesRoutes);
app.use('/api/ordenes', orderRoutes);
app.use('/api/mesas', mesasRoutes);
app.use('/api/upload', uploadRoutes);

// ==========================================
// RUTAS ESTÁTICAS Y FRONTEND
// ==========================================
app.get('/menu', (req, res) => {
  const menuPath = path.join(__dirname, 'public', 'menu', 'index.html');
  res.sendFile(menuPath, (err) => {
    if (err) res.status(404).json({ message: 'Menu web page not found' });
  });
});

app.get('/cocina', (req, res) => {
  const cocinaPath = path.join(__dirname, 'public', 'cocina', 'index.html');
  res.sendFile(cocinaPath, (err) => {
    if (err) res.status(404).json({ message: 'Cocina web page not found' });
  });
});

// ==========================================
// MANEJO DE ERRORES Y 404s
// ==========================================
app.use('*', (req, res) => {
  console.log(`❌ Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

app.use((err, req, res, next) => {
  console.error('💥 Error del servidor no manejado:', err);
  // No exponer detalles del error en producción
  const errorDetails = process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong';
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: errorDetails
  });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🌟 ===================================');
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Disponible en: http://localhost:${PORT}`);
  console.log('🌟 ===================================');
});

// ==========================================
// MANEJO DE SEÑALES PARA CIERRE LIMPIO
// ==========================================
const pool = new Pool(config);

const gracefulShutdown = () => {
  console.log('🛑 Cerrando servidor...');
  server.close(async () => {
    console.log('🔌 Conexiones HTTP cerradas.');
    await pool.end();
    console.log('🐘 Pool de PostgreSQL desconectado.');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = app;
