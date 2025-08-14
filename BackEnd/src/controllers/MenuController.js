// src/controllers/MenuController.js - VERSIÓN CORREGIDA PARA BD REAL
const { Pool } = require('pg');
const config = require('../config/database');

const pool = new Pool(config);

class MenuController {
  // ✅ OBTENER CATEGORÍAS - VERSIÓN ROBUSTA
  async getCategories(req, res) {
    try {
      console.log('📂 Obteniendo categorías...');
      
      // Intentar diferentes variaciones de la consulta
      let result;
      const queries = [
        'SELECT * FROM categorias WHERE activo = true ORDER BY orden, nombre',
        'SELECT * FROM categorias WHERE visible = true ORDER BY orden, nombre', 
        'SELECT * FROM categorias WHERE estado = true ORDER BY orden, nombre',
        'SELECT * FROM categorias ORDER BY nombre',
        'SELECT id, nombre, descripcion FROM categorias ORDER BY nombre'
      ];
      
      for (const query of queries) {
        try {
          console.log(`🧪 Probando: ${query}`);
          result = await pool.query(query);
          console.log(`✅ Query exitosa: ${result.rows.length} categorías encontradas`);
          break;
        } catch (error) {
          console.log(`❌ Query falló: ${error.message}`);
          continue;
        }
      }
      
      if (!result) {
        throw new Error('No se pudo obtener categorías con ninguna query');
      }
      
      res.json(result.rows);
    } catch (error) {
      console.error('❌ Error getting categories:', error);
      res.status(500).json({ message: 'Error retrieving categories', error: error.message });
    }
  }

