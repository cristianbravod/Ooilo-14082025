// run-migration.js - Ejecutar migración de base de datos
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres.ugcrigkvfejqlsoqnxxh',
  host: process.env.DB_HOST || 'aws-0-us-east-2.pooler.supabase.com',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 6543,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando migración de base de datos...');
    console.log('📅 Fecha:', new Date().toISOString());
    
    // Migración SQL embebida
    const migrationSQL = `
      -- ==========================================
      -- MIGRACIÓN: Agregar estado individual a items
      -- ==========================================

      -- Agregar columna estado_item a orden_items si no existe
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'orden_items' 
              AND column_name = 'estado_item'
          ) THEN
              ALTER TABLE orden_items 
              ADD COLUMN estado_item VARCHAR(20) DEFAULT 'pendiente';
              
              -- Crear índice para mejor performance
              CREATE INDEX IF NOT EXISTS idx_orden_items_estado 
              ON orden_items(estado_item);
              
              RAISE NOTICE 'Columna estado_item agregada a orden_items';
          ELSE
              RAISE NOTICE 'Columna estado_item ya existe en orden_items';
          END IF;
      END $$;

      -- Verificar que la tabla ordenes tenga la estructura correcta
      DO $$
      BEGIN
          -- Agregar fecha_modificacion si no existe
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'ordenes' 
              AND column_name = 'fecha_modificacion'
          ) THEN
              ALTER TABLE ordenes 
              ADD COLUMN fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
              
              RAISE NOTICE 'Columna fecha_modificacion agregada a ordenes';
          END IF;
          
          -- Agregar notas si no existe
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'ordenes' 
              AND column_name = 'notas'
          ) THEN
              ALTER TABLE ordenes 
              ADD COLUMN notas TEXT;
              
              RAISE NOTICE 'Columna notas agregada a ordenes';
          END IF;
      END $$;

      -- Actualizar estados existentes a valores válidos
      UPDATE ordenes 
      SET estado = 'pendiente' 
      WHERE estado NOT IN ('pendiente', 'preparando', 'listo', 'entregado', 'cancelado');

      -- Actualizar items existentes con estado por defecto
      UPDATE orden_items 
      SET estado_item = 'pendiente' 
      WHERE estado_item IS NULL;

      -- Crear vista para órdenes con estadísticas de items
      CREATE OR REPLACE VIEW vista_ordenes_detalle AS
      SELECT 
          o.*,
          u.nombre as cliente_nombre,
          u.telefono as cliente_telefono,
          COUNT(oi.id) as total_items,
          COUNT(CASE WHEN oi.estado_item = 'pendiente' THEN 1 END) as items_pendientes,
          COUNT(CASE WHEN oi.estado_item = 'preparando' THEN 1 END) as items_preparando,
          COUNT(CASE WHEN oi.estado_item = 'listo' THEN 1 END) as items_listos,
          EXTRACT(EPOCH FROM (NOW() - o.fecha_creacion))/60 as tiempo_transcurrido
      FROM ordenes o
      LEFT JOIN usuarios u ON o.usuario_id = u.id
      LEFT JOIN orden_items oi ON o.id = oi.orden_id
      GROUP BY o.id, u.nombre, u.telefono;
    `;

    console.log('📝 Ejecutando migración SQL...');
    
    // Ejecutar la migración
    await client.query(migrationSQL);
    
    console.log('✅ Migración ejecutada exitosamente');
    
    // Verificaciones post-migración
    console.log('\n🔍 Verificando estructura de tablas...');
    
    // Verificar columnas críticas
    const checkColumns = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name IN ('ordenes', 'orden_items') 
      AND column_name IN ('estado_item', 'fecha_modificacion', 'notas')
      ORDER BY table_name, column_name
    `);
    
    console.log('\n📋 Columnas agregadas:');
    checkColumns.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}.${row.column_name} (${row.data_type})`);
    });
    
    // Estadísticas de datos
    const stats = await client.query(`
      SELECT 
        'ordenes' as tabla,
        COUNT(*) as total_registros,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado = 'preparando' THEN 1 END) as preparando,
        COUNT(CASE WHEN estado = 'listo' THEN 1 END) as listos
      FROM ordenes
      UNION ALL
      SELECT 
        'orden_items' as tabla,
        COUNT(*) as total_registros,
        COUNT(CASE WHEN estado_item = 'pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado_item = 'preparando' THEN 1 END) as preparando,
        COUNT(CASE WHEN estado_item = 'listo' THEN 1 END) as listos
      FROM orden_items
    `);
    
    console.log('\n📊 Estadísticas de datos:');
    stats.rows.forEach(row => {
      console.log(`  ${row.tabla}: ${row.total_registros} registros (${row.pendientes} pendientes, ${row.preparando} preparando, ${row.listos} listos)`);
    });
    
    // Verificar vista creada
    const viewCheck = await client.query(`
      SELECT COUNT(*) as registros 
      FROM vista_ordenes_detalle
    `);
    
    console.log(`\n👁️ Vista 'vista_ordenes_detalle' creada: ${viewCheck.rows[0].registros} registros`);
    
    console.log('\n🎉 Migración completada exitosamente!');
    console.log('\n📋 Próximos pasos:');
    console.log('  1. Reiniciar el servidor backend');
    console.log('  2. Probar los nuevos endpoints de órdenes');
    console.log('  3. Verificar el sistema web de cocina');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    console.error('\n🔧 Detalles del error:');
    console.error('  Mensaje:', error.message);
    console.error('  Código:', error.code);
    console.error('  Detalle:', error.detail);
    
    if (error.code === '42P01') {
      console.error('\n💡 Sugerencia: Verifica que las tablas "ordenes" y "orden_items" existan');
    } else if (error.code === '42701') {
      console.error('\n💡 Sugerencia: La columna ya existe, esto es normal en re-ejecuciones');
    }
    
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Verificar conexión antes de ejecutar
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Conexión a base de datos exitosa:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a base de datos:', error.message);
    return false;
  }
}

// Ejecutar migración
async function main() {
  console.log('🔧 MIGRACIÓN DE BASE DE DATOS - SISTEMA DE COCINA');
  console.log('==================================================');
  
  // Verificar conexión
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ No se pudo conectar a la base de datos');
    process.exit(1);
  }
  
  // Ejecutar migración
  await runMigration();
}

// Manejo de errores no capturados
process.on('unhandledRejection', (error) => {
  console.error('❌ Error no manejado:', error);
  process.exit(1);
});

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { runMigration, testConnection };