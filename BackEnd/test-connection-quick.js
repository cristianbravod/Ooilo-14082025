// test-connection-quick.js - Prueba rápida con tu configuración
const { Pool } = require('pg');
require('dotenv').config();

console.log('🚀 Prueba rápida de conexión a Supabase...\n');

// Configuración exacta de tu Supabase
const pool = new Pool({
  user: process.env.DB_USER || 'postgres.ugcrigkvfejqlsoqnxxh',
  host: process.env.DB_HOST || 'aws-0-us-east-2.pooler.supabase.com',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 6543,
  ssl: {
    rejectUnauthorized: false
  },
  max: 2,
  connectionTimeoutMillis: 10000
});

async function testConnection() {
  console.log('📋 Configuración:');
  console.log(`   Host: ${process.env.DB_HOST || 'aws-0-us-east-2.pooler.supabase.com'}`);
  console.log(`   Port: ${process.env.DB_PORT || '6543'}`);
  console.log(`   User: ${process.env.DB_USER || 'postgres.ugcrigkvfejqlsoqnxxh'}`);
  console.log(`   Database: ${process.env.DB_NAME || 'postgres'}`);
  console.log(`   Password: ${process.env.DB_PASSWORD ? '[configurado]' : '[❌ NO CONFIGURADO]'}`);
  console.log(`   SSL: habilitado\n`);

  if (!process.env.DB_PASSWORD) {
    console.error('❌ ERROR: DB_PASSWORD no está configurado');
    console.error('💡 Configura tu contraseña en .env:');
    console.error('   DB_PASSWORD=tu_password_real_de_supabase');
    process.exit(1);
  }

  let client;
  try {
    console.log('🔌 Conectando a Supabase...');
    client = await pool.connect();
    
    console.log('✅ Conexión exitosa!');
    
    const result = await client.query('SELECT NOW() as timestamp, version() as version');
    console.log(`📅 Timestamp: ${result.rows[0].timestamp}`);
    console.log(`🗄️ PostgreSQL: ${result.rows[0].version.split(' ')[1]}`);
    
    // Test básico de creación de tabla
    console.log('\n🧪 Probando operaciones básicas...');
    await client.query(`
      CREATE TEMP TABLE test_connection (
        id SERIAL PRIMARY KEY,
        name TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Creación de tabla: OK');
    
    const insertResult = await client.query(
      'INSERT INTO test_connection (name) VALUES ($1) RETURNING *',
      ['Test desde Node.js']
    );
    console.log('✅ Inserción: OK');
    
    const selectResult = await client.query('SELECT * FROM test_connection');
    console.log(`✅ Consulta: OK (${selectResult.rows.length} registros)`);
    
    console.log('\n🎉 ¡Todas las pruebas pasaron!');
    console.log('✅ Tu conexión a Supabase está funcionando perfectamente');
    console.log('\n🚀 Próximos pasos:');
    console.log('   1. npm run setup-supabase');
    console.log('   2. npm start');
    
  } catch (error) {
    console.error('\n❌ Error de conexión:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.error('💡 Error DNS - verifica el host');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Conexión rechazada - verifica puerto');
    } else if (error.code === '28P01') {
      console.error('💡 Autenticación fallida - verifica usuario/contraseña');
    } else if (error.code === '3D000') {
      console.error('💡 Base de datos no existe');
    }
    
    console.error('\n🔧 Soluciones:');
    console.error('1. Verifica que DB_PASSWORD sea correcto');
    console.error('2. Verifica conexión a internet');
    console.error('3. Prueba con hotspot móvil');
    console.error('4. Ve a Supabase dashboard para verificar credenciales');
    
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

testConnection();