  // ✅ OBTENER MENÚ - VERSIÓN ROBUSTA CON MÚLTIPLES FORMATOS
  async getMenu(req, res) {
    try {
      console.log('🍽️ Obteniendo menú...');
      const { categoria_id, vegetariano, picante } = req.query;
      
      // Intentar diferentes versiones de la consulta UNION
      let result;
      const queries = [
        // Query 1: Con imagen_url
        `
        SELECT 
          m.id, m.nombre, m.precio, m.categoria_id, m.descripcion, m.disponible,
          m.vegetariano, m.picante, m.imagen_url, m.ingredientes, m.tiempo_preparacion,
          c.nombre as categoria_nombre, false as es_especial
        FROM menu_items m 
        JOIN categorias c ON m.categoria_id = c.id 
        WHERE m.disponible = true AND m.vigente = true
        UNION ALL
        SELECT 
          pe.id, pe.nombre, pe.precio, pe.categoria_id, pe.descripcion, pe.disponible,
          pe.vegetariano, pe.picante, pe.imagen_url, pe.ingredientes, pe.tiempo_preparacion,
          c.nombre as categoria_nombre, true as es_especial
        FROM platos_especiales pe 
        JOIN categorias c ON pe.categoria_id = c.id 
        WHERE pe.disponible = true AND pe.vigente = true
        ORDER BY categoria_nombre, nombre
        `,
        
        // Query 2: Con imagen (sin _url)
        `
        SELECT 
          m.id, m.nombre, m.precio, m.categoria_id, m.descripcion, m.disponible,
          m.vegetariano, m.picante, m.imagen, m.ingredientes, m.tiempo_preparacion,
          c.nombre as categoria_nombre, false as es_especial
        FROM menu_items m 
        JOIN categorias c ON m.categoria_id = c.id 
        WHERE m.disponible = true AND m.vigente = true
        UNION ALL
        SELECT 
          pe.id, pe.nombre, pe.precio, pe.categoria_id, pe.descripcion, pe.disponible,
          pe.vegetariano, pe.picante, pe.imagen_url as imagen, pe.ingredientes, pe.tiempo_preparacion,
          c.nombre as categoria_nombre, true as es_especial
        FROM platos_especiales pe 
        JOIN categorias c ON pe.categoria_id = c.id 
        WHERE pe.disponible = true AND pe.vigente = true
        ORDER BY categoria_nombre, nombre
        `,
        
        // Query 3: Sin imagen, sin vigente
        `
        SELECT 
          m.id, m.nombre, m.precio, m.categoria_id, m.descripcion, m.disponible,
          m.vegetariano, m.picante, '' as imagen, m.ingredientes, m.tiempo_preparacion,
          c.nombre as categoria_nombre, false as es_especial
        FROM menu_items m 
        JOIN categorias c ON m.categoria_id = c.id 
        WHERE m.disponible = true
        UNION ALL
        SELECT 
          pe.id, pe.nombre, pe.precio, pe.categoria_id, pe.descripcion, pe.disponible,
          pe.vegetariano, pe.picante, pe.imagen_url as imagen, pe.ingredientes, pe.tiempo_preparacion,
          c.nombre as categoria_nombre, true as es_especial
        FROM platos_especiales pe 
        JOIN categorias c ON pe.categoria_id = c.id 
        WHERE pe.disponible = true AND pe.vigente = true
        ORDER BY categoria_nombre, nombre
        `,
        
        // Query 4: Solo campos básicos
        `
        SELECT 
          m.id, m.nombre, m.precio, m.categoria_id, m.descripcion, m.disponible,
          c.nombre as categoria_nombre, false as es_especial
        FROM menu_items m 
        JOIN categorias c ON m.categoria_id = c.id 
        WHERE m.disponible = true
        UNION ALL
        SELECT 
          pe.id, pe.nombre, pe.precio, pe.categoria_id, pe.descripcion, pe.disponible,
          c.nombre as categoria_nombre, true as es_especial
        FROM platos_especiales pe 
        JOIN categorias c ON pe.categoria_id = c.id 
        WHERE pe.disponible = true AND pe.vigente = true
        ORDER BY categoria_nombre, nombre
        `
      ];
      
      for (const query of queries) {
        try {
          console.log(`🧪 Probando query UNION ${queries.indexOf(query) + 1}/4...`);
          result = await pool.query(query);
          console.log(`✅ Query UNION exitosa: ${result.rows.length} productos encontrados`);
          break;
        } catch (error) {
          console.log(`❌ Query UNION ${queries.indexOf(query) + 1} falló: ${error.message}`);
          continue;
        }
      }
      
      if (!result) {
        throw new Error('No se pudo obtener menú con ninguna query UNION');
      }

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
      
      // Log detallado de los productos encontrados
      console.log(`🍽️ Total productos (después de filtros): ${filteredResults.length}`);
      
      const categorias = {};
      filteredResults.forEach(item => {
        const cat = item.categoria_nombre || 'Sin Categoría';
        if (!categorias[cat]) categorias[cat] = [];
        categorias[cat].push(item.nombre);
      });
      
      Object.keys(categorias).forEach(cat => {
        console.log(`📂 ${cat}: ${categorias[cat].length} items`);
      });

      res.json(filteredResults);
    } catch (error) {
      console.error('❌ Error getting menu:', error);
      res.status(500).json({ message: 'Error retrieving menu', error: error.message });
    }
  }

  // ✅ OBTENER MENÚ PARA WEB - VERSIÓN ROBUSTA
  async getMenuForWeb(req, res) {
    try {
      console.log('🌐 Generando menú para web...');
      
      // Obtener categorías con query robusta
      let categoriesResult;
      try {
        categoriesResult = await pool.query('SELECT * FROM categorias WHERE activo = true ORDER BY orden, nombre');
      } catch (e1) {
        try {
          categoriesResult = await pool.query('SELECT * FROM categorias ORDER BY nombre');
        } catch (e2) {
          categoriesResult = { rows: [] };
        }
      }
      
      // Obtener items con query robusta (solo campos seguros)
      let itemsResult;
      try {
        itemsResult = await pool.query(`
          SELECT 
            m.id, m.nombre, m.precio, m.categoria_id, m.descripcion, m.disponible,
            c.nombre as categoria_nombre, false as es_especial
          FROM menu_items m 
          JOIN categorias c ON m.categoria_id = c.id 
          WHERE m.disponible = true
          UNION ALL
          SELECT 
            pe.id, pe.nombre, pe.precio, pe.categoria_id, pe.descripcion, pe.disponible,
            c.nombre as categoria_nombre, true as es_especial
          FROM platos_especiales pe 
          JOIN categorias c ON pe.categoria_id = c.id 
          WHERE pe.disponible = true AND pe.vigente = true
          ORDER BY categoria_nombre, nombre
        `);
      } catch (error) {
        console.log('❌ Error en query web, usando solo platos especiales:', error.message);
        itemsResult = await pool.query(`
          SELECT 
            pe.id, pe.nombre, pe.precio, pe.categoria_id, pe.descripcion, pe.disponible,
            c.nombre as categoria_nombre, true as es_especial
          FROM platos_especiales pe 
          JOIN categorias c ON pe.categoria_id = c.id 
          WHERE pe.disponible = true AND pe.vigente = true
          ORDER BY pe.created_at DESC
        `);
      }
      
      // Separar platos especiales de items normales
      const platosEspeciales = itemsResult.rows.filter(item => item.es_especial);
      const menuItems = itemsResult.rows.filter(item => !item.es_especial);
      
      // Agrupar items por categoría
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

  // ✅ OBTENER SOLO PLATOS ESPECIALES - FUNCIONA BIEN
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

  // ✅ SYNC ENDPOINT MEJORADO
  async getMenuSync(req, res) {
    try {
      console.log('🔄 Endpoint sync solicitado...');
      
      // Obtener categorías con query robusta
      let categorias;
      try {
        categorias = await pool.query('SELECT * FROM categorias WHERE activo = true ORDER BY orden, nombre');
      } catch (e1) {
        try {
          categorias = await pool.query('SELECT * FROM categorias ORDER BY nombre');
        } catch (e2) {
          categorias = { rows: [] };
        }
      }
      
      // Obtener menu items con query robusta
      let menuItems;
      try {
        menuItems = await pool.query(`
          SELECT id, nombre, precio, descripcion, categoria_id, disponible, 'menu' as origen
          FROM menu_items WHERE disponible = true ORDER BY categoria_id, nombre
        `);
      } catch (error) {
        console.log('❌ Error obteniendo menu_items:', error.message);
        menuItems = { rows: [] };
      }
      
      // Obtener platos especiales (estos funcionan bien)
      const platosEspeciales = await pool.query(`
        SELECT id, nombre, precio, descripcion, disponible, fecha_inicio, fecha_fin,
               imagen_url, tiempo_preparacion, ingredientes, alergenos, calorias,
               vegetariano, picante, categoria_id, vigente, 
               created_at, updated_at, 'especiales' as origen
        FROM platos_especiales WHERE vigente = true ORDER BY created_at DESC
      `);
      
      console.log(`✅ Sync: ${categorias.rows.length} categorías, ${menuItems.rows.length} items menú, ${platosEspeciales.rows.length} especiales`);
      
      const response = {
        success: true,
        data: {
          categorias: categorias.rows,
          menuItems: menuItems.rows,
          platosEspeciales: platosEspeciales.rows,
          timestamp: new Date().toISOString()
        },
        counts: {
          categorias: categorias.rows.length,
          menuItems: menuItems.rows.length,
          platosEspeciales: platosEspeciales.rows.length
        }
      };
      
      res.json(response);
      
    } catch (error) {
      console.error('❌ Error en sync:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }

  // ✅ OBTENER ITEM ESPECÍFICO
  async getMenuItem(req, res) {
    try {
      const { id } = req.params;
      console.log(`🔍 Buscando item con ID: ${id}`);
      
      // Buscar en platos especiales primero (funciona bien)
      let result = await pool.query(`
        SELECT pe.*, c.nombre as categoria_nombre, true as es_especial
        FROM platos_especiales pe 
        LEFT JOIN categorias c ON pe.categoria_id = c.id 
        WHERE pe.id = $1 AND pe.vigente = true
      `, [id]);
      
      if (result.rows.length > 0) {
        return res.json(result.rows[0]);
      }
      
      // Buscar en menu_items si no se encontró en especiales
      try {
        result = await pool.query(`
          SELECT m.*, c.nombre as categoria_nombre, false as es_especial
          FROM menu_items m 
          LEFT JOIN categorias c ON m.categoria_id = c.id 
          WHERE m.id = $1
        `, [id]);
        
        if (result.rows.length > 0) {
          return res.json(result.rows[0]);
        }
      } catch (error) {
        console.log('❌ Error buscando en menu_items:', error.message);
      }
      
      res.status(404).json({ message: 'Item not found' });
      
    } catch (error) {
      console.error('❌ Error getting menu item:', error);
      res.status(500).json({ message: 'Error retrieving menu item', error: error.message });
    }
  }

  // ✅ DEBUG MEJORADO
  async debugMenu(req, res) {
    try {
      console.log('🔍 === DEBUG MEJORADO ===');
      
      const debug = {
        database_structure: {},
        table_counts: {},
        sample_data: {},
        working_queries: []
      };
      
      // Verificar estructura de categorias
      try {
        const categoriasStruct = await pool.query(`
          SELECT column_name, data_type FROM information_schema.columns 
          WHERE table_name = 'categorias' ORDER BY ordinal_position
        `);
        debug.database_structure.categorias = categoriasStruct.rows;
        
        const categoriasCount = await pool.query('SELECT COUNT(*) as total FROM categorias');
        debug.table_counts.categorias = categoriasCount.rows[0].total;
        
        const categoriasSample = await pool.query('SELECT * FROM categorias LIMIT 2');
        debug.sample_data.categorias = categoriasSample.rows;
        
        debug.working_queries.push('✅ SELECT * FROM categorias');
      } catch (error) {
        debug.database_structure.categorias = `❌ Error: ${error.message}`;
      }
      
      // Verificar estructura de menu_items
      try {
        const menuStruct = await pool.query(`
          SELECT column_name, data_type FROM information_schema.columns 
          WHERE table_name = 'menu_items' ORDER BY ordinal_position
        `);
        debug.database_structure.menu_items = menuStruct.rows;
        
        const menuCount = await pool.query('SELECT COUNT(*) as total FROM menu_items');
        debug.table_counts.menu_items = menuCount.rows[0].total;
        
        const menuSample = await pool.query('SELECT * FROM menu_items LIMIT 2');
        debug.sample_data.menu_items = menuSample.rows;
        
        debug.working_queries.push('✅ SELECT * FROM menu_items');
      } catch (error) {
        debug.database_structure.menu_items = `❌ Error: ${error.message}`;
      }
      
      // Verificar estructura de platos_especiales
      try {
        const especialesStruct = await pool.query(`
          SELECT column_name, data_type FROM information_schema.columns 
          WHERE table_name = 'platos_especiales' ORDER BY ordinal_position
        `);
        debug.database_structure.platos_especiales = especialesStruct.rows;
        
        const especialesCount = await pool.query('SELECT COUNT(*) as total FROM platos_especiales WHERE vigente = true');
        debug.table_counts.platos_especiales = especialesCount.rows[0].total;
        
        debug.working_queries.push('✅ SELECT * FROM platos_especiales WHERE vigente = true');
      } catch (error) {
        debug.database_structure.platos_especiales = `❌ Error: ${error.message}`;
      }
      
      res.json({
        success: true,
        debug,
        message: 'Debug completo - verifica database_structure para columnas exactas'
      });
      
    } catch (error) {
      console.error('❌ Error en debug:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error en debug', 
        error: error.message 
      });
    }
  }

  // Métodos de admin (simplificados)
  async createCategory(req, res) {
    res.status(501).json({ message: 'Create category not implemented yet' });
  }

  async createMenuItem(req, res) {
    res.status(501).json({ message: 'Create menu item not implemented yet' });
  }

  async updateMenuItem(req, res) {
    res.status(501).json({ message: 'Update menu item not implemented yet' });
  }

  async deleteMenuItem(req, res) {
    res.status(501).json({ message: 'Delete menu item not implemented yet' });
  }

  async toggleAvailability(req, res) {
    res.status(501).json({ message: 'Toggle availability not implemented yet' });
  }

  async createSpecialItem(req, res) {
    res.status(501).json({ message: 'Create special item not implemented yet' });
  }
}

module.exports = new MenuController();