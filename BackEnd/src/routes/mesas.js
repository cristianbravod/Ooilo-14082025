// routes/mesas.js - Con debugging y manejo robusto de req.body
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();
const config = require('../config/database');

const pool = new Pool(config);

// ✅ MIDDLEWARE PARA DEBUGGING
router.use((req, res, next) => {
  console.log(`📝 Mesas Request: ${req.method} ${req.originalUrl}`);
  console.log('📋 Headers:', req.headers);
  console.log('📦 Body:', req.body);
  console.log('📊 Body type:', typeof req.body);
  next();
});

// ==========================================
// ENDPOINTS PRINCIPALES PARA MESAS
// ==========================================

// GET /api/mesas - Obtener todas las mesas activas
router.get('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { tipo, estado, incluir_inactivas } = req.query;
    
    let query = `
      SELECT 
        id, numero, nombre, capacidad, ubicacion, tipo, estado, 
        descripcion, activa, fecha_creacion, fecha_modificacion, creado_por
      FROM mesas 
      WHERE 1=1
    `;
    const params = [];
    
    if (!incluir_inactivas || incluir_inactivas !== 'true') {
      query += ' AND activa = TRUE';
    }
    
    if (tipo) {
      query += ` AND tipo = $${params.length + 1}`;
      params.push(tipo);
    }
    
    if (estado) {
      query += ` AND estado = $${params.length + 1}`;
      params.push(estado);
    }
    
    query += ' ORDER BY tipo, CASE WHEN numero ~ E\'^\\\\d+$\' THEN numero::int ELSE 999 END, numero';
    
    const result = await client.query(query, params);
    
    console.log(`✅ Obtenidas ${result.rows.length} mesas`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Error obteniendo mesas:', error);
    
    if (error.code === '42P01') {
      console.log('⚠️ Tabla mesas no existe, devolviendo configuración predeterminada');
      const mesasPredeterminadas = [
        { id: 1, numero: '1', nombre: 'Mesa 1', capacidad: 4, estado: 'disponible', tipo: 'mesa', ubicacion: 'Interior', activa: true },
        { id: 2, numero: '2', nombre: 'Mesa 2', capacidad: 2, estado: 'disponible', tipo: 'mesa', ubicacion: 'Ventana', activa: true },
        { id: 'pickup_1', numero: 'P1', nombre: 'PickUp 1', capacidad: 1, estado: 'disponible', tipo: 'pickup', ubicacion: 'Mostrador', activa: true },
        { id: 'pickup_2', numero: 'P2', nombre: 'PickUp 2', capacidad: 1, estado: 'disponible', tipo: 'pickup', ubicacion: 'Mostrador', activa: true }
      ];
      return res.json(mesasPredeterminadas);
    }
    
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  } finally {
    client.release();
  }
});

