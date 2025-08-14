// orderRoutes.js - VERSIÓN CORREGIDA CON IMPORTS CORRECTOS
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/OrderController');

// ✅ IMPORTACIÓN CORREGIDA - Desestructurar los middlewares
const { authMiddleware, optionalAuth, adminMiddleware } = require('../middleware/auth');

// Rutas públicas (no requieren autenticación para demo)
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API de órdenes funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// ✅ RUTAS DE ÓRDENES - CON MIDDLEWARES CORRECTOS
router.post('/quick', orderController.createQuickOrder);                    // Crear orden rápida (público)
router.post('/ordenes/rapida', orderController.createQuickOrder);          // Alias para orden rápida

// Rutas con autenticación opcional (funcionan con o sin token)
router.get('/ordenes/activas', optionalAuth, orderController.getActiveOrders);      // ✅ CORREGIDO
router.get('/ordenes', optionalAuth, orderController.getAllOrders);                 // ✅ CORREGIDO
router.get('/ordenes/:id', optionalAuth, orderController.getOrderById);             // ✅ CORREGIDO
router.get('/ordenes/mesa/:mesa', optionalAuth, orderController.getOrdersByTable);  // ✅ CORREGIDO

// Rutas que requieren autenticación obligatoria
router.patch('/ordenes/:id/estado', authMiddleware, orderController.updateOrderStatus);
router.patch('/ordenes/:ordenId/items/:itemId/estado', authMiddleware, orderController.updateItemStatus);
router.post('/ordenes/:id/items', authMiddleware, orderController.addItemsToOrder);

// Ruta para cerrar mesa (requiere autenticación)
router.post('/mesa/:mesa/cerrar', authMiddleware, orderController.closeTable);
router.post('/ordenes/mesa/:mesa/cerrar', authMiddleware, orderController.closeTable);

// ✅ RUTAS ADICIONALES ÚTILES
router.get('/activas', optionalAuth, orderController.getActiveOrders);      // Alias corto
router.get('/mesa/:mesa', optionalAuth, orderController.getOrdersByTable);  // Alias corto

// Ruta de estadísticas (requiere auth)
router.get('/stats/resumen', authMiddleware, (req, res) => {
  // Si no existe el método en el controlador, devolver un placeholder
  if (orderController.getOrderStats) {
    return orderController.getOrderStats(req, res);
  } else {
    res.json({
      success: true,
      message: 'Stats endpoint placeholder',
      data: {
        total_ordenes: 0,
        ordenes_activas: 0,
        total_ventas: 0
      }
    });
  }
});

// ✅ ENDPOINT DE DEBUG PARA VERIFICAR MIDDLEWARES
router.get('/debug/middlewares', (req, res) => {
  res.json({
    success: true,
    message: 'Middlewares de orderRoutes funcionando correctamente',
    available_middlewares: {
      authMiddleware: typeof authMiddleware,
      optionalAuth: typeof optionalAuth,
      adminMiddleware: typeof adminMiddleware
    },
    routes_configured: [
      'GET /ordenes/activas (optionalAuth)',
      'GET /ordenes (optionalAuth)', 
      'GET /ordenes/:id (optionalAuth)',
      'GET /ordenes/mesa/:mesa (optionalAuth)',
      'PATCH /ordenes/:id/estado (authMiddleware)',
      'PATCH /ordenes/:ordenId/items/:itemId/estado (authMiddleware)',
      'POST /ordenes/:id/items (authMiddleware)',
      'POST /mesa/:mesa/cerrar (authMiddleware)'
    ]
  });
});

module.exports = router;