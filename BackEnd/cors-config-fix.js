// cors-config-fix.js - Configuración CORS para servidor público
const express = require('express');
const cors = require('cors');

// Configuración CORS completa para aplicaciones móviles
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (aplicaciones móviles)
    if (!origin) {
      return callback(null, true);
    }
    
    // Lista de orígenes permitidos
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:19000',
      'http://localhost:19001',
      'http://localhost:19006',
      'http://192.1.1.16:3000',
      'https://192.1.1.16:3000',
      // Permitir cualquier origen para desarrollo móvil
      /^http:\/\/192\.168\.\d+\.\d+:19000$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:19000$/,
      /^exp:\/\/.*$/
    ];
    
    // Verificar si el origin está permitido
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      }
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(null, true); // Permitir para desarrollo, cambiar a false en producción
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: 86400, // 24 horas
  preflightContinue: false,
  optionsSuccessStatus: 200
};

// Middleware adicional para requests de aplicaciones móviles
const mobileAppMiddleware = (req, res, next) => {
  // Headers adicionales para aplicaciones móviles
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Log para debugging
  console.log(`📱 Mobile Request: ${req.method} ${req.path}`);
  console.log(`   Origin: ${req.get('Origin') || 'No origin'}`);
  console.log(`   User-Agent: ${req.get('User-Agent') || 'No user-agent'}`);
  
  // Responder OPTIONS requests inmediatamente
  if (req.method === 'OPTIONS') {
    console.log('✅ Preflight OPTIONS request handled');
    return res.status(200).end();
  }
  
  next();
};

// Aplicar en tu server.js:
module.exports = { corsOptions, mobileAppMiddleware };

// EJEMPLO DE USO EN TU SERVER.JS:
/*
const { corsOptions, mobileAppMiddleware } = require('./cors-config-fix');

app.use(cors(corsOptions));
app.use(mobileAppMiddleware);

// O configuración simplificada si tienes problemas:
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});
*/