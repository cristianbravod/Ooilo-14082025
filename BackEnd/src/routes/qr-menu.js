// src/routes/qr-menu.js - Rutas para generar menú QR
const express = require('express');
const QRCode = require('qrcode');
const { Pool } = require('pg');
const config = require('../config/database');

const router = express.Router();
const pool = new Pool(config);

// Obtener menú público para QR (sin autenticación)
router.get('/menu-publico', async (req, res) => {
  const client = await pool.connect();
  try {
    console.log('📱 Generando menú público para QR...');
    
    // Obtener categorías activas
    const categorias = await client.query(
      'SELECT * FROM categorias WHERE activo = true ORDER BY nombre'
    );
    
    // Obtener items del menú disponibles con imágenes
    const menuItems = await client.query(`
      SELECT 
        m.id,
        m.nombre,
        m.descripcion,
        m.precio,
        m.vegetariano,
        m.picante,
        m.tiempo_preparacion,
        m.ingredientes,
        m.calorias,
        m.imagen,
        c.nombre as categoria_nombre,
        c.id as categoria_id
      FROM menu_items m
      JOIN categorias c ON m.categoria_id = c.id
      WHERE m.disponible = true AND c.activo = true
      ORDER BY c.nombre, m.nombre
    `);
    
    // Obtener platos especiales disponibles con imágenes
    const platosEspeciales = await client.query(`
      SELECT 
        id,
        nombre,
        descripcion,
        precio,
        vegetariano,
        picante,
        tiempo_preparacion,
        fecha_fin,
        imagen_url as imagen
      FROM platos_especiales
      WHERE disponible = true 
      AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)
      ORDER BY nombre
    `);
    
    // Organizar datos por categoría
    const menuOrganizado = {};
    
    // Inicializar categorías
    categorias.rows.forEach(categoria => {
      menuOrganizado[categoria.nombre] = {
        id: categoria.id,
        nombre: categoria.nombre,
        descripcion: categoria.descripcion,
        items: []
      };
    });
    
    // Agregar items del menú
    menuItems.rows.forEach(item => {
      if (menuOrganizado[item.categoria_nombre]) {
        menuOrganizado[item.categoria_nombre].items.push({
          ...item,
          es_especial: false
        });
      }
    });
    
    // Agregar platos especiales como categoría separada
    if (platosEspeciales.rows.length > 0) {
      menuOrganizado['Platos Especiales'] = {
        id: 'especiales',
        nombre: 'Platos Especiales',
        descripcion: 'Especialidades del chef',
        items: platosEspeciales.rows.map(item => ({
          ...item,
          categoria_nombre: 'Platos Especiales',
          es_especial: true
        }))
      };
    }
    
    // Información del restaurante
    const infoRestaurante = {
      nombre: 'Mi Restaurant',
      descripcion: 'Cocina auténtica con los mejores ingredientes',
      telefono: '+56912345678',
      direccion: 'Santiago, Chile',
      horarios: 'Lun-Dom: 12:00 - 23:00'
    };
    
    console.log(`✅ Menú público generado: ${Object.keys(menuOrganizado).length} categorías`);
    
    res.json({
      success: true,
      restaurante: infoRestaurante,
      categorias: Object.values(menuOrganizado),
      menu_items: menuItems.rows,
      platos_especiales: platosEspeciales.rows,
      fecha_actualizacion: new Date().toISOString(),
      total_items: menuItems.rows.length + platosEspeciales.rows.length
    });
    
  } catch (error) {
    console.error('❌ Error generando menú público:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar menú público',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// Generar código QR para el menú general
router.get('/generar-qr', async (req, res) => {
  try {
    // URL del menú web general (sin mesa específica)
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const menuUrl = `${baseUrl}/menu-qr`;
    
    console.log('🔲 Generando QR para menú general:', menuUrl);
    
    // Generar código QR
    const qrOptions = {
      type: 'png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#2c3e50',
        light: '#FFFFFF'
      },
      width: 300
    };
    
    const qrCodeBuffer = await QRCode.toBuffer(menuUrl, qrOptions);
    
    // También generar versión SVG para mejor calidad
    const qrCodeSVG = await QRCode.toString(menuUrl, {
      type: 'svg',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#2c3e50',
        light: '#FFFFFF'
      }
    });
    
    // Respuesta con opciones
    if (req.query.format === 'svg') {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(qrCodeSVG);
    } else if (req.query.format === 'json') {
      res.json({
        success: true,
        url: menuUrl,
        tipo: 'menu_general',
        qr_data_url: `data:image/png;base64,${qrCodeBuffer.toString('base64')}`,
        qr_svg: qrCodeSVG,
        fecha_generacion: new Date().toISOString()
      });
    } else {
      // PNG por defecto
      res.setHeader('Content-Type', 'image/png');
      res.send(qrCodeBuffer);
    }
    
  } catch (error) {
    console.error('❌ Error generando QR:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar código QR',
      error: error.message
    });
  }
});

// Eliminar rutas específicas de mesa (ya no se necesitan)
// router.get('/mesa/:numeroMesa/qr', ...) - REMOVIDO
// router.get('/generar-todos-qr', ...) - REMOVIDO

// Generar QR único para el restaurante
router.get('/qr-restaurante', async (req, res) => {
  try {
    const { formato = 'png', download = false } = req.query;
    
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const menuUrl = `${baseUrl}/menu-qr`;
    
    console.log('🔲 Generando QR único del restaurante');
    
    if (formato === 'json') {
      const qrCodeDataUrl = await QRCode.toDataURL(menuUrl, {
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#2c3e50',
          light: '#FFFFFF'
        },
        width: 400
      });
      
      res.json({
        success: true,
        restaurante: 'Mi Restaurant',
        url: menuUrl,
        qr_data_url: qrCodeDataUrl,
        fecha_generacion: new Date().toISOString(),
        instrucciones: 'Coloca este código QR en todas las mesas para que los clientes accedan al menú digital'
      });
    } else {
      const qrOptions = {
        type: formato === 'svg' ? 'svg' : 'png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#2c3e50',
          light: '#FFFFFF'
        },
        width: 400
      };
      
      if (formato === 'svg') {
        const qrCodeSVG = await QRCode.toString(menuUrl, qrOptions);
        res.setHeader('Content-Type', 'image/svg+xml');
        if (download) {
          res.setHeader('Content-Disposition', 'attachment; filename="menu-qr-restaurant.svg"');
        }
        res.send(qrCodeSVG);
      } else {
        const qrCodeBuffer = await QRCode.toBuffer(menuUrl, qrOptions);
        res.setHeader('Content-Type', 'image/png');
        if (download) {
          res.setHeader('Content-Disposition', 'attachment; filename="menu-qr-restaurant.png"');
        }
        res.send(qrCodeBuffer);
      }
    }
    
  } catch (error) {
    console.error('❌ Error generando QR del restaurante:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar código QR del restaurante',
      error: error.message
    });
  }
});

// Endpoint para previsualizar cómo se ve el menú
router.get('/preview', async (req, res) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const menuUrl = `${baseUrl}/menu-qr`;
    
    res.json({
      success: true,
      preview_url: menuUrl,
      qr_generator_url: `${req.protocol}://${req.get('host')}/api/qr-menu/generar-qr?format=json`,
      mensaje: 'Visita preview_url para ver cómo se verá el menú para los clientes'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en preview',
      error: error.message
    });
  }
});

module.exports = router;