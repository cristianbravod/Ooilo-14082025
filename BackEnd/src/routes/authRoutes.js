const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');
const authMiddleware = require('../middleware/auth');

// Rutas públicas
router.post('/login', authController.login);

// Rutas que requieren autenticación
router.get('/verify', authMiddleware.required, authController.verify);
router.post('/logout', authMiddleware.required, authController.logout);
router.post('/change-password', authMiddleware.required, authController.changePassword);

// Rutas solo para administradores
router.post('/register', authMiddleware.required, authMiddleware.requireRole('admin'), authController.register);

module.exports = router;