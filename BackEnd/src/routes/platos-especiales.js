// routes/platos-especiales.js - ORDEN CORREGIDO Y RUTA PATCH AÑADIDA
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();
const config = require('../config/database');

const pool = new Pool(config);

// MIDDLEWARE PARA DEBUGGING
router.use((req, res, next) => {
  console.log(`⭐ Platos Especiales Request: ${req.method} ${req.originalUrl}`);
  next();
});

// ==========================================
// RUTAS
// ==========================================

// --- RUTAS ESTÁTICAS Y ESPECÍFICAS (van PRIMERO) ---

// GET /api/platos-especiales - Obtener todos los platos especiales vigentes
router.get('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT id, nombre, precio, descripcion, disponible, fecha_inicio, fecha_fin, imagen_url
      FROM platos_especiales WHERE vigente = TRUE ORDER BY created_at DESC
    `;
    const result = await client.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error obteniendo platos especiales:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  } finally {
    client.release();
  }
});

// GET /api/platos-especiales/disponibles - Solo los disponibles
router.get('/disponibles', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM platos_especiales
      WHERE disponible = TRUE AND vigente = TRUE AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error obteniendo platos disponibles:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  } finally {
    client.release();
  }
});

// POST /api/platos-especiales - Crear nuevo plato especial
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            nombre, precio, descripcion, disponible = true, fecha_inicio, fecha_fin,
            imagen_url, tiempo_preparacion = 0, ingredientes, alergenos,
            calorias, vegetariano = false, picante = false, categoria_id = 6
        } = req.body;

        if (!nombre || !precio) {
            return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
        }

        const query = `
            INSERT INTO platos_especiales (
                nombre, precio, descripcion, disponible, fecha_inicio, fecha_fin,
                imagen_url, tiempo_preparacion, ingredientes, alergenos,
                calorias, vegetariano, picante, categoria_id, vigente, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, TRUE, NOW(), NOW())
            RETURNING *
        `;
        const values = [
            nombre, precio, descripcion || null, disponible, fecha_inicio || new Date().toISOString(),
            fecha_fin || null, imagen_url || null, tiempo_preparacion, ingredientes || null,
            alergenos || null, calorias || null, vegetariano, picante, categoria_id
        ];

        const result = await client.query(query, values);
        res.status(201).json({ success: true, message: 'Plato especial creado exitosamente', plato: result.rows[0] });
    } catch (error) {
        console.error('❌ Error creando plato especial:', error);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    } finally {
        client.release();
    }
});


// --- RUTAS DINÁMICAS (las más específicas primero) ---

// PATCH /api/platos-especiales/:id/disponibilidad - Cambiar disponibilidad
// ESTA RUTA DEBE IR ANTES DE /:id para que sea reconocida correctamente por Express.
router.patch('/:id/disponibilidad', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { disponible } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido, debe ser un número' });
    }
    if (typeof disponible !== 'boolean') {
      return res.status(400).json({ error: 'El campo "disponible" es obligatorio y debe ser un booleano (true/false)' });
    }

    const query = `
      UPDATE platos_especiales
      SET disponible = $1, updated_at = NOW()
      WHERE id = $2 AND vigente = TRUE
      RETURNING *
    `;
    const result = await client.query(query, [disponible, parseInt(id)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plato especial no encontrado o no vigente' });
    }

    res.json({ success: true, message: 'Disponibilidad actualizada exitosamente', plato: result.rows[0] });
  } catch (error) {
    console.error('❌ Error cambiando disponibilidad:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  } finally {
    client.release();
  }
});

// GET /api/platos-especiales/:id
router.get('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido, debe ser un número' });
    }
    const result = await client.query('SELECT * FROM platos_especiales WHERE id = $1', [parseInt(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plato especial no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error obteniendo plato especial:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  } finally {
    client.release();
  }
});

// PUT /api/platos-especiales/:id - Actualizar plato especial
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido, debe ser un número' });
    }
    const {
      nombre, precio, descripcion, disponible, fecha_inicio, fecha_fin,
      imagen_url, tiempo_preparacion, ingredientes, alergenos,
      calorias, vegetariano, picante, categoria_id
    } = req.body;
    if (!nombre || precio === undefined) {
      return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
    }

    const query = `
      UPDATE platos_especiales SET
        nombre = $1, precio = $2, descripcion = $3, disponible = $4, fecha_inicio = $5,
        fecha_fin = $6, imagen_url = $7, tiempo_preparacion = $8,
        ingredientes = $9, alergenos = $10, calorias = $11, vegetariano = $12,
        picante = $13, categoria_id = $14, updated_at = NOW()
      WHERE id = $15 AND vigente = TRUE
      RETURNING *
    `;
    const values = [
      nombre, precio, descripcion || null, disponible, fecha_inicio || null,
      fecha_fin || null, imagen_url || null, tiempo_preparacion || 0,
      ingredientes || null, alergenos || null, calorias || null, vegetariano || false,
      picante || false, categoria_id || 6, parseInt(id)
    ];

    const result = await client.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plato especial no encontrado o no vigente' });
    }
    res.json({ success: true, message: 'Plato especial actualizado exitosamente', plato: result.rows[0] });
  } catch (error) {
    console.error('❌ Error actualizando plato especial:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  } finally {
    client.release();
  }
});

// DELETE /api/platos-especiales/:id - Borrado lógico
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido, debe ser un número' });
    }
    const result = await client.query(
      'UPDATE platos_especiales SET vigente = FALSE, disponible = FALSE, updated_at = NOW() WHERE id = $1 AND vigente = TRUE RETURNING id, nombre, vigente',
      [parseInt(id)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plato especial no encontrado o ya eliminado' });
    }
    res.json({ success: true, message: 'Plato especial eliminado exitosamente', plato: result.rows[0] });
  } catch (error) {
    console.error('❌ Error eliminando plato especial:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
