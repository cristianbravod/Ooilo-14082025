const express = require('express');
const { body } = require('express-validator');
const MenuController = require('../controllers/MenuController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const router = express.Router();

const validateCategory = [
  body('nombre').notEmpty().withMessage('Category name is required'),
  body('descripcion').optional().isString()
];

router.get('/', MenuController.getCategories);
router.post('/', authMiddleware, adminMiddleware, validateCategory, MenuController.createCategory);

module.exports = router;
