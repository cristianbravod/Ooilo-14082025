// backend/src/routes/menu.js - Actualizado con UNION de tablas
const express = require('express');
const { body } = require('express-validator');
const MenuController = require('../controllers/MenuController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const router = express.Router();

// ==========================================
// VALIDACIONES
// ==========================================

const validateMenuItem = [
  body('nombre').notEmpty().withMessage('Name is required'),
  body('precio').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('categoria_id').isInt().withMessage('Category ID must be an integer'),
  body('descripcion').optional().isString()
];

const validateSpecialItem = [
  body('nombre').notEmpty().withMessage('Name is required'),
  body('precio').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('categoria_id').optional().isInt().withMessage('Category ID must be an integer'),
  body('descripcion').optional().isString()
];

// ==========================================
// RUTAS PÚBLICAS (sin autenticación)
// ==========================================

// ✅ ACTUALIZADO: Obtener menú completo con UNION (menu_items + platos_especiales)
router.get('/', MenuController.getMenu);

// ✅ NUEVO: Endpoints específicos para la web con estructura agrupada
router.get('/menu-publico', MenuController.getMenuForWeb);
router.get('/menu-web', MenuController.getMenuForWeb);

// ✅ NUEVO: Endpoint QR que apunta al método web
router.get('/qr/menu-publico', MenuController.getMenuForWeb);

// Obtener item específico por ID (busca en ambas tablas)
router.get('/menu/:id', MenuController.getMenuItem);

// Obtener solo platos especiales
router.get('/especiales', MenuController.getSpecialItems);

// Reutilizar endpoint de menú con query params para búsqueda
router.get('/search', MenuController.getMenu);

// ✅ NUEVO: Endpoint de debug para troubleshooting
router.get('/debug/menu', MenuController.debugMenu);

// ==========================================
// RUTAS DE ADMINISTRACIÓN (requieren auth)
// ==========================================

// Gestión de items del menú
router.post('/', authMiddleware, adminMiddleware, validateMenuItem, MenuController.createMenuItem);
router.put('/menu/:id', authMiddleware, adminMiddleware, validateMenuItem, MenuController.updateMenuItem);
router.delete('/menu/:id', authMiddleware, adminMiddleware, MenuController.deleteMenuItem);
router.patch('/menu/:id/disponibilidad', authMiddleware, adminMiddleware, MenuController.toggleAvailability);

// Gestión de platos especiales
router.post('/especiales', authMiddleware, adminMiddleware, validateSpecialItem, MenuController.createSpecialItem);

// ==========================================
// RUTAS ADICIONALES ÚTILES
// ==========================================

// ✅ NUEVO: Ruta para obtener estadísticas del menú (requiere auth)
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // Puedes implementar estadísticas básicas aquí si las necesitas
    res.json({
      message: 'Stats endpoint - implement if needed',
      endpoints_available: [
        'GET /menu - UNION de ambas tablas',
        'GET /menu-publico - Estructura web agrupada',
        'GET /debug/menu - Debug completo',
        'GET /especiales - Solo platos especiales'
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;