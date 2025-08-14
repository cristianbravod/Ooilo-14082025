// database-inspector.js - Script para verificar estructura de base de datos
const { Pool } = require('pg');
const config = require('./src/config/database');

async function inspectDatabase() {
  const pool = new Pool(config);
  
  try {
    console.log('🔍 ===== INSPECCIÓN DE BASE DE DATOS =====');
    console.log('📊 Conectando a:', config.host);
    
    const client = await pool.connect();
    
    // 1. Verificar estructura de categorias
    console.log('\n📂 TABLA: categorias');
    const categoriasColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'categorias' 
      ORDER BY ordinal_position
    `);
    
    if (categoriasColumns.rows.length > 0) {
      console.log('✅ Columnas encontradas:');
      categoriasColumns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      
      // Muestra datos de ejemplo
      const categoriasData = await client.query('SELECT * FROM categorias LIMIT 3');
      console.log('📋 Datos de ejemplo:');
      categoriasData.rows.forEach((row, i) => {
        console.log(`   ${i+1}. ${JSON.stringify(row)}`);
      });
    } else {
      console.log('❌ Tabla categorias no encontrada');
    }
    
    // 2. Verificar estructura de menu_items
    console.log('\n🍽️ TABLA: menu_items');
    const menuColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'menu_items' 
      ORDER BY ordinal_position
    `);
    
    if (menuColumns.rows.length > 0) {
      console.log('✅ Columnas encontradas:');
      menuColumns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      
      // Muestra datos de ejemplo
      const menuData = await client.query('SELECT * FROM menu_items LIMIT 3');
      console.log('📋 Datos de ejemplo:');
      menuData.rows.forEach((row, i) => {
        console.log(`   ${i+1}. ${JSON.stringify(row)}`);
      });
    } else {
      console.log('❌ Tabla menu_items no encontrada');
    }
    
    // 3. Verificar estructura de platos_especiales
    console.log('\n⭐ TABLA: platos_especiales');
    const especialesColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'platos_especiales' 
      ORDER BY ordinal_position
    `);
    
    if (especialesColumns.rows.length > 0) {
      console.log('✅ Columnas encontradas:');
      especialesColumns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    } else {
      console.log('❌ Tabla platos_especiales no encontrada');
    }
    
    // 4. Verificar otras tablas importantes
    console.log('\n📋 OTRAS TABLAS:');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('🗂️ Tablas encontradas:');
    tables.rows.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });
    
    // 5. Test queries específicas
    console.log('\n🧪 TESTS DE QUERIES:');
    
    // Test categorias con diferentes nombres de columna
    const categoriasTests = [
      "SELECT id, nombre FROM categorias WHERE activo = true",
      "SELECT id, nombre FROM categorias WHERE visible = true", 
      "SELECT id, nombre FROM categorias WHERE estado = true",
      "SELECT id, nombre FROM categorias LIMIT 5"
    ];
    
    for (const query of categoriasTests) {
      try {
        const result = await client.query(query);
        console.log(`✅ FUNCIONA: ${query} (${result.rows.length} filas)`);
        break;
      } catch (error) {
        console.log(`❌ FALLA: ${query} - ${error.message}`);
      }
    }
    
    // Test menu_items con diferentes nombres de columna
    const menuTests = [
      "SELECT id, nombre, precio, imagen FROM menu_items LIMIT 3",
      "SELECT id, nombre, precio, imagen_url FROM menu_items LIMIT 3",
      "SELECT id, nombre, precio FROM menu_items LIMIT 3"
    ];
    
    for (const query of menuTests) {
      try {
        const result = await client.query(query);
        console.log(`✅ FUNCIONA: ${query} (${result.rows.length} filas)`);
        break;
      } catch (error) {
        console.log(`❌ FALLA: ${query} - ${error.message}`);
      }
    }
    
    client.release();
    console.log('\n🏁 Inspección completada');
    
  } catch (error) {
    console.error('❌ Error inspeccionando base de datos:', error);
  } finally {
    await pool.end();
  }
}

// Ejecutar inspección
if (require.main === module) {
  inspectDatabase().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('💥 Error crítico:', error);
    process.exit(1);
  });
}

module.exports = { inspectDatabase };