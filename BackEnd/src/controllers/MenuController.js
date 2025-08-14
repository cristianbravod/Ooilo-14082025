// src/controllers/MenuController.js - VERSIÓN CORREGIDA Y SIMPLIFICADA
const { Pool } = require('pg');
const config = require('../config/database');

const pool = new Pool(config);

class MenuController {
  // ✅ OBTENER CATEGORÍAS - VERSIÓN SIMPLIFICADA Y CORREGIDA
  async getCategories(req, res) {
    try {
      console.log('📂 Obteniendo categorías...');
      // Se usa la columna 'activo' que es la que parece correcta según el código robusto anterior.
      // Se elimina el bucle para tener un error claro si la consulta falla.
      const query = 'SELECT id, nombre, descripcion, activo FROM categorias WHERE activo = true ORDER BY orden, nombre';
      console.log(`🚀 Ejecutando query: ${query}`);
      const result = await pool.query(query);
      console.log(`✅ Query exitosa: ${result.rows.length} categorías encontradas`);
      res.json(result.rows);
    } catch (error) {
      console.error('❌ Error getting categories:', error);
      res.status(500).json({ message: 'Error retrieving categories', error: error.message });
    }
  }

  // ✅ OBTENER MENÚ - VERSIÓN SIMPLIFICADA Y CORREGIDA
  async getMenu(req, res) {
    try {
      console.log('🍽️ Obteniendo menú...');
      const { categoria_id, vegetariano, picante } = req.query;

      // Se corrige la consulta para usar 'm.imagen' en lugar de 'm.imagen_url' para la tabla menu_items.
      // Se mantiene 'pe.imagen_url' para platos_especiales.
      // Se eliminó el bucle de consultas para tener un código más limpio y predecible.
      const query = `
        SELECT
          m.id, m.nombre, m.precio, m.categoria_id, m.descripcion, m.disponible,
          m.vegetariano, m.picante, m.imagen as imagen_url, m.ingredientes, m.tiempo_preparacion,
          c.nombre as categoria_nombre, false as es_especial,
          NULL::timestamp as created_at, NULL::timestamp as updated_at
        FROM menu_items m
        JOIN categorias c ON m.categoria_id = c.id
        WHERE m.disponible = true AND m.vigente = true AND c.activo = true

        UNION ALL

        SELECT
          pe.id, pe.nombre, pe.precio, pe.categoria_id, pe.descripcion, pe.disponible,
          pe.vegetariano, pe.picante, pe.imagen_url, pe.ingredientes, pe.tiempo_preparacion,
          c.nombre as categoria_nombre, true as es_especial,
          pe.created_at, pe.updated_at
        FROM platos_especiales pe
        JOIN categorias c ON pe.categoria_id = c.id
        WHERE pe.disponible = true AND pe.vigente = true AND c.activo = true
        ORDER BY categoria_nombre, nombre
      `;

      console.log('🚀 Ejecutando query de menú unificado...');
      const result = await pool.query(query);
      console.log(`✅ Query de menú exitosa: ${result.rows.length} productos encontrados`);

      // Aplicar filtros si se proporcionan
      let filteredResults = result.rows;

      if (categoria_id) {
        filteredResults = filteredResults.filter(item => item.categoria_id == categoria_id);
      }
      if (vegetariano === 'true') {
        filteredResults = filteredResults.filter(item => item.vegetariano === true);
      }
      if (picante === 'true') {
        filteredResults = filteredResults.filter(item => item.picante === true);
      }

      console.log(`🍽️ Total productos (después de filtros): ${filteredResults.length}`);
      res.json(filteredResults);
    } catch (error) {
      console.error('❌ Error getting menu:', error);
      res.status(500).json({ message: 'Error retrieving menu', error: error.message });
    }
  }

  // ✅ OBTENER MENÚ PARA WEB - VERSIÓN SIMPLIFICADA Y CORREGIDA
  async getMenuForWeb(req, res) {
    try {
      console.log('🌐 Generando menú para web...');

      const categoriesResult = await pool.query('SELECT * FROM categorias WHERE activo = true ORDER BY orden, nombre');

      const itemsResult = await pool.query(`
        SELECT
          m.id, m.nombre, m.precio, m.categoria_id, m.descripcion, m.disponible, m.imagen as imagen_url,
          c.nombre as categoria_nombre, false as es_especial
        FROM menu_items m
        JOIN categorias c ON m.categoria_id = c.id
        WHERE m.disponible = true AND m.vigente = true AND c.activo = true
        UNION ALL
        SELECT
          pe.id, pe.nombre, pe.precio, pe.categoria_id, pe.descripcion, pe.disponible, pe.imagen_url,
          c.nombre as categoria_nombre, true as es_especial
        FROM platos_especiales pe
        JOIN categorias c ON pe.categoria_id = c.id
        WHERE pe.disponible = true AND pe.vigente = true AND c.activo = true
        ORDER BY categoria_nombre, nombre
      `);

      const allItems = itemsResult.rows;
      const platosEspeciales = allItems.filter(item => item.es_especial);
      const menuItems = allItems.filter(item => !item.es_especial);

      const categorias = categoriesResult.rows.map(categoria => ({
        ...categoria,
        items: menuItems.filter(item => item.categoria_id === categoria.id)
      }));

      console.log(`✅ Menú web: ${categorias.length} categorías, ${menuItems.length} items, ${platosEspeciales.length} especiales`);

      const response = {
        categorias: categorias,
        platos_especiales: platosEspeciales,
        restaurante: {
          nombre: "Ooilo Taqueria",
          descripcion: "Cocina auténtica con los mejores ingredientes",
          telefono: "+56912345678",
          horarios: "Vier: 17:00 - 20:00, Sab-Dom: 13:00 - 20:00",
          direccion: "Antonio Moreno 0526, Temuco, Chile"
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      console.error('❌ Error getting menu for web:', error);
      res.status(500).json({ message: 'Error retrieving menu for web', error: error.message });
    }
  }

  // ✅ OBTENER SOLO PLATOS ESPECIALES - SIN CAMBIOS
  async getSpecialItems(req, res) {
    try {
      console.log('⭐ Obteniendo platos especiales...');
      const result = await pool.query(`
        SELECT pe.*, c.nombre as categoria_nombre, true as es_especial
        FROM platos_especiales pe
        LEFT JOIN categorias c ON pe.categoria_id = c.id
        WHERE pe.disponible = true AND pe.vigente = true
        ORDER BY pe.created_at DESC
      `);
      console.log(`⭐ Platos especiales encontrados: ${result.rows.length}`);
      res.json(result.rows);
    } catch (error) {
      console.error('❌ Error getting special items:', error);
      res.status(500).json({ message: 'Error retrieving special items', error: error.message });
    }
  }

  // ✅ SYNC ENDPOINT - SIMPLIFICADO
  async getMenuSync(req, res) {
    try {
      console.log('🔄 Endpoint sync solicitado...');
      const categoriasResult = await pool.query('SELECT * FROM categorias WHERE activo = true ORDER BY orden, nombre');
      const menuItemsResult = await pool.query(`
        SELECT id, nombre, precio, descripcion, categoria_id, disponible, imagen as imagen_url, 'menu' as origen
        FROM menu_items WHERE disponible = true AND vigente = true ORDER BY categoria_id, nombre
      `);
      const platosEspecialesResult = await pool.query(`
        SELECT id, nombre, precio, descripcion, disponible, fecha_inicio, fecha_fin,
               imagen_url, tiempo_preparacion, ingredientes, alergenos, calorias,
               vegetariano, picante, categoria_id, vigente,
               created_at, updated_at, 'especiales' as origen
        FROM platos_especiales WHERE vigente = true ORDER BY created_at DESC
      `);

      const responseData = {
        categorias: categoriasResult.rows,
        menuItems: menuItemsResult.rows,
        platosEspeciales: platosEspecialesResult.rows,
      };

      console.log(`✅ Sync: ${responseData.categorias.length} categorías, ${responseData.menuItems.length} items menú, ${responseData.platosEspeciales.length} especiales`);
      res.json({ success: true, data: { ...responseData, timestamp: new Date().toISOString() } });
    } catch (error) {
      console.error('❌ Error en sync:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Resto de los métodos sin cambios significativos por ahora...
  async getMenuItem(req, res) {
    try {
      const { id } = req.params;
      console.log(`🔍 Buscando item con ID: ${id}`);
      let result = await pool.query(`SELECT pe.*, c.nombre as categoria_nombre, true as es_especial FROM platos_especiales pe LEFT JOIN categorias c ON pe.categoria_id = c.id WHERE pe.id = $1 AND pe.vigente = true`, [id]);
      if (result.rows.length > 0) return res.json(result.rows[0]);
      result = await pool.query(`SELECT m.*, c.nombre as categoria_nombre, false as es_especial FROM menu_items m LEFT JOIN categorias c ON m.categoria_id = c.id WHERE m.id = $1`, [id]);
      if (result.rows.length > 0) return res.json(result.rows[0]);
      res.status(404).json({ message: 'Item not found' });
    } catch (error) {
      console.error('❌ Error getting menu item:', error);
      res.status(500).json({ message: 'Error retrieving menu item', error: error.message });
    }
  }

  async debugMenu(req, res) {
    try {
      const debugInfo = {
        database_structure: {},
        table_counts: {},
        sample_data: {}
      };
      const tables = ['categorias', 'menu_items', 'platos_especiales'];
      for (const table of tables) {
        try {
          const structure = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position`);
          debugInfo.database_structure[table] = structure.rows;
          const count = await pool.query(`SELECT COUNT(*) as total FROM ${table}`);
          debugInfo.table_counts[table] = count.rows[0].total;
          const sample = await pool.query(`SELECT * FROM ${table} LIMIT 2`);
          debugInfo.sample_data[table] = sample.rows;
        } catch (error) {
          debugInfo.database_structure[table] = `❌ Error: ${error.message}`;
        }
      }
      res.json({ success: true, debug: debugInfo });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error en debug', error: error.message });
    }
  }
}

module.exports = new MenuController();