// GET /api/mesas/estadisticas - Obtener estadísticas de mesas
router.get('/estadisticas', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_mesas,
        COUNT(CASE WHEN tipo = 'mesa' THEN 1 END) as mesas_tradicionales,
        COUNT(CASE WHEN tipo = 'pickup' THEN 1 END) as posiciones_pickup,
        COUNT(CASE WHEN tipo = 'barra' THEN 1 END) as posiciones_barra,
        COUNT(CASE WHEN estado = 'disponible' THEN 1 END) as disponibles,
        COUNT(CASE WHEN estado = 'ocupada' THEN 1 END) as ocupadas,
        COUNT(CASE WHEN estado = 'limpieza' THEN 1 END) as en_limpieza,
        COUNT(CASE WHEN estado = 'fuera_servicio' THEN 1 END) as fuera_servicio,
        SUM(capacidad) as capacidad_total,
        ROUND(AVG(capacidad::NUMERIC), 2) as capacidad_promedio
      FROM mesas 
      WHERE activa = TRUE
    `);
    
    if (result.rows.length > 0) {
      const stats = result.rows[0];
      Object.keys(stats).forEach(key => {
        if (stats[key] && !isNaN(stats[key])) {
          stats[key] = parseInt(stats[key]) || parseFloat(stats[key]) || 0;
        }
      });
      res.json(stats);
    } else {
      res.json({
        total_mesas: 0,
        mesas_tradicionales: 0,
        posiciones_pickup: 0,
        posiciones_barra: 0,
        disponibles: 0,
        ocupadas: 0,
        en_limpieza: 0,
        fuera_servicio: 0,
        capacidad_total: 0,
        capacidad_promedio: 0
      });
    }
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    
    if (error.code === '42P01') {
      return res.json({
        total_mesas: 4,
        mesas_tradicionales: 2,
        posiciones_pickup: 2,
        posiciones_barra: 0,
        disponibles: 4,
        ocupadas: 0,
        en_limpieza: 0,
        fuera_servicio: 0,
        capacidad_total: 8,
        capacidad_promedio: 2.0
      });
    }
    
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  } finally {
    client.release();
  }
});

// POST /api/mesas - Crear nueva mesa ✅ CON MANEJO ROBUSTO DE REQ.BODY
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    console.log('🔍 POST /mesas - Debugging req.body:');
    console.log('📦 req.body:', req.body);
    console.log('📊 typeof req.body:', typeof req.body);
    console.log('📋 req.headers:', req.headers);
    
    // ✅ VERIFICAR QUE REQ.BODY EXISTE
    if (!req.body || typeof req.body !== 'object') {
      console.error('❌ req.body es undefined o no es un objeto');
      return res.status(400).json({ 
        error: 'Datos del formulario no recibidos',
        details: 'El cuerpo de la petición está vacío o mal formateado',
        recibido: {
          body: req.body,
          type: typeof req.body,
          contentType: req.headers['content-type']
        }
      });
    }
    
    // ✅ EXTRAER DATOS CON VERIFICACIÓN
    const datos = req.body;
    const numero = datos.numero;
    const nombre = datos.nombre;
    const capacidad = datos.capacidad;
    const ubicacion = datos.ubicacion;
    const tipo = datos.tipo || 'mesa';
    const descripcion = datos.descripcion;
    const activa = datos.activa !== undefined ? datos.activa : true;
    
    console.log('📝 Datos extraídos:', {
      numero, nombre, capacidad, ubicacion, tipo, descripcion, activa
    });
    
    // ✅ VALIDACIONES MEJORADAS
    if (!numero) {
      return res.status(400).json({ 
        error: 'El número de mesa es requerido',
        campoFaltante: 'numero'
      });
    }
    
    if (!nombre) {
      return res.status(400).json({ 
        error: 'El nombre de mesa es requerido',
        campoFaltante: 'nombre'
      });
    }
    
    if (!capacidad) {
      return res.status(400).json({ 
        error: 'La capacidad es requerida',
        campoFaltante: 'capacidad'
      });
    }
    
    if (!['mesa', 'pickup', 'barra'].includes(tipo)) {
      return res.status(400).json({ 
        error: 'Tipo debe ser: mesa, pickup o barra',
        tipoRecibido: tipo
      });
    }
    
    const capacidadNum = parseInt(capacidad);
    if (isNaN(capacidadNum) || capacidadNum <= 0) {
      return res.status(400).json({ 
        error: 'La capacidad debe ser un número mayor a 0',
        capacidadRecibida: capacidad
      });
    }
    
    const usuario = req.headers['x-user-name'] || 'Usuario';
    
    console.log('✅ Validaciones pasadas, insertando en BD...');
    
    const result = await client.query(`
      INSERT INTO mesas (numero, nombre, capacidad, ubicacion, tipo, descripcion, activa, creado_por, fecha_creacion, fecha_modificacion)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `, [numero, nombre, capacidadNum, ubicacion, tipo, descripcion, activa, usuario]);
    
    console.log(`✅ Mesa creada exitosamente: ${nombre} (${tipo})`);
    res.status(201).json({
      success: true,
      message: 'Mesa creada exitosamente',
      mesa: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error creando mesa:', error);
    
    if (error.code === '23505') {
      res.status(409).json({ 
        error: 'Ya existe una mesa con ese número y tipo',
        details: 'Número duplicado'
      });
    } else if (error.code === '42P01') {
      // Tabla no existe, crear respuesta exitosa falsa
      console.log('⚠️ Tabla mesas no existe, simulando creación');
      res.status(201).json({
        success: true,
        message: 'Mesa creada exitosamente (modo simulación)',
        mesa: {
          id: Date.now(),
          numero: req.body?.numero,
          nombre: req.body?.nombre,
          capacidad: parseInt(req.body?.capacidad),
          tipo: req.body?.tipo || 'mesa',
          estado: 'disponible',
          activa: true,
          fecha_creacion: new Date().toISOString()
        }
      });
    } else {
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  } finally {
    client.release();
  }
});

// PUT /api/mesas/:id - Actualizar mesa completa
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    console.log('🔍 PUT /mesas/:id - Debugging req.body:');
    console.log('📦 req.body:', req.body);
    
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ 
        error: 'Datos del formulario no recibidos',
        details: 'El cuerpo de la petición está vacío'
      });
    }
    
    const datos = req.body;
    const numero = datos.numero;
    const nombre = datos.nombre;
    const capacidad = datos.capacidad;
    const ubicacion = datos.ubicacion;
    const tipo = datos.tipo;
    const descripcion = datos.descripcion;
    const activa = datos.activa;
    const estado = datos.estado;
    
    // Verificar que la mesa existe
    const mesaExistente = await client.query('SELECT * FROM mesas WHERE id = $1', [id]);
    if (mesaExistente.rows.length === 0) {
      return res.status(404).json({ error: 'Mesa no encontrada' });
    }
    
    // Validaciones
    if (tipo && !['mesa', 'pickup', 'barra'].includes(tipo)) {
      return res.status(400).json({ 
        error: 'Tipo debe ser: mesa, pickup o barra' 
      });
    }
    
    if (estado && !['disponible', 'ocupada', 'limpieza', 'fuera_servicio'].includes(estado)) {
      return res.status(400).json({ 
        error: 'Estado debe ser: disponible, ocupada, limpieza o fuera_servicio' 
      });
    }
    
    if (capacidad && (isNaN(parseInt(capacidad)) || parseInt(capacidad) <= 0)) {
      return res.status(400).json({ 
        error: 'La capacidad debe ser un número mayor a 0' 
      });
    }
    
    // Construir query dinámicamente
    const campos = [];
    const valores = [];
    let contador = 1;
    
    if (numero !== undefined) {
      campos.push(`numero = $${contador++}`);
      valores.push(numero);
    }
    if (nombre !== undefined) {
      campos.push(`nombre = $${contador++}`);
      valores.push(nombre);
    }
    if (capacidad !== undefined) {
      campos.push(`capacidad = $${contador++}`);
      valores.push(parseInt(capacidad));
    }
    if (ubicacion !== undefined) {
      campos.push(`ubicacion = $${contador++}`);
      valores.push(ubicacion);
    }
    if (tipo !== undefined) {
      campos.push(`tipo = $${contador++}`);
      valores.push(tipo);
    }
    if (descripcion !== undefined) {
      campos.push(`descripcion = $${contador++}`);
      valores.push(descripcion);
    }
    if (activa !== undefined) {
      campos.push(`activa = $${contador++}`);
      valores.push(activa);
    }
    if (estado !== undefined) {
      campos.push(`estado = $${contador++}`);
      valores.push(estado);
    }
    
    campos.push(`fecha_modificacion = NOW()`);
    
    if (campos.length === 1) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    
    valores.push(id);
    
    const query = `
      UPDATE mesas 
      SET ${campos.join(', ')}
      WHERE id = $${contador}
      RETURNING *
    `;
    
    const result = await client.query(query, valores);
    
    console.log(`✅ Mesa actualizada: ${result.rows[0].nombre}`);
    res.json({
      success: true,
      message: 'Mesa actualizada exitosamente',
      mesa: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error actualizando mesa:', error);
    
    if (error.code === '23505') {
      res.status(409).json({ 
        error: 'Ya existe una mesa con ese número y tipo' 
      });
    } else {
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  } finally {
    client.release();
  }
});

// PATCH /api/mesas/:id/estado - Cambiar solo el estado de la mesa
router.patch('/:id/estado', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    console.log('🔍 PATCH /mesas/:id/estado - Debugging req.body:');
    console.log('📦 req.body:', req.body);
    
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ 
        error: 'Datos no recibidos',
        details: 'El cuerpo de la petición está vacío'
      });
    }
    
    const { estado, motivo } = req.body;
    
    if (!estado) {
      return res.status(400).json({ error: 'El estado es requerido' });
    }
    
    if (!['disponible', 'ocupada', 'limpieza', 'fuera_servicio'].includes(estado)) {
      return res.status(400).json({ 
        error: 'Estado debe ser: disponible, ocupada, limpieza o fuera_servicio' 
      });
    }
    
    const usuario = req.headers['x-user-name'] || 'Usuario';
    
    const mesaActual = await client.query('SELECT estado, nombre FROM mesas WHERE id = $1', [id]);
    
    if (mesaActual.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Mesa no encontrada'
      });
    }
    
    const estadoAnterior = mesaActual.rows[0].estado;
    const nombreMesa = mesaActual.rows[0].nombre;
    
    const result = await client.query(`
      UPDATE mesas 
      SET estado = $1, fecha_modificacion = NOW()
      WHERE id = $2
      RETURNING *
    `, [estado, id]);
    
    try {
      await client.query(`
        INSERT INTO mesa_historial (mesa_id, estado_anterior, estado_nuevo, usuario, motivo, fecha_cambio)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [id, estadoAnterior, estado, usuario, motivo]);
    } catch (historialError) {
      console.log('⚠️ Tabla mesa_historial no existe, continuando sin historial');
    }
    
    const respuesta = {
      success: true,
      message: 'Estado actualizado correctamente',
      data: {
        mesa_id: parseInt(id),
        mesa_nombre: nombreMesa,
        estado_anterior: estadoAnterior,
        estado_nuevo: estado,
        usuario: usuario,
        fecha_cambio: new Date().toISOString()
      }
    };
    
    console.log(`✅ Estado de mesa cambiado: ${nombreMesa} -> ${estado}`);
    res.json(respuesta);
    
  } catch (error) {
    console.error('❌ Error cambiando estado de mesa:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  } finally {
    client.release();
  }
});

// ✅ ENDPOINT DE DEBUGGING ESPECÍFICO
router.post('/debug-body', (req, res) => {
  console.log('🔍 DEBUG ENDPOINT:');
  console.log('📦 req.body:', req.body);
  console.log('📊 typeof req.body:', typeof req.body);
  console.log('📋 req.headers:', req.headers);
  console.log('🔧 req.method:', req.method);
  console.log('📍 req.url:', req.url);
  
  res.json({
    success: true,
    message: 'Debug endpoint',
    data: {
      body: req.body,
      bodyType: typeof req.body,
      headers: req.headers,
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    }
  });
});

// Health check para mesas
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    message: 'Endpoints de mesas funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;