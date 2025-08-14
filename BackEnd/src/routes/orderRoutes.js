// orderRoutes.js - VERSIÓN CORREGIDA
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/OrderController');
const { authMiddleware, optionalAuth, adminMiddleware } = require('../middleware/auth');

// Ruta para verificar salud del router de ordenes
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API de órdenes funcionando' });
});

// --- Rutas de Órdenes ---

// Ruta para obtener todas las órdenes. Corregido de '/ordenes' a '/'.
router.get('/', optionalAuth, orderController.getAllOrders);

// Crear orden rápida (público)
router.post('/quick', orderController.createQuickOrder);

// Obtener órdenes activas
router.get('/activas', optionalAuth, orderController.getActiveOrders);

// Obtener una orden por su ID
router.get('/:id', optionalAuth, orderController.getOrderById);

// Obtener órdenes por número de mesa
router.get('/mesa/:mesa', optionalAuth, orderController.getOrdersByTable);

// Actualizar el estado de una orden
router.patch('/:id/estado', authMiddleware, orderController.updateOrderStatus);

// Actualizar el estado de un item específico en una orden
router.patch('/:ordenId/items/:itemId/estado', authMiddleware, orderController.updateItemStatus);

// Agregar items a una orden existente
router.post('/:id/items', authMiddleware, orderController.addItemsToOrder);

// Cerrar todas las órdenes de una mesa
router.post('/mesa/:mesa/cerrar', authMiddleware, orderController.closeTable);

module.exports = router;
