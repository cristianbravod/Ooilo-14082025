// scripts/add-image-fields.js - Script CORREGIDO para agregar campos de imagen a la BD
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'restaurant_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

async function addImageFields() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migración de campos de imagen...\n');

    // 1. Agregar campos a menu_items
    console.log('📋 Actualizando tabla menu_items...');
    
    const menuItemsFields = [
      'ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS imagen_thumbnail VARCHAR(500)',
      'ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS imagen_medium VARCHAR(500)',
      'ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS imagen_large VARCHAR(500)',
      'ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS imagen_filename VARCHAR(255)',
      'ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS imagen_metadata JSONB'
    ];

    for (const sql of menuItemsFields) {
      try {
        await client.query(sql);
        console.log(`  ✅ ${sql.split(' ')[5]} agregado`);
      } catch (error) {
        if (error.code === '42701') { // Column already exists
          console.log(`  ⚠️ ${sql.split(' ')[5]} ya existe`);
        } else {
          throw error;
        }
      }
    }

    // 2. Agregar campos a platos_especiales
    console.log('\n⭐ Actualizando tabla platos_especiales...');
    
    const platosEspecialesFields = [
      'ALTER TABLE platos_especiales ADD COLUMN IF NOT EXISTS imagen_thumbnail VARCHAR(500)',
      'ALTER TABLE platos_especiales ADD COLUMN IF NOT EXISTS imagen_medium VARCHAR(500)',
      'ALTER TABLE platos_especiales ADD COLUMN IF NOT EXISTS imagen_large VARCHAR(500)',
      'ALTER TABLE platos_especiales ADD COLUMN IF NOT EXISTS imagen_filename VARCHAR(255)',
      'ALTER TABLE platos_especiales ADD COLUMN IF NOT EXISTS imagen_metadata JSONB'
    ];

    for (const sql of platosEspecialesFields) {
      try {
        await client.query(sql);
        console.log(`  ✅ ${sql.split(' ')[5]} agregado`);
      } catch (error) {
        if (error.code === '42701') { // Column already exists
          console.log(`  ⚠️ ${sql.split(' ')[5]} ya existe`);
        } else {
          throw error;
        }
      }
    }

    // 3. Crear tabla de metadatos de imágenes (SINTAXIS CORREGIDA)
    console.log('\n🖼️ Creando tabla image_metadata...');
    
    const createImageMetadataTable = `
      CREATE TABLE IF NOT EXISTS image_metadata (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        original_name VARCHAR(255),
        size_bytes INTEGER,
        width INTEGER,
        height INTEGER,
        format VARCHAR(50),
        qualities JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      await client.query(createImageMetadataTable);
      console.log('  ✅ Tabla image_metadata creada');
    } catch (error) {
      if (error.code === '42P07') { // Table already exists
        console.log('  ⚠️ Tabla image_metadata ya existe');
      } else {
        throw error;
      }
    }

    // 4. Crear índices para optimizar consultas (SINTAXIS CORREGIDA)
    console.log('\n📊 Creando índices...');
    
    const indices = [
      {
        name: 'idx_image_metadata_filename',
        sql: 'CREATE INDEX IF NOT EXISTS idx_image_metadata_filename ON image_metadata(filename)'
      },
      {
        name: 'idx_image_metadata_created_at',
        sql: 'CREATE INDEX IF NOT EXISTS idx_image_metadata_created_at ON image_metadata(created_at)'
      },
      {
        name: 'idx_menu_items_imagen_filename',
        sql: 'CREATE INDEX IF NOT EXISTS idx_menu_items_imagen_filename ON menu_items(imagen_filename)'
      },
      {
        name: 'idx_platos_especiales_imagen_filename',
        sql: 'CREATE INDEX IF NOT EXISTS idx_platos_especiales_imagen_filename ON platos_especiales(imagen_filename)'
      },
      {
        name: 'idx_menu_items_imagen_large',
        sql: 'CREATE INDEX IF NOT EXISTS idx_menu_items_imagen_large ON menu_items(imagen_large)'
      },
      {
        name: 'idx_platos_especiales_imagen_large',
        sql: 'CREATE INDEX IF NOT EXISTS idx_platos_especiales_imagen_large ON platos_especiales(imagen_large)'
      }
    ];

    for (const index of indices) {
      try {
        await client.query(index.sql);
        console.log(`  ✅ Índice creado: ${index.name}`);
      } catch (error) {
        if (error.code === '42P07') { // Index already exists
          console.log(`  ⚠️ Índice ya existe: ${index.name}`);
        } else {
          console.error(`  ❌ Error creando índice ${index.name}:`, error.message);
        }
      }
    }

    // 5. Actualizar campos existentes (migrar URLs simples a URLs específicas)
    console.log('\n🔄 Migrando datos existentes...');
    
    try {
      // Migrar menu_items
      const menuItemsWithImages = await client.query(`
        SELECT id, imagen FROM menu_items 
        WHERE imagen IS NOT NULL AND imagen != '' 
        AND imagen_large IS NULL
      `);

      for (const item of menuItemsWithImages.rows) {
        if (item.imagen && item.imagen.startsWith('http')) {
          // Si ya es una URL completa, usarla como large
          await client.query(`
            UPDATE menu_items 
            SET imagen_large = $1, imagen_medium = $1, imagen_thumbnail = $1
            WHERE id = $2
          `, [item.imagen, item.id]);
          
          console.log(`  ✅ Migrado menu_item ${item.id}`);
        }
      }

      // Migrar platos_especiales
      const platosWithImages = await client.query(`
        SELECT id, imagen_url FROM platos_especiales 
        WHERE imagen_url IS NOT NULL AND imagen_url != '' 
        AND imagen_large IS NULL
      `);

      for (const plato of platosWithImages.rows) {
        if (plato.imagen_url && plato.imagen_url.startsWith('http')) {
          await client.query(`
            UPDATE platos_especiales 
            SET imagen_large = $1, imagen_medium = $1, imagen_thumbnail = $1
            WHERE id = $2
          `, [plato.imagen_url, plato.id]);
          
          console.log(`  ✅ Migrado plato_especial ${plato.id}`);
        }
      }
    } catch (migrationError) {
      console.log(`  ⚠️ Error en migración de datos (puede ser normal si las tablas están vacías): ${migrationError.message}`);
    }

    // 6. Verificar migración
    console.log('\n✅ Verificando migración...');
    
    const verificacion = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_name = 'menu_items' AND column_name LIKE 'imagen_%') as menu_items_campos,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_name = 'platos_especiales' AND column_name LIKE 'imagen_%') as platos_especiales_campos,
        (SELECT COUNT(*) FROM information_schema.tables 
         WHERE table_name = 'image_metadata') as metadata_table
    `);

    const stats = verificacion.rows[0];
    console.log(`  📋 Menu items: ${stats.menu_items_campos} campos de imagen`);
    console.log(`  ⭐ Platos especiales: ${stats.platos_especiales_campos} campos de imagen`);
    console.log(`  🖼️ Tabla metadata: ${stats.metadata_table ? 'Creada' : 'No creada'}`);

    console.log('\n🎉 ¡Migración completada exitosamente!');
    console.log('\n📝 Campos agregados:');
    console.log('   • imagen_thumbnail - URL de imagen pequeña (150x150)');
    console.log('   • imagen_medium - URL de imagen mediana (400x300)');  
    console.log('   • imagen_large - URL de imagen grande (800x600)');
    console.log('   • imagen_filename - Nombre del archivo');
    console.log('   • imagen_metadata - Metadatos JSON');

  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function rollbackImageFields() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando rollback de campos de imagen...\n');

    // Eliminar índices primero
    console.log('📊 Eliminando índices...');
    const dropIndices = [
      'DROP INDEX IF EXISTS idx_image_metadata_filename',
      'DROP INDEX IF EXISTS idx_image_metadata_created_at',
      'DROP INDEX IF EXISTS idx_menu_items_imagen_filename',
      'DROP INDEX IF EXISTS idx_platos_especiales_imagen_filename',
      'DROP INDEX IF EXISTS idx_menu_items_imagen_large',
      'DROP INDEX IF EXISTS idx_platos_especiales_imagen_large'
    ];

    for (const sql of dropIndices) {
      try {
        await client.query(sql);
        console.log(`  ✅ Índice eliminado`);
      } catch (error) {
        console.log(`  ⚠️ Índice no existía o error: ${error.message}`);
      }
    }

    // Eliminar tabla de metadatos
    console.log('\n🖼️ Eliminando tabla image_metadata...');
    await client.query('DROP TABLE IF EXISTS image_metadata');
    console.log('  ✅ Tabla image_metadata eliminada');

    // Eliminar campos de menu_items
    console.log('\n📋 Eliminando campos de menu_items...');
    const menuRollback = [
      'ALTER TABLE menu_items DROP COLUMN IF EXISTS imagen_thumbnail',
      'ALTER TABLE menu_items DROP COLUMN IF EXISTS imagen_medium',
      'ALTER TABLE menu_items DROP COLUMN IF EXISTS imagen_large',
      'ALTER TABLE menu_items DROP COLUMN IF EXISTS imagen_filename',
      'ALTER TABLE menu_items DROP COLUMN IF EXISTS imagen_metadata'
    ];

    for (const sql of menuRollback) {
      try {
        await client.query(sql);
        console.log(`  ✅ Campo eliminado`);
      } catch (error) {
        console.log(`  ⚠️ Campo no existía: ${error.message}`);
      }
    }

    // Eliminar campos de platos_especiales
    console.log('\n⭐ Eliminando campos de platos_especiales...');
    const platosRollback = [
      'ALTER TABLE platos_especiales DROP COLUMN IF EXISTS imagen_thumbnail',
      'ALTER TABLE platos_especiales DROP COLUMN IF EXISTS imagen_medium',
      'ALTER TABLE platos_especiales DROP COLUMN IF EXISTS imagen_large',
      'ALTER TABLE platos_especiales DROP COLUMN IF EXISTS imagen_filename',
      'ALTER TABLE platos_especiales DROP COLUMN IF EXISTS imagen_metadata'
    ];

    for (const sql of platosRollback) {
      try {
        await client.query(sql);
        console.log(`  ✅ Campo eliminado`);
      } catch (error) {
        console.log(`  ⚠️ Campo no existía: ${error.message}`);
      }
    }

    console.log('\n✅ Rollback completado');

  } catch (error) {
    console.error('❌ Error en rollback:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Función para verificar estado actual
async function checkCurrentState() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando estado actual de la base de datos...\n');

    // Verificar tablas existentes
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('menu_items', 'platos_especiales', 'image_metadata')
      ORDER BY table_name
    `);

    console.log('📋 Tablas encontradas:');
    tables.rows.forEach(row => {
      console.log(`  • ${row.table_name}`);
    });

    // Verificar campos de imagen en menu_items
    if (tables.rows.some(row => row.table_name === 'menu_items')) {
      const menuFields = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'menu_items' AND column_name LIKE 'imagen_%'
        ORDER BY column_name
      `);

      console.log('\n📋 Campos de imagen en menu_items:');
      if (menuFields.rows.length > 0) {
        menuFields.rows.forEach(row => {
          console.log(`  • ${row.column_name}`);
        });
      } else {
        console.log('  (Ninguno)');
      }
    }

    // Verificar campos de imagen en platos_especiales
    if (tables.rows.some(row => row.table_name === 'platos_especiales')) {
      const platosFields = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'platos_especiales' AND column_name LIKE 'imagen_%'
        ORDER BY column_name
      `);

      console.log('\n⭐ Campos de imagen en platos_especiales:');
      if (platosFields.rows.length > 0) {
        platosFields.rows.forEach(row => {
          console.log(`  • ${row.column_name}`);
        });
      } else {
        console.log('  (Ninguno)');
      }
    }

    // Verificar índices existentes
    const indices = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename IN ('menu_items', 'platos_especiales', 'image_metadata')
      AND indexname LIKE 'idx_%'
      ORDER BY indexname
    `);

    console.log('\n📊 Índices relacionados con imágenes:');
    if (indices.rows.length > 0) {
      indices.rows.forEach(row => {
        console.log(`  • ${row.indexname}`);
      });
    } else {
      console.log('  (Ninguno)');
    }

  } catch (error) {
    console.error('❌ Error verificando estado:', error);
  } finally {
    client.release();
  }
}

// Ejecutar script
async function main() {
  const args = process.argv.slice(2);
  const action = args[0] || 'migrate';

  try {
    if (action === 'rollback') {
      await rollbackImageFields();
    } else if (action === 'check') {
      await checkCurrentState();
    } else {
      await addImageFields();
    }
  } catch (error) {
    console.error('\n❌ Error ejecutando script:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  console.log('🗄️ Script de Migración de Campos de Imagen\n');
  
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Uso:');
    console.log('  node scripts/add-image-fields.js          # Ejecutar migración');
    console.log('  node scripts/add-image-fields.js rollback # Revertir migración');
    console.log('  node scripts/add-image-fields.js check    # Verificar estado actual');
    process.exit(0);
  }
  
  main();
}

module.exports = { addImageFields, rollbackImageFields, checkCurrentState